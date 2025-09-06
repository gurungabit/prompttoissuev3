import type { NextRequest } from "next/server";
import { env } from "../../../lib/env";

export async function GET(_req: NextRequest) {
  const providers: string[] = [];
  if (env.GOOGLE_API_KEY) providers.push("google");
  if (env.OPENAI_API_KEY) providers.push("openai");
  return Response.json({ providers });
}
