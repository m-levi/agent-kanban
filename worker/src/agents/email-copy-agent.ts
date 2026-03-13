import { AIChatAgent } from "@cloudflare/ai-chat";
import { streamText, generateText, convertToModelMessages } from "ai";
import { z } from "zod";
import type { Env } from "../index";
import { createRegistry, MODEL_CONFIG } from "../models/registry";
import { ORCHESTRATOR_PROMPT } from "../prompts/orchestrator-system";
import { DRAFT_AGENT_PROMPT } from "../prompts/draft-agent-system";
import { CRITIC_AGENT_PROMPT } from "../prompts/critic-agent-system";

interface EmailCopyBrief {
  client: string;
  emailType: string;
  goal: string;
  hook: string;
  products: string[];
  audience: string;
  brandVoice: string;
}

interface EmailCopyState {
  brief: EmailCopyBrief | null;
  framework: string | null;
  angles: string[] | null;
  chosenAngle: string | null;
  currentDraft: string | null;
  critiqueCount: number;
  status:
    | "idle"
    | "briefing"
    | "angles"
    | "drafting"
    | "critiquing"
    | "done";
}

export class EmailCopyAgent extends AIChatAgent<Env, EmailCopyState> {
  initialState: EmailCopyState = {
    brief: null,
    framework: null,
    angles: null,
    chosenAngle: null,
    currentDraft: null,
    critiqueCount: 0,
    status: "idle",
  };

