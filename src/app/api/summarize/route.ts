import type { NextRequest } from "next/server";
import { z } from "zod";
import { getThread, listMessages, patchThread } from "../../../db/actions";
import { env } from "../../../lib/env";
import {
  DEFAULT_SPEC,
  PROVIDERS,
  parseSpecifier,
} from "../../../lib/llm-config";
import { summarizeThread } from "../../../lib/server/summarize";

const Body = z.object({ threadId: z.string() });

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json());
  if (!body.success)
    return Response.json({ error: body.error.message }, { status: 400 });
  const thread = await getThread(body.data.threadId);
  if (!thread)
    return Response.json({ error: "Thread not found" }, { status: 404 });
  const msgs = await listMessages(thread.id);
  const modelUsed = thread.defaultModel ?? DEFAULT_SPEC;
  const { provider, model } = parseSpecifier(modelUsed);
  const provCfg = PROVIDERS[provider];
  const supported = provCfg
    ? (provCfg.models as ReadonlyArray<{ id: string; enabled: boolean }>).find(
        (m) => m.id === model && m.enabled,
      )
    : undefined;
  if (!provCfg || !supported) {
    return Response.json(
      { error: `Unsupported model '${modelUsed}'.` },
      { status: 400 },
    );
  }
  if (provider === "google" && !env.GOOGLE_API_KEY) {
    return Response.json(
      { error: "Missing GOOGLE_API_KEY for Google provider." },
      { status: 400 },
    );
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY for OpenAI provider." },
      { status: 400 },
    );
  }
  const summary = await summarizeThread({
    threadTitle: thread.title,
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
      pinned: m.pinned,
    })),
    model: modelUsed,
  });
  const updatedAt = new Date();
  await patchThread(thread.id, {
    summaryText: summary.narrative,
    summaryModel: modelUsed,
    summaryUpdatedAt: updatedAt,
    summaryJson: summary,
  });
  return Response.json({
    ...summary,
    model: modelUsed,
    updatedAt: updatedAt.toISOString(),
  });
}
