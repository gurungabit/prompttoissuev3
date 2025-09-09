"use client";
import { useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import {
  PaginatedThreadsWithPreview,
  type PaginatedThreadsWithPreview as PaginatedThreadsWithPreviewType,
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
  const getKey = (
    _index: number,
    prev: PaginatedThreadsWithPreviewType | null,
  ) => {
    if (prev && !prev.nextCursor) return null;
    const qs = new URLSearchParams(baseQs);
    if (prev?.nextCursor) qs.set("cursor", prev.nextCursor);
    qs.set("limit", "20");
    return `/api/threads?${qs.toString()}`;
  };
  const { data, error, size, setSize, isLoading, isValidating } =
    useSWRInfinite(getKey, fetcher, {
      dedupingInterval: 5000, // Prevent duplicate requests for 5 seconds
      focusThrottleInterval: 10000, // Throttle focus revalidation to max once per 10s
    });

  async function create(title?: string) {
    const res = await fetch("/api/threads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    const thread = ThreadListItemSchema.parse(json);
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
    }>,
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

  const validateThread = useCallback(
    async (id: string) => {
      // First check local cache to avoid unnecessary API calls during normal operation
      const existsLocally = threads.some((t) => t.id === id);
      if (existsLocally) return true;

      // Only make API call if not found locally (e.g., after deletion)
      const res = await fetch(`/api/threads?id=${encodeURIComponent(id)}`);
      return res.ok;
    },
    [threads],
  );

  async function deleteAll() {
    if (threads.length === 0) return;

    // Use bulk delete API for better performance
    const res = await fetch("/api/threads", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: threads.map((t) => t.id) }),
    });

    if (!res.ok) throw new Error("Failed to delete all threads");
    await setSize(1);
  }

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
    validateThread,
    deleteAll,
    loadMore: () => (hasMore ? setSize(size + 1) : Promise.resolve(size)),
  };
}
