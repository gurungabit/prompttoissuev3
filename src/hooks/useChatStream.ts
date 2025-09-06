"use client";
import type { Mode } from "../components/ModeToggle";

type ChatMessageInput = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StreamChatOptions = {
  threadId: string;
  messages: ChatMessageInput[];
  model: string;
  mode: Mode;
  onDelta: (delta: string) => void;
  onDone?: (finalText: string) => void;
  onError?: (err: Error) => void;
};

export function useChatStream() {
  async function streamChat(opts: StreamChatOptions) {
    let acc = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: opts.threadId,
          messages: opts.messages,
          model: opts.model,
          mode: opts.mode,
        }),
      });
      if (!res.ok) {
        let msg = `Chat request failed (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error && typeof j.error === "string") msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const reader = res.body?.getReader();
      if (!reader) {
        const text = await res.text();
        acc = text;
        opts.onDelta(text);
        opts.onDone?.(acc);
        return;
      }
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          opts.onDone?.(acc);
          break;
        }
        const delta = decoder.decode(value, { stream: true });
        if (delta) {
          acc += delta;
          opts.onDelta(delta);
        }
      }
    } catch (err) {
      const e = err instanceof Error ? err : new Error("Unknown error");
      opts.onError?.(e);
      throw e;
    }
  }

  return { streamChat };
}

