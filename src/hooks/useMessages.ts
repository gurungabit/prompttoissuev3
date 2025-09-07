"use client";
import useSWRInfinite from "swr/infinite";
import { PaginatedMessages } from "../lib/schemas";
import type { TicketsPayload } from "../lib/tickets";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const json = await res.json();
  return PaginatedMessages.parse(json);
};

export type UseMessagesOptions = {
  cursor?: string | null;
};

export function useMessages(
  threadId: string | null,
  _opts: UseMessagesOptions = {},
) {
  const getKey = (_index: number, prev: any) => {
    if (!threadId) return null;
    if (prev && !prev.nextCursor) return null;
    const qs = new URLSearchParams();
    qs.set("threadId", threadId);
    if (prev?.nextCursor) qs.set("cursor", prev.nextCursor);
    qs.set("limit", "50");
    return `/api/messages?${qs.toString()}`;
  };
  const { data, error, isLoading, isValidating, mutate, size, setSize } =
    useSWRInfinite(getKey, fetcher, {
      revalidateFirstPage: true,
    });

  async function sendUserMessage(content: string) {
    if (!threadId) throw new Error("threadId is required");
    // Persist user message immediately
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, role: "user", content }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    await mutate();
  }

  const pages = data ?? [];
  // Page 0 is the newest slice; older pages come after.
  // To display oldest → newest, flatten in reverse page order.
  const items = [...pages].reverse().flatMap((p) => p.items);
  const nextCursor = pages[pages.length - 1]?.nextCursor ?? null;
  const hasMore = !!nextCursor;

  return {
    messages: items,
    nextCursor,
    hasMore,
    isLoading,
    isLoadingMore: isValidating,
    error: error as Error | undefined,
    sendUserMessage,
    refresh: () => mutate(),
    loadMore: () => (hasMore ? setSize(size + 1) : Promise.resolve(size)),
    togglePin: async (messageId: string, pinned: boolean) => {
      await fetch(`/api/messages?id=${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned }),
      });
      await mutate();
    },
    updateTickets: async (messageId: string, tickets: TicketsPayload) => {
      await fetch(`/api/messages?id=${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketsJson: tickets }),
      });
      await mutate();
    },
    deleteMessage: async (messageId: string) => {
      await fetch(`/api/messages?id=${encodeURIComponent(messageId)}`, {
        method: "DELETE",
      });
      await mutate();
    },
  };
}
