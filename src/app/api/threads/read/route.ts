import { NextRequest } from "next/server";
import { z } from "zod";
import { markThreadRead, getOrCreateDevUserId } from "../../../../db/actions";

const Body = z.object({ threadId: z.string() });

export async function POST(req: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    parsed = undefined;
  }
  const body = Body.safeParse(parsed ?? {});
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });
  const uid = await getOrCreateDevUserId();
  await markThreadRead(uid, body.data.threadId, new Date());
  return Response.json({ ok: true });
}
