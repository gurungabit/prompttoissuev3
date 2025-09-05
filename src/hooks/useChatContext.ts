import { z } from "zod";
import { MessageSchema, ThreadSchema, type Message } from "../lib/schemas";

const ChatContextSchema = z.object({
  system: z.array(MessageSchema).default([]),
  pinned: z.array(MessageSchema).default([]),
  summary: z.string().optional(),
  tail: z.array(MessageSchema),
  model: z.string().default("gemini-2.0-flash"),
});

export type ChatContext = z.infer<typeof ChatContextSchema>;

export type BuildContextParams = {
  thread: z.infer<typeof ThreadSchema> & { messages: Message[] };
  tokenBudget?: number;
};

// Naive token estimator: ~4 chars per token
const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function buildChatContext({ thread, tokenBudget = 3200 }: BuildContextParams): ChatContext {
  const system: Message[] = thread.messages.filter((m) => m.role === "system");
  const pinned: Message[] = thread.messages.filter((m) => m.pinned === true);
  const nonPinned = thread.messages.filter((m) => !m.pinned && m.role !== "system");

  const summary = thread.summaryText ?? undefined;
  const baseTokens = estimateTokens(summary ?? "");
  const pinnedTokens = pinned.reduce((acc, m) => acc + estimateTokens(m.content), 0);

  // Always include system + pinned, then fill the remaining budget with recent tail
  const remaining = Math.max(0, tokenBudget - baseTokens - pinnedTokens - 128); // headroom for response
  const tail: Message[] = [];
  let used = 0;
  for (let i = nonPinned.length - 1; i >= 0; i--) {
    const m = nonPinned[i];
    const cost = estimateTokens(m.content);
    if (used + cost > remaining) break;
    tail.unshift(m);
    used += cost;
  }

  return ChatContextSchema.parse({ system, pinned, summary, tail });
}

