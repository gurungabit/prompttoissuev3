import { NextRequest } from "next/server";
import { getDb } from "../../../db/client";
import { threads } from "../../../db/schema";

export async function GET(_req: NextRequest) {
  try {
    const db = getDb();
    // simple query to verify connectivity
    await db.select({ id: threads.id }).from(threads).limit(1);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

