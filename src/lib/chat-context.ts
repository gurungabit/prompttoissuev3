import type { ModelMessage } from "ai";

type DbMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pinned: boolean;
  createdAt: Date;
};

export type DbThread = {
  id: string;
  title: string;
  summaryText: string | null;
  turnCount: number | null;
  tokenEstimate: number | null;
  createdAt: Date;
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

export function buildContextMessages({
  thread,
  messages,
  tokenBudget = 3200,
}: {
  thread: DbThread;
  messages: DbMessage[];
  tokenBudget?: number;
}): { prompt: ModelMessage[]; estimatedPromptTokens: number } {
  const system: DbMessage[] = messages.filter((m) => m.role === "system");
  const pinned: DbMessage[] = messages.filter((m) => m.pinned === true);
  const nonPinned = messages.filter((m) => !m.pinned && m.role !== "system");

  const summary = thread.summaryText ?? undefined;
  const baseTokens = estimateTokens(summary ?? "");
  const pinnedTokens = pinned.reduce(
    (acc, m) => acc + estimateTokens(m.content),
    0,
  );

  const remaining = Math.max(0, tokenBudget - baseTokens - pinnedTokens - 128);
  const tail: DbMessage[] = [];
  let used = 0;
  for (let i = nonPinned.length - 1; i >= 0; i--) {
    const m = nonPinned[i];
    const cost = estimateTokens(m.content);
    if (used + cost > remaining) break;
    tail.unshift(m);
    used += cost;
  }

  const prompt: ModelMessage[] = [];
  // include any system messages from the DB first
  for (const m of system) {
    prompt.push({ role: "system", content: m.content });
  }
  if (summary) {
    prompt.push({
      role: "system",
      content: `Thread summary (do not reveal directly):\n${summary}`,
    });
  }
  // pinned then tail, in order
  for (const m of [...pinned, ...tail]) {
    prompt.push({ role: m.role, content: m.content });
  }

  const estimatedPromptTokens = prompt.reduce(
    (acc, m) =>
      acc + estimateTokens(typeof m.content === "string" ? m.content : ""),
    0,
  );
  return { prompt, estimatedPromptTokens };
}

export function estimateTokensForText(text: string) {
  return estimateTokens(text);
}
