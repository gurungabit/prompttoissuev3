import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "./env";
import { DEFAULT_SPEC, parseSpecifier } from "./llm-config";

export const SummarySchema = z.object({
  narrative: z.string(),
  highlights: z.array(z.string()),
  facts: z.array(z.string()),
  todos: z.array(z.string()),
  citations: z.array(z.string()), // message ids
});
export type Summary = z.infer<typeof SummarySchema>;

type Msg = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pinned?: boolean;
};

export async function summarizeThread({
  threadTitle,
  messages,
  model = DEFAULT_SPEC,
}: {
  threadTitle: string;
  messages: Msg[];
  model?: string;
}): Promise<Summary> {
  const { provider: provName, model: base } = parseSpecifier(model);
  const provider =
    provName === "google"
      ? env.GOOGLE_API_KEY
        ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
        : google
      : env.OPENAI_API_KEY
        ? createOpenAI({ apiKey: env.OPENAI_API_KEY })
        : openai;
  const prompt = `Summarize the following chat thread titled "${threadTitle}".
Return JSON with keys: narrative, highlights[], facts[], todos[], citations[].
Always include all pinned messages in your reasoning. Citations must be the message ids referenced.

Messages:\n${messages
    .map(
      (m) =>
        `- [${m.id}](${m.role}${m.pinned ? ", pinned" : ""}): ${m.content}`,
    )
    .join("\n")}`;

  const { object } = await generateObject({
    model: provider(base),
    schema: SummarySchema,
    prompt,
  });
  return object;
}
