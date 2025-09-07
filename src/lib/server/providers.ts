import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { env } from "../env";
import { parseSpecifier } from "../llm-config";

const factories = {
  google: () =>
    env.GOOGLE_API_KEY
      ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
      : google,
  openai: () =>
    env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : openai,
} as const;

export function createProvider(modelSpec: string) {
  const { provider: provName, model } = parseSpecifier(modelSpec);
  const prov = factories[provName]();
  return { provider: prov, model };
}
