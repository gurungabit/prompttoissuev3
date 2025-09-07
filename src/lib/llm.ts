import { createGoogleGenerativeAI, google } from "@ai-sdk/google";
import { createOpenAI, openai } from "@ai-sdk/openai";
import { type ModelMessage, stepCountIs, streamText } from "ai";
import { getGitLabMcpToolCatalog, getGitLabMcpTools } from "../mcp/adapter";
import { env } from "./env";
import { DEFAULT_SPEC, parseSpecifier } from "./llm-config";

export const DEFAULT_MODEL = DEFAULT_SPEC;

const factories = {
  google: () =>
    env.GOOGLE_API_KEY
      ? createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
      : google,
  openai: () =>
    env.OPENAI_API_KEY ? createOpenAI({ apiKey: env.OPENAI_API_KEY }) : openai,
} as const;

export async function streamAssistant(
  messages: ModelMessage[],
  modelSpec: string = DEFAULT_SPEC,
  options?: { allowPrefetch?: boolean; enforceFirstToolCall?: boolean }
) {
  const { provider: provName, model } = parseSpecifier(modelSpec);
  const prov = factories[provName]();
  // Try to load MCP tools (GitLab) if enabled; fall back silently if not.
  const mcpTools = await getGitLabMcpTools().catch(() => null);
  if (mcpTools) {
    try {
      const names = Object.keys(mcpTools);
      // eslint-disable-next-line no-console
      console.info("[MCP] Attaching tools to streamText:", names);
    } catch {
      // ignore
    }
  } else {
    // eslint-disable-next-line no-console
    console.info("[MCP] No tools attached (disabled or failed to load)");
  }
  // Heuristic: if the latest user message references GitLab, parse project/ref
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const rawText =
    typeof lastUser?.content === "string" ? lastUser.content : undefined;
  const containsGitLabUrl =
    !!rawText && /https?:\/\/[^\s]*gitlab\.com\//i.test(rawText ?? "");
  function parseGitLabInfo(text: string): {
    projectPath?: string;
    ref?: string;
    subPath?: string;
  } {
    const m = text.match(/https?:\/\/[^\s]*gitlab\.com\/([^\s#?]+)/i);
    if (!m) return {};
    let path = m[1];
    // strip trailing punctuation
    path = path.replace(/[)\].,>]+$/, "");
    const dashIdx = path.indexOf("/-/");
    let projectPath = dashIdx >= 0 ? path.slice(0, dashIdx) : path;
    const after = dashIdx >= 0 ? path.slice(dashIdx + 3) : "";
    let ref: string | undefined;
    let subPath: string | undefined;
    if (after) {
      const segs = after.split("/");
      const kind = segs[0];
      if (kind === "tree" || kind === "blob" || kind === "raw") {
        ref = segs[1];
        subPath = segs.slice(2).join("/") || undefined;
      }
    }
    try {
      projectPath = projectPath
        .split("/")
        .map((s) => decodeURIComponent(s))
        .join("/");
    } catch {}
    return { projectPath, ref, subPath };
  }
  let projectIdHint: string | undefined;
  let refHint: string | undefined;
  if (containsGitLabUrl && rawText) {
    const info = parseGitLabInfo(rawText);
    projectIdHint = info.projectPath;
    refHint = info.ref;
  }

  // Rely on tool schemas for tool-calling; avoid verbose textual tool lists
  const toolNames = mcpTools ? (Object.keys(mcpTools) as string[]) : [];
  let toolHint: string | undefined;
  if (toolNames.length > 0) {
    const dynamicCatalog = await getGitLabMcpToolCatalog().catch(() => []);
    if (dynamicCatalog.length > 0) {
      const toolsJson = {
        scope: "optional-tools",
        description:
          "These tools are available if relevant (e.g., repository analysis). Use them only when they help answer the user's request.",
        tools: dynamicCatalog.map((t) => ({
          name: t.name,
          parameters: t.parameters,
          schema: t.schema ?? undefined,
        })),
        note: "Call any tools needed to gather context. You may chain up to 20 tool calls.",
        ...(projectIdHint
          ? {
              defaultParams: {
                projectIdOrPath: projectIdHint,
                ...(refHint ? { ref: refHint } : {}),
              },
            }
          : {}),
      } as const;
      toolHint = `MCP Tools Catalog (JSON)\n${JSON.stringify(
        toolsJson,
        null,
        2
      )}`;
    }
  }

  // If the user asked for a summary/overview, instruct the model not to echo raw JSON
  function isSummaryQuery(text: string | undefined): boolean {
    if (!text) return false;
    return /\b(summary|summarize|overview|tell me about|describe|details)\b/i.test(
      text
    );
  }
  const summaryHint = isSummaryQuery(rawText)
    ? `When tool results or prefetched context include JSON, do not paste the raw JSON in your reply.
Instead, write a concise natural-language summary using the data. Prefer short sections and bullet points (Overview, Languages, Key Files, Notable Findings). Avoid code fences for plain JSON. Include links only if helpful.`
    : undefined;

  // Best-effort prefetch; also try to resolve project path via MCP if URL contained extras
  let prefetchedOverview: string | undefined;
  async function resolveProjectPathViaMcp(initial: string): Promise<string> {
    if (!mcpTools) return initial;
    const exec = mcpTools as unknown as Record<
      string,
      { execute?: (args: unknown) => Promise<unknown> }
    >;
    const getProject = exec.get_project?.execute;
    if (!getProject) return initial;
    const cleanInitial = initial.split("/-/")[0];
    const parts = cleanInitial.split("/").filter(Boolean);
    const candidates: string[] = [];
    for (let n = Math.min(parts.length, 6); n >= 2; n--) {
      candidates.push(parts.slice(0, n).join("/"));
    }
    if (!candidates.includes(cleanInitial)) candidates.unshift(cleanInitial);
    for (const cand of candidates) {
      try {
        const res = (await getProject?.({ projectIdOrPath: cand })) as
          | { content?: Array<{ type?: string; text?: string }> }
          | undefined;
        const text = res?.content?.find((p) => p.type === "text")?.text;
        if (!text) continue;
        const parsed = JSON.parse(text) as {
          id?: unknown;
          path_with_namespace?: unknown;
        };
        if (typeof parsed?.path_with_namespace === "string")
          return parsed.path_with_namespace;
        if (typeof parsed?.id === "number") return cand;
      } catch {}
    }
    return cleanInitial;
  }
  // Only resolve/normalize project path when prefetching is allowed; otherwise let the model research
  if ((options?.allowPrefetch ?? true) && projectIdHint && mcpTools) {
    projectIdHint = await resolveProjectPathViaMcp(projectIdHint);
  }
  if (
    (options?.allowPrefetch ?? true) &&
    projectIdHint &&
    mcpTools &&
    toolNames.includes("gather_repo_overview")
  ) {
    try {
      const res = await (
        mcpTools as unknown as Record<
          string,
          { execute?: (args: unknown) => Promise<unknown> }
        >
      ).gather_repo_overview?.execute?.({
        projectIdOrPath: projectIdHint,
        ref: refHint,
      });
      const result = res as
        | { content?: Array<{ type?: string; text?: string }> }
        | undefined;
      const textPart = Array.isArray(result?.content)
        ? result?.content.find((p) => p?.type === "text")
        : undefined;
      if (textPart?.text) prefetchedOverview = textPart.text;
    } catch {
      // ignore — this is a soft fallback only
    }
  }

  let prefetchedListing: string | undefined;
  if (
    (options?.allowPrefetch ?? true) &&
    projectIdHint &&
    mcpTools &&
    toolNames.includes("list_files")
  ) {
    // If the URL points to a subdirectory, prefetch a listing to provide concrete context
    const path = (rawText && parseGitLabInfo(rawText).subPath) || undefined;
    if (path) {
      try {
        const res = await (
          mcpTools as unknown as Record<
            string,
            { execute?: (args: unknown) => Promise<unknown> }
          >
        ).list_files?.execute?.({
          projectIdOrPath: projectIdHint,
          ref: refHint,
          path,
          recursive: true,
          maxPages: 5,
        });
        const result = res as
          | { content?: Array<{ type?: string; text?: string }> }
          | undefined;
        const text = result?.content?.find((p) => p.type === "text")?.text;
        if (text) prefetchedListing = text;
      } catch {}
    }
  }

  // Model-research-first preference: do not prefetch curated bundles here; let the model decide what to call

  const augmentedMessages = [
    ...(toolHint
      ? ([{ role: "system" as const, content: toolHint }] as ModelMessage[])
      : []),
    ...(summaryHint
      ? ([{ role: "system" as const, content: summaryHint }] as ModelMessage[])
      : []),
    // no bundle prefetch injection
    ...(prefetchedOverview
      ? ([
          {
            role: "system" as const,
            content: `GitLab repository overview (prefetched):\n\n${prefetchedOverview}`,
          },
        ] as ModelMessage[])
      : ([] as ModelMessage[])),
    ...(prefetchedListing
      ? ([
          {
            role: "system" as const,
            content: `GitLab subpath listing (prefetched):\n\n${prefetchedListing}`,
          },
        ] as ModelMessage[])
      : ([] as ModelMessage[])),
    ...messages,
  ] as ModelMessage[];

  const activeTools = mcpTools
    ? (Object.keys(mcpTools) as string[])
    : undefined;
  // eslint-disable-next-line no-console
  console.info(
    "[MCP] strategy:",
    options?.enforceFirstToolCall ? "forced first tool call" : "auto (no forced first tool)",
    "activeTools:",
    activeTools?.length ?? 0,
    projectIdHint ? `projectIdHint: ${projectIdHint}` : "",
    prefetchedOverview ? "(prefetched overview)" : "",
    prefetchedListing ? "(prefetched listing)" : ""
  );

  const result = await streamText({
    model: prov(model),
    messages: augmentedMessages,
    tools: mcpTools ?? undefined,
    // Optionally require a tool call on the first step (e.g., tickets mode with repo URL)
    prepareStep: options?.enforceFirstToolCall
      ? ({ stepNumber, steps }) => {
          // Count total tool calls made so far
          const totalToolCalls = steps.reduce((count, step) => 
            count + (step.toolCalls?.length ?? 0), 0
          );
          
          // eslint-disable-next-line no-console
          console.log('[AI] prepareStep called:', { 
            stepNumber, 
            enforceFirstToolCall: options.enforceFirstToolCall,
            totalToolCalls,
            stepsCount: steps.length
          });
          
          // Force tool use on first step
          if (stepNumber === 0) {
            return { toolChoice: "required" as const };
          }
          
          // For early steps, require more tool calls if not enough research done
          if (stepNumber <= 4 && totalToolCalls < 5) {
            return { toolChoice: "required" as const };
          }
          
          return undefined;
        }
      : undefined,
    // Allow up to 20 sequential steps (tool calls + responses)
    stopWhen: stepCountIs(20),
    onStepFinish: async ({ toolResults, toolCalls, finishReason }) => {
      // eslint-disable-next-line no-console
      console.info(
        "[AI] Step finished",
        "toolResults:",
        toolResults?.length ?? 0,
        "toolCalls:",
        toolCalls?.length ?? 0,
        "finish:",
        finishReason
      );
      
      // Debug: log tool call names and result sizes
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((call, i) => {
          // eslint-disable-next-line no-console
          console.info(`[AI] Tool call ${i + 1}:`, call.toolName, JSON.stringify(call).slice(0, 200));
        });
      }
      
      if (toolResults && toolResults.length > 0) {
        toolResults.forEach((result, i) => {
          try {
            const resultStr = JSON.stringify(result);
            // eslint-disable-next-line no-console
            console.info(`[AI] Tool result ${i + 1}:`, `(${resultStr.length} chars)`, resultStr.slice(0, 200) + '...');
          } catch (e) {
            // eslint-disable-next-line no-console
            console.info(`[AI] Tool result ${i + 1}:`, 'failed to stringify', result);
          }
        });
      }
    },
    onError: ({ error }) => {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error("[AI] streamText error:", msg);
    },
    onChunk: (chunk) => {
      // Useful to see tool call chunks moving through
      try {
        const type = (chunk as { type?: string }).type;
        if (
          type === "tool-call" ||
          type === "tool-result" ||
          type === "tool-output" ||
          type === "tool-error"
        ) {
          // eslint-disable-next-line no-console
          console.info("[AI] Chunk:", type, chunk);
        }
      } catch {
        // ignore
      }
    },
  });
  return result;
}