  async onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS outputs (
        id TEXT PRIMARY KEY,
        brief TEXT NOT NULL,
        framework TEXT,
        angle TEXT,
        final_copy TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `;
  }

  async onChatMessage(
    onFinish: Parameters<
      AIChatAgent<Env, EmailCopyState>["onChatMessage"]
    >[0],
  ) {
    const registry = createRegistry(this.env);
    const modelMessages = await convertToModelMessages(this.messages);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- AI SDK generics hit TS2589 depth limit with complex tool schemas
    const dataStreamResponse = await (streamText as any)({
      model: registry.languageModel(MODEL_CONFIG.orchestrator),
      system: ORCHESTRATOR_PROMPT,
      messages: modelMessages,
      tools: {
        parse_brief: {
          description:
            "Extract the email brief from the user's message. Call this after the user describes what they need.",
          inputSchema: z.object({
            client: z
              .string()
              .describe("Brand or client name"),
            emailType: z
              .string()
              .describe(
                "Type of email: promo, welcome, abandoned-cart, winback, post-purchase, etc.",
              ),
            goal: z
              .string()
              .describe("Primary goal of the email"),
            hook: z
              .string()
              .describe(
                "The main hook or angle seed from the user's description",
              ),
            products: z
              .array(z.string())
              .describe("Product names mentioned"),
            audience: z
              .string()
              .describe("Target audience description"),
            brandVoice: z
              .string()
              .describe(
                "Brand voice/tone. Default: confident, clear, warm",
              ),
          }),
          execute: async (params: EmailCopyBrief) => {
            const brief: EmailCopyBrief = {
              client: params.client,
              emailType: params.emailType,
              goal: params.goal,
              hook: params.hook,
              products: params.products,
              audience: params.audience,
              brandVoice: params.brandVoice,
            };

            this.setState({
              ...this.state,
              brief,
              status: "briefing",
            });

            return {
              success: true,
              brief,
              message:
                "Brief parsed. Present this to the user for confirmation and ask if anything is missing.",
            };
          },
        },

        select_framework: {
          description:
            "Select the best copywriting framework and propose 2-3 creative angle one-liners. Call after the user confirms the brief.",
          inputSchema: z.object({
            framework: z
              .enum(["AIDA", "PAS", "BAB", "FAB", "4Ps"])
              .describe("Selected framework"),
            reasoning: z
              .string()
              .describe("Why this framework fits"),
            angles: z
              .array(z.string())
              .min(2)
              .max(3)
              .describe(
                "2-3 genuinely different creative angle one-liners for the user to choose from",
              ),
          }),
          execute: async (params: { framework: string; reasoning: string; angles: string[] }) => {
            this.setState({
              ...this.state,
              framework: params.framework,
              angles: params.angles,
              status: "angles",
            });

            return {
              success: true,
              framework: params.framework,
              reasoning: params.reasoning,
              angles: params.angles,
              message:
                "Present the framework choice and angles to the user. Wait for them to pick an angle before drafting.",
            };
          },
        },

        write_draft: {
          description:
            "Spawn the Draft Agent sub-agent to write email copy. Call after the user picks an angle.",
          inputSchema: z.object({
            chosenAngle: z
              .string()
              .describe("The creative angle to write from"),
            revisionFeedback: z
              .string()
              .optional()
              .describe("Critic feedback for revision (only on revision rounds)"),
          }),
          execute: async (params: { chosenAngle: string; revisionFeedback?: string }) => {
            this.setState({ ...this.state, status: "drafting" });

            let prompt = `## Brief\n${JSON.stringify(this.state.brief, null, 2)}\n\n## Framework: ${this.state.framework}\n\n## Chosen Angle: ${params.chosenAngle}\n`;

            if (params.revisionFeedback && this.state.currentDraft) {
              prompt += `\n## Previous Draft\n${this.state.currentDraft}\n\n## Critic Feedback\n${params.revisionFeedback}\n\nRevise the draft. Fix ONLY what failed.`;
            } else {
              prompt += `\nWrite the email copy now.`;
            }

            const { text } = await generateText({
              model: registry.languageModel(MODEL_CONFIG.draft),
              system: DRAFT_AGENT_PROMPT,
              prompt,
            });

            this.setState({
              ...this.state,
              chosenAngle: params.chosenAngle,
              currentDraft: text,
            });

            return {
              success: true,
              draft: text,
              message: "Draft complete. Now call critique_draft to evaluate it.",
            };
          },
        },

        critique_draft: {
          description:
            "Spawn the Critic Agent sub-agent to evaluate the draft against 6 scan tests. Call after write_draft.",
          inputSchema: z.object({
            draftText: z
              .string()
              .describe("The email draft text to evaluate"),
          }),
          execute: async (params: { draftText: string }) => {
            this.setState({ ...this.state, status: "critiquing" });
            const brandVoice = this.state.brief?.brandVoice ?? "confident, clear, warm";

            const { text } = await generateText({
              model: registry.languageModel(MODEL_CONFIG.critic),
              system: CRITIC_AGENT_PROMPT,
              prompt: `## Brand Voice: ${brandVoice}\n\n## Draft\n${params.draftText}\n\nRun all 6 scan tests.`,
            });

            const newCount = this.state.critiqueCount + 1;
            const passed = /verdict:\s*pass/i.test(text);
            this.setState({ ...this.state, critiqueCount: newCount });

            if (!passed && newCount < 2) {
              return {
                success: true,
                verdict: "REVISE",
                critique: text,
                round: newCount,
                message:
                  "Critique found issues. Call write_draft again with revisionFeedback containing the critique.",
              };
            }

            return {
              success: true,
              verdict: passed ? "PASS" : "SHIP_WITH_NOTES",
              critique: text,
              round: newCount,
              message: passed
                ? "All tests passed! Present the final copy to the user and call save_output."
                : `Max revision rounds reached (${newCount}). Ship with notes. Present to user and call save_output.`,
            };
          },
        },

        save_output: {
          description:
            "Save the final email copy output. Call after critique passes or max revisions reached.",
          inputSchema: z.object({
            finalOutput: z
              .string()
              .describe("The final email copy to save"),
          }),
          execute: async (params: { finalOutput: string }) => {
            const id = crypto.randomUUID();
            const briefJson = JSON.stringify(this.state.brief);
            const framework = this.state.framework ?? "";
            const angle = this.state.chosenAngle ?? "";
            const finalCopy = params.finalOutput;

            this.sql`
              INSERT INTO outputs (id, brief, framework, angle, final_copy)
              VALUES (${id}, ${briefJson}, ${framework}, ${angle}, ${finalCopy})
            `;

            this.setState({
              ...this.state,
              status: "done",
            });

            return {
              success: true,
              outputId: id,
              message:
                "Output saved. Let the user know the email copy is finalized and saved. Ask if they'd like any final tweaks.",
            };
          },
        },
      },
      maxSteps: 8,
      onFinish,
    });

    return dataStreamResponse.toUIMessageStreamResponse();
  }
}
