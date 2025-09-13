import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "../env";
import { parseSpecifier } from "../llm-config";
import { createAide } from "./aide-provider";
import { ensureAideApiKey } from "./aide-token";

export async function createProvider(modelSpec: string) {
  const { provider: provName, model } = parseSpecifier(modelSpec);

  if (provName === "google") {
    const prov = env.GOOGLE_API_KEY
      ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
      : google;
    return { provider: prov, model };
  }

  if (provName === "openai") {
    const prov = env.OPENAI_API_KEY
      ? createOpenAI({ apiKey: env.OPENAI_API_KEY })
      : openai;
    return { provider: prov, model };
  }

  if (provName === "aide") {
    // Ensure token via Entra ID if not already set
    await ensureAideApiKey();

    const apiKey = process.env.AIDE_API_KEY;
    const useCaseId = process.env.AIDE_USE_CASE_ID;
    const solmaId = process.env.AIDE_SOLMA_ID;

    if (!apiKey) {
      throw new Error("AIDE_API_KEY environment variable is required");
    }
    if (!useCaseId) {
      throw new Error("AIDE_USE_CASE_ID environment variable is required");
    }
    if (!solmaId) {
      throw new Error("AIDE_SOLMA_ID environment variable is required");
    }

    const prov = createAide({
      apiKey,
      useCaseId,
      solmaId,
      baseURL: process.env.AIDE_BASE_URL,
    });
    return { provider: prov, model };
  }

  throw new Error(`Unknown provider '${provName}'`);
}
