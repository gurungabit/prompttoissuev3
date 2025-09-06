"use client";
import useSWRInfinite from "swr/infinite";
import { z } from "zod";
import {
  PaginatedThreadsWithPreview,
  type ThreadListItem,
  ThreadListItemSchema,
} from "../lib/schemas";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  const json = await res.json();
  return PaginatedThreadsWithPreview.parse(json);
};

export type UseThreadsOptions = {
  query?: string;
  page?: number;
  archived?: boolean;
};

export function useThreads(opts: UseThreadsOptions = {}) {
  const base = new URLSearchParams();
  if (opts.query) base.set("q", opts.query);
  if (typeof opts.archived === "boolean")
    base.set("archived", String(opts.archived));
  const baseQs = base.toString();
  const getKey = (index: number, prev: any) => {
    if (prev && !prev.nextCursor) return null;
    const qs = new URLSearchParams(baseQs);
    if (prev?.nextCursor) qs.set("cursor", prev.nextCursor);
    qs.set("limit", "20");
    return `/api/threads?${qs.toString()}`;
  };
  const { data, error, size, setSize, isLoading, isValidating } =
    useSWRInfinite(getKey, fetcher);

  async function create(title?: string) {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    const thread = ThreadListItemSchema.parse(json as any);
    await setSize(1);
    return thread;
  }

  async function patch(
    id: string,
    patch: Partial<{
      title: string;
      archived: boolean;
      pinned: boolean;
      defaultModel: string;
    }>
  ) {
    const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Failed to update thread");
    await setSize(1);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete thread");
    await setSize(1);
  }

  async function summarize(id: string) {
    const res = await fetch(`/api/summarize`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId: id }),
    });
    if (!res.ok) throw new Error("Failed to summarize");
    await setSize(1);
    return res.json();
  }

  const pages = data ?? [];
  const threads = pages.flatMap((p) => p.items);
  const nextCursor = pages[pages.length - 1]?.nextCursor ?? null;
  const hasMore = !!nextCursor;

  return {
    threads,
    nextCursor,
    hasMore,
    isLoading,
    isLoadingMore: isValidating,
    error: error as Error | undefined,
    refresh: () => setSize(1),
    create,
    rename: (id: string, title: string) => patch(id, { title }),
    archive: (id: string, archived: boolean) => patch(id, { archived }),
    pin: (id: string, pinned: boolean) => patch(id, { pinned }),
    remove,
    summarize,
    loadMore: () => (hasMore ? setSize(size + 1) : Promise.resolve(size)),
    markRead: async (id: string) => {
      await fetch("/api/threads/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: id }),
      });
      await setSize(1);
    },
  };
}
