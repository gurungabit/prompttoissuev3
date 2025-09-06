import { NextRequest } from "next/server";
import { z } from "zod";
import { parseSpecifier, PROVIDERS } from "../../../lib/llm-config";
import { env } from "../../../lib/env";
import { generateText } from "ai";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI, google } from "@ai-sdk/google";

const Body = z.object({ spec: z.string() });

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, error: parsed.error.message }, { status: 400 });

  const { provider, model } = parseSpecifier(parsed.data.spec);
  const provCfg = PROVIDERS[provider];
  if (!provCfg || !(provCfg.models as readonly string[]).includes(model)) {
    return Response.json({ ok: false, error: `Unsupported spec '${parsed.data.spec}'` }, { status: 400 });
  }

  if (provider === "google" && !env.GOOGLE_API_KEY) {
    return Response.json({ ok: false, error: "Missing GOOGLE_API_KEY" }, { status: 400 });
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    return Response.json({ ok: false, error: "Missing OPENAI_API_KEY" }, { status: 400 });
  }

  // Build provider client
  const client = provider === "google"
    ? (env.GOOGLE_API_KEY ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY }) : google)
    : (env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : openai);

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 7000);
  const started = Date.now();
  try {
    await generateText({ model: client(model), prompt: "ping", abortSignal: ctrl.signal });
    clearTimeout(timeout);
    const latencyMs = Date.now() - started;
    return Response.json({ ok: true, provider, model, latencyMs });
  } catch (e: any) {
    clearTimeout(timeout);
    const msg = typeof e?.message === "string" ? e.message : "Unknown error";
    return Response.json({ ok: false, provider, model, error: msg }, { status: 500 });
  }
}
