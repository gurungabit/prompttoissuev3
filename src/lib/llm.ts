import { google, createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai, createOpenAI } from "@ai-sdk/openai";
import { streamText, type ModelMessage } from "ai";
import { env } from "./env";
import { DEFAULT_SPEC, parseSpecifier } from "./llm-config";

export const DEFAULT_MODEL = DEFAULT_SPEC;

const factories = {
  google: () => (env.GOOGLE_API_KEY ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY }) : google),
  openai: () => (env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : openai),
} as const;

export async function streamAssistant(messages: ModelMessage[], modelSpec: string = DEFAULT_SPEC) {
  const { provider: provName, model } = parseSpecifier(modelSpec);
  const prov = factories[provName]();
  const result = await streamText({ model: prov(model), messages });
  return result;
}
