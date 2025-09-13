import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "../env";
import { parseSpecifier } from "../llm-config";
import { createAide } from "./aide-provider";

const factories = {
  google: () =>
    env.GOOGLE_API_KEY
      ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
      : google,
  openai: () =>
    env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : openai,
  aide: () => {
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

    return createAide({
      apiKey,
      useCaseId,
      solmaId,
      baseURL: process.env.AIDE_BASE_URL,
    });
  },
} as const;

export function createProvider(modelSpec: string) {
  const { provider: provName, model } = parseSpecifier(modelSpec);
  const prov = factories[provName]();
  return { provider: prov, model };
}
