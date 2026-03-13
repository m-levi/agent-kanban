import { routeAgentRequest } from "agents";
export { EmailCopyAgent } from "./agents/email-copy-agent";

export interface Env {
  EMAIL_COPY_AGENT: DurableObjectNamespace;
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY?: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
}

export default {
  async fetch(request: Request, env: Env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Upgrade",
        },
      });
    }

    const response = await routeAgentRequest(request, env);
    if (response) {
      // Add CORS headers to agent responses
      const newResponse = new Response(response.body, response);
      newResponse.headers.set("Access-Control-Allow-Origin", "*");
      return newResponse;
    }

    return new Response("Not found", { status: 404 });
  },
};
