import { NextRequest } from "next/server";
import { z } from "zod";
import { streamAssistant } from "../../../lib/llm";
import { DEFAULT_SPEC, PROVIDERS, parseSpecifier } from "../../../lib/llm-config";
import { env } from "../../../lib/env";
import { buildContextMessages, estimateTokensForText } from "../../../lib/chat-context";
import { createMessage, getThread, listMessages, patchThread } from "../../../db/actions";
import { summarizeThread } from "../../../lib/summarize";

const SUMMARIZE_TOKEN_THRESHOLD = 3000;
const SUMMARIZE_MESSAGE_THRESHOLD = 60;

const Body = z.object({
  threadId: z.string(),
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })).nonempty(),
  model: z.string().optional().default("gemini-2.0-flash"),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });
  // Build server-side context from DB to avoid leakage across threads
  const thread = await getThread(parsed.data.threadId);
  if (!thread) return Response.json({ error: "Thread not found" }, { status: 404 });
  const dbMsgs = await listMessages(thread.id);
  const { prompt, estimatedPromptTokens } = buildContextMessages({
    thread: {
      id: thread.id,
      title: thread.title,
      summaryText: thread.summaryText ?? null,
      turnCount: thread.turnCount ?? 0,
      tokenEstimate: thread.tokenEstimate ?? 0,
      createdAt: thread.createdAt,
    },
    messages: dbMsgs.map((m) => ({ id: m.id, role: m.role as any, content: m.content, pinned: m.pinned, createdAt: m.createdAt })),
  });
  // Formatting guardrail: ask the model to return pure Markdown prose, not wrapped in
  // ```markdown blocks; only use fences for actual code. Keep links, tables, lists.
  const guardrail = {
    role: "system" as const,
    content:
      "You are a helpful assistant that answers in concise, clean GitHub-Flavored Markdown. Do NOT wrap the entire response in triple backticks. Only use fenced code blocks for code, with a language tag (e.g., ```ts). Use headings, lists, tables, and links as needed.",
  };
  const finalPrompt = [guardrail, ...prompt];

  // Validate provider + model and API keys
  const spec = parsed.data.model ?? DEFAULT_SPEC;
  const { provider, model } = parseSpecifier(spec);
  const provCfg = PROVIDERS[provider];
  if (!provCfg || !(provCfg.models as readonly string[]).includes(model)) {
    return Response.json({ error: `Unsupported model '${spec}'.` }, { status: 400 });
  }
  if (provider === "google" && !env.GOOGLE_API_KEY) {
    return Response.json({ error: "Missing GOOGLE_API_KEY for Google provider." }, { status: 400 });
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    return Response.json({ error: "Missing OPENAI_API_KEY for OpenAI provider." }, { status: 400 });
  }

  const result = await streamAssistant(finalPrompt, spec);
  const textStream = result.textStream; // stream of string tokens
  const encoder = new TextEncoder();
  let acc = "";
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const reader = textStream.getReader();
      const pump = () =>
        reader.read().then(async ({ done, value }) => {
          if (done) {
            controller.close();
            // Persist assistant message and update thread stats
            try {
              await createMessage({ threadId: thread.id, role: "assistant", content: acc, model: parsed.data.model });
              const newTurn = (thread.turnCount ?? 0) + 1;
              const estimate = estimatedPromptTokens + estimateTokensForText(acc);
              await patchThread(thread.id, { turnCount: newTurn, tokenEstimate: estimate });

              // Auto-summarize if thresholds exceeded
              const shouldSummarize = estimate > SUMMARIZE_TOKEN_THRESHOLD || (dbMsgs.length + 1) > SUMMARIZE_MESSAGE_THRESHOLD;
              if (shouldSummarize) {
                try {
                  const summary = await summarizeThread({
                    threadTitle: thread.title,
                    messages: [
                      ...dbMsgs.map((m) => ({ id: m.id, role: m.role as any, content: m.content, pinned: m.pinned })),
                      { id: "assistant_final", role: "assistant", content: acc },
                    ],
                  });
                  await patchThread(thread.id, {
                    summaryText: summary.narrative,
                    summaryModel: "gemini-2.0-flash",
                    summaryUpdatedAt: new Date(),
                  });
                } catch {
                  // ignore summarization errors
                }
              }
            } catch {
              // ignore persistence errors
            }
            return;
          }
          const chunk = encoder.encode(value);
          acc += value;
          controller.enqueue(chunk);
          pump();
        });
      pump();
    },
  });
  return new Response(stream, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
