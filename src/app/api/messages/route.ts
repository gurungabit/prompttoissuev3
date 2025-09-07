import { and, desc, eq, lt, or } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import {
  createMessage,
  deleteMessage,
  getThread,
  patchMessage,
} from "../../../db/actions";
import { getDb } from "../../../db/client";
import { messages } from "../../../db/schema";
import { MessageSchema } from "../../../lib/schemas";
import { TicketsPayloadSchema } from "../../../lib/tickets";

type DbRow = Record<string, unknown> & { createdAt: Date | string };
function serializeMessage(row: DbRow) {
  return {
    ...(row as Record<string, unknown>),
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}

const CreateBody = z.object({
  threadId: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  model: z.string().optional(),
  pinned: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const body = CreateBody.safeParse(await req.json());
  if (!body.success)
    return Response.json({ error: body.error.message }, { status: 400 });
  const thr = await getThread(body.data.threadId);
  if (!thr)
    return Response.json({ error: "Thread not found" }, { status: 404 });
  const m = await createMessage({
    threadId: body.data.threadId,
    role: body.data.role,
    content: body.data.content,
    model: body.data.model,
    pinned: body.data.pinned ?? false,
  });
  return Response.json(MessageSchema.parse(serializeMessage(m)), {
    status: 201,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get("threadId");
  if (!threadId)
    return Response.json({ error: "threadId required" }, { status: 400 });
  const limitParam = Number(searchParams.get("limit") ?? "30");
  const limit = Math.max(
    1,
    Math.min(100, Number.isNaN(limitParam) ? 30 : limitParam),
  );
  const cursorParam = searchParams.get("cursor");
  const cursor = parseCursor(cursorParam);

  const db = getDb();
  const predicate = (() => {
    if (!cursor) return eq(messages.threadId, threadId);
    const createdAt = new Date(cursor.createdAt);
    return and(
      eq(messages.threadId, threadId),
      or(
        lt(messages.createdAt, createdAt),
        and(eq(messages.createdAt, createdAt), lt(messages.id, cursor.id)),
      ),
    );
  })();
  const rowsDesc = await db
    .select()
    .from(messages)
    .where(predicate)
    .orderBy(desc(messages.createdAt), desc(messages.id))
    .limit(limit + 1);
  const rows = rowsDesc.slice(0, limit);
  const nextCursor =
    rowsDesc.length > limit ? makeCursor(rowsDesc[rows.length]) : null;
  // Return ascending for UI readability
  const page = rows.reverse().map(serializeMessage);
  return Response.json({
    items: page.map((m) => MessageSchema.parse(m)),
    nextCursor,
  });
}

const PatchQuery = z.object({ id: z.string() });
const PatchBody = z.object({
  pinned: z.boolean().optional(),
  ticketsJson: TicketsPayloadSchema.optional(),
});
export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = PatchQuery.safeParse({ id: searchParams.get("id") });
  if (!q.success)
    return Response.json({ error: q.error.message }, { status: 400 });
  const body = PatchBody.safeParse(await req.json());
  if (!body.success)
    return Response.json({ error: body.error.message }, { status: 400 });
  await patchMessage(q.data.id, body.data);
  return Response.json({ ok: true });
}

const DeleteQuery = z.object({ id: z.string() });
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = DeleteQuery.safeParse({ id: searchParams.get("id") });
  if (!q.success)
    return Response.json({ error: q.error.message }, { status: 400 });
  await deleteMessage(q.data.id);
  return Response.json({ ok: true });
}

function makeCursor(row: { id: string; createdAt: Date | string }) {
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
