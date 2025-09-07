import { and, desc, eq, ilike, inArray, lt, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createThread,
  deleteThread,
  listThreads,
  patchThread,
} from "../../../db/actions";
import { getDb } from "../../../db/client";
import { messages, threadReads, threads } from "../../../db/schema";
import { ThreadSchema } from "../../../lib/schemas";

function serializeThread(row: any) {
  return {
    ...row,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    summaryUpdatedAt:
      row.summaryUpdatedAt instanceof Date
        ? row.summaryUpdatedAt.toISOString()
        : (row.summaryUpdatedAt ?? null),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? undefined;
  const archivedParam = searchParams.get("archived");
  const archived = archivedParam == null ? undefined : archivedParam === "true";
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Math.max(
    1,
    Math.min(50, Number.isNaN(limitParam) ? 20 : limitParam),
  );
  const cursorParam = searchParams.get("cursor");

  // Fall back to actions for non-paginated path
  if (!cursorParam) {
    const items = await listThreads({ q, archived });
    const page = items.slice(0, limit).map(serializeThread);
    const nextCursor =
      page.length === limit ? makeCursor(page[page.length - 1]) : null;

    // Fetch last message preview for the threads
    const ids = page.map((t) => t.id);
    const previews: Record<string, string | null> = {};
    if (ids.length > 0) {
      const db = getDb();
      const rows = await db
        .select({
          threadId: messages.threadId,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(inArray(messages.threadId, ids))
        .orderBy(desc(messages.createdAt), desc(messages.id));
      const seen = new Set<string>();
      for (const m of rows) {
        if (seen.has(m.threadId)) continue;
        seen.add(m.threadId);
        previews[m.threadId] = m.content;
      }
    }

    const itemsWithPreview = page.map((t) => ({
      ...t,
      lastMessagePreview: previews[t.id] ?? null,
      unread: false, // Simple fallback for unread status
    }));

    return Response.json({ items: itemsWithPreview, nextCursor });
  }

  const cursor = parseCursor(cursorParam);
  const db = getDb();
  const where = [] as any[];
  if (typeof archived === "boolean") where.push(eq(threads.archived, archived));
  if (q?.trim()) {
    const needle = `%${q.trim()}%`;
    where.push(
      or(ilike(threads.title, needle), ilike(threads.summaryText, needle)),
    );
  }
  if (cursor) {
    const createdAt = new Date(cursor.createdAt);
    where.push(
      or(
        lt(threads.createdAt, createdAt),
        and(eq(threads.createdAt, createdAt), lt(threads.id, cursor.id)),
      ),
    );
  }
  const rows = await db
    .select()
    .from(threads)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(threads.createdAt), desc(threads.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit).map(serializeThread);
  const nextCursor = rows.length > limit ? makeCursor(rows[limit]) : null;

  // Fetch last message preview for the current page of thread ids
  const ids = page.map((t) => t.id);
  const previews: Record<string, string | null> = {};
  let recent: Array<{ threadId: string; content: string; createdAt: Date }> =
    [];
  if (ids.length > 0) {
    const db = getDb();
    const rows = await db
      .select({
        id: messages.id,
        threadId: messages.threadId,
        content: messages.content,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.threadId, ids))
      .orderBy(desc(messages.createdAt), desc(messages.id));
    recent = rows as any;
    const seen = new Set<string>();
    for (const m of rows) {
      if (seen.has(m.threadId)) continue;
      seen.add(m.threadId);
      previews[m.threadId] = m.content;
    }
  }
  // Fetch last read per thread for the current user
  const _USER_ID = "00000000-0000-0000-0000-000000000000";
  const reads = await getDb()
    .select({
      threadId: threadReads.threadId,
      lastReadAt: threadReads.lastReadAt,
    })
    .from(threadReads)
    .where(inArray(threadReads.threadId, ids));
  const readMap = new Map<string, Date>(
    reads.map((r) => [r.threadId, r.lastReadAt as Date]),
  );

  // Determine unread: latest message newer than lastReadAt
  const latestMap = new Map<
    string,
    { content: string | null; createdAt: Date | null }
  >();
  for (const t of page) latestMap.set(t.id, { content: null, createdAt: null });
  for (const m of recent) {
    const cur = latestMap.get(m.threadId);
    if (cur && cur.createdAt == null)
      latestMap.set(m.threadId, {
        content: m.content,
        createdAt: m.createdAt as Date,
      });
  }

  const items = page.map((t) => {
    const latest = latestMap.get(t.id);
    const lastRead = readMap.get(t.id);
    const unread = latest?.createdAt
      ? !lastRead || latest.createdAt > lastRead
      : false;
    return { ...t, lastMessagePreview: latest?.content ?? null, unread };
  });
  return Response.json({ items, nextCursor });
}

const CreateBody = z.object({ title: z.string().optional() });
export async function POST(req: NextRequest) {
  const body = CreateBody.safeParse(await req.json());
  if (!body.success)
    return Response.json({ error: body.error.message }, { status: 400 });
  const t = await createThread({ title: body.data.title });
  return Response.json(
    ThreadSchema.parse(
      serializeThread({
        ...t,
        summaryText: t.summaryText ?? null,
        summaryModel: t.summaryModel ?? null,
        summaryUpdatedAt: t.summaryUpdatedAt ?? null,
      }),
    ),
    { status: 201 },
  );
}

function makeCursor(row: any) {
  return Buffer.from(
    JSON.stringify({ id: row.id, createdAt: row.createdAt }),
  ).toString("base64");
}

function parseCursor(c: string | null) {
  if (!c) return null as null | { id: string; createdAt: string };
  try {
    const obj = JSON.parse(Buffer.from(c, "base64").toString("utf8"));
    if (obj && typeof obj.id === "string" && typeof obj.createdAt === "string")
      return obj;
    return null;
  } catch {
    return null;
  }
}

const PatchQuery = z.object({ id: z.string() });
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = PatchQuery.safeParse({ id: searchParams.get("id") });
  if (!q.success)
    return Response.json({ error: q.error.message }, { status: 400 });
  const patch = (await req.json()) as any;
  await patchThread(q.data.id, patch);
  return Response.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "id required" }, { status: 400 });
  await deleteThread(id);
  return Response.json({ ok: true });
}
