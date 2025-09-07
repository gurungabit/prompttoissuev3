import { z } from "zod";
import type { GitLabInfo } from "./gitlab-parser";

export const prefetchResultSchema = z.object({
  prefetchedOverview: z.string().optional(),
  prefetchedListing: z.string().optional(),
});

export type PrefetchResult = z.infer<typeof prefetchResultSchema>;

// Type for MCP tools with execute methods
export type McpTool = {
  execute?: (args: unknown) => Promise<unknown>;
};

export type McpToolsRecord = Record<string, McpTool>;

export async function resolveProjectPathViaMcp(
  initial: string,
  mcpTools: McpToolsRecord,
): Promise<string> {
  if (!mcpTools) return initial;

  const exec = mcpTools;
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

export async function prefetchData(
  projectIdHint: string | undefined,
  refHint: string | undefined,
  gitLabInfo: GitLabInfo,
  mcpTools: McpToolsRecord | null,
  availableToolNames: string[],
  _rawText?: string,
): Promise<PrefetchResult> {
  if (!projectIdHint || !mcpTools) {
    return {};
  }

  const result: PrefetchResult = {};

  // Prefetch repository overview
  if (availableToolNames.includes("gather_repo_overview")) {
    try {
      const res = await mcpTools.gather_repo_overview?.execute?.({
        projectIdOrPath: projectIdHint,
        ref: refHint,
      });
      const apiResult = res as
        | { content?: Array<{ type?: string; text?: string }> }
        | undefined;
      const textPart = Array.isArray(apiResult?.content)
        ? apiResult?.content.find((p) => p?.type === "text")
        : undefined;
      if (textPart?.text) result.prefetchedOverview = textPart.text;
    } catch {
      // ignore — this is a soft fallback only
    }
  }

  // Prefetch file listing if URL points to subdirectory
  if (availableToolNames.includes("list_files")) {
    const path = gitLabInfo.subPath;
    if (path) {
      try {
        const res = await mcpTools.list_files?.execute?.({
          projectIdOrPath: projectIdHint,
          ref: refHint,
          path,
          recursive: true,
          maxPages: 5,
        });
        const apiResult = res as
          | { content?: Array<{ type?: string; text?: string }> }
          | undefined;
        const text = apiResult?.content?.find((p) => p.type === "text")?.text;
        if (text) result.prefetchedListing = text;
      } catch {}
    }
  }

  return result;
}
