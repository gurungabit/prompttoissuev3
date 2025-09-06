import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createMessage,
  getThread,
  listMessages,
  patchThread,
} from "../../../db/actions";
import {
  buildContextMessages,
  estimateTokensForText,
} from "../../../lib/chat-context";
import { streamAssistant } from "../../../lib/llm";
import { DEFAULT_SPEC } from "../../../lib/llm-config";
import { validateSpec } from "../../../lib/llm-validate";
import {
  MARKDOWN_GUARDRAIL_PROMPT,
  TICKETS_PROMPT,
} from "../../../lib/prompts";
import { summarizeThread } from "../../../lib/summarize";
import { parseTicketsFromText } from "../../../lib/tickets";

const SUMMARIZE_TOKEN_THRESHOLD = 3000;
const SUMMARIZE_MESSAGE_THRESHOLD = 60;

const Body = z.object({
  threadId: z.string(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string(),
      })
    )
    .nonempty(),
  model: z.string().optional().default("gemini-2.0-flash"),
  mode: z.enum(["assistant", "ticket"]).optional().default("assistant"),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success)
    return Response.json({ error: parsed.error.message }, { status: 400 });
  // Build server-side context from DB to avoid leakage across threads
  const thread = await getThread(parsed.data.threadId);
  if (!thread)
    return Response.json({ error: "Thread not found" }, { status: 404 });
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
    messages: dbMsgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      pinned: m.pinned,
      createdAt: m.createdAt,
    })),
  });
  // Centralized system prompts
  const finalPrompt = [
    { role: "system" as const, content: MARKDOWN_GUARDRAIL_PROMPT },
    ...prompt,
  ];

  // Validate provider + model and API keys
  const spec = parsed.data.model ?? DEFAULT_SPEC;
  const validation = validateSpec(spec);
  if (!validation.ok) {
    return Response.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  if (parsed.data.mode === "ticket") {
    // In ticket mode, inject ticketing system prompt and withhold streaming until JSON completes.
    const ticketSpecText = TICKETS_PROMPT;
    const result = await streamAssistant(
      [
        {
          role: "system",
          content: ticketSpecText || "Output tickets JSON as specified.",
        },
        ...finalPrompt,
      ],
      spec
    );
    const reader = result.textStream.getReader();
    let acc = "";
    // drain fully
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += value;
    }
    // Parse tickets JSON and generate a concise summary
    const { payload: ticketsJson, summaryText } = parseTicketsFromText(acc);
    // Persist message with optional ticketsJson
    try {
      await createMessage({
        threadId: thread.id,
        role: "assistant",
        content: summaryText,
        model: parsed.data.model,
        ticketsJson,
      });
      const newTurn = (thread.turnCount ?? 0) + 1;
      const estimate =
        estimatedPromptTokens + estimateTokensForText(summaryText);
      await patchThread(thread.id, {
        turnCount: newTurn,
        tokenEstimate: estimate,
      });
    } catch {}
    // Return the summary immediately (no streaming in ticket mode)
    return new Response(summaryText, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } else {
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
                await createMessage({
                  threadId: thread.id,
                  role: "assistant",
                  content: acc,
                  model: parsed.data.model,
                });
                const newTurn = (thread.turnCount ?? 0) + 1;
                const estimate =
                  estimatedPromptTokens + estimateTokensForText(acc);
                await patchThread(thread.id, {
                  turnCount: newTurn,
                  tokenEstimate: estimate,
                });

                // Auto-summarize if thresholds exceeded
                const shouldSummarize =
                  estimate > SUMMARIZE_TOKEN_THRESHOLD ||
                  dbMsgs.length + 1 > SUMMARIZE_MESSAGE_THRESHOLD;
                if (shouldSummarize) {
                  try {
                    const summary = await summarizeThread({
                      threadTitle: thread.title,
                      messages: [
                        ...dbMsgs.map((m) => ({
                          id: m.id,
                          role: m.role as "user" | "assistant" | "system",
                          content: m.content,
                          pinned: m.pinned,
                        })),
                        {
                          id: "assistant_final",
                          role: "assistant",
                          content: acc,
                        },
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
    return new Response(stream, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }
}
