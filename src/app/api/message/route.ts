import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "../../../db/client";
import { messages } from "../../../db/schema";

const Query = z.object({ id: z.string() });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = Query.safeParse({ id: searchParams.get("id") });
  if (!q.success)
    return Response.json({ error: q.error.message }, { status: 400 });
  const db = getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.id, q.data.id))
    .limit(1);
  const row = rows[0];
  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  const out = {
    ...row,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
  };
  return Response.json(out);
}
