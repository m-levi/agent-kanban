import { createProviderRegistry } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";

/** Role → model mapping. Swap models per role here. */
export const MODEL_CONFIG = {
  orchestrator: "anthropic:claude-sonnet-4-6",
  draft: "anthropic:claude-sonnet-4-6",
  critic: "anthropic:claude-sonnet-4-6",
} as const;

export function createRegistry(env: {
  ANTHROPIC_API_KEY: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
}) {
  return createProviderRegistry({
    anthropic: createAnthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      // When AI Gateway is configured, uncomment:
      // baseURL: `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_AI_GATEWAY_ID}/anthropic/v1`,
    }),
  });
}
