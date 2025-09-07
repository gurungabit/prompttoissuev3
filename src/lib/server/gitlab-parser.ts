import { z } from "zod";

export const gitLabInfoSchema = z.object({
  projectPath: z.string().optional(),
  ref: z.string().optional(),
  subPath: z.string().optional(),
});

export type GitLabInfo = z.infer<typeof gitLabInfoSchema>;

export function parseGitLabInfo(text: string): GitLabInfo {
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

export function containsGitLabUrl(text: string): boolean {
  return /https?:\/\/[^\s]*gitlab\.com\//i.test(text);
}

export function isSummaryQuery(text: string | undefined): boolean {
  if (!text) return false;
  return /\b(summary|summarize|overview|tell me about|describe|details)\b/i.test(
    text,
  );
}
