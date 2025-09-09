// GitLab API utilities

type Json = unknown;

const GITLAB_HOST =
  process.env.GITLAB_HOST?.replace(/\/$/, "") || "https://gitlab.com";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || "";

export function ensureToken(): void {
  if (!GITLAB_TOKEN) {
    // eslint-disable-next-line no-console
    console.warn(
      "[MCP][GitLab] No GITLAB_TOKEN set. Proceeding unauthenticated (public projects only).",
    );
  }
}

export function encodeProjectId(projectIdOrPath: string): string {
  // GitLab API allows either numeric ID or URL-encoded full path (group/subgroup/project)
  return encodeURIComponent(projectIdOrPath);
}

export function logToolCall(name: string, params: unknown) {
  try {
    // Important: log to stderr only; stdout is reserved for MCP JSON-RPC
    // eslint-disable-next-line no-console
    console.error(`[MCP][GitLab][tool] ${name}`, params);
  } catch {}
}

function gitlabTokenSafe(): string {
  // small wrapper to keep token usage isolated for easier redaction if needed later
  return GITLAB_TOKEN;
}

export async function gitlabJson<T extends Json>(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | boolean | undefined>;
  },
): Promise<T> {
  const url = new URL(`${GITLAB_HOST}/api/v4${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (GITLAB_TOKEN) headers["PRIVATE-TOKEN"] = gitlabTokenSafe();

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab API error ${res.status}: ${text}`);
  }
  // Some endpoints return text (e.g., empty), but tools use JSON endpoints here
  return (await res.json()) as T;
}

export async function gitlabText(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | boolean | undefined>;
  },
): Promise<string> {
  const url = new URL(`${GITLAB_HOST}/api/v4${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (GITLAB_TOKEN) headers["PRIVATE-TOKEN"] = gitlabTokenSafe();

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab API error ${res.status}: ${text}`);
  }
  return await res.text();
}

export async function gitlabPaginated<T extends Json>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  maxPages = 10,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  while (page <= maxPages) {
    const pageItems = await gitlabJson<T[]>(path, {
      searchParams: { ...params, page, per_page: params.per_page ?? 100 },
    });
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    results.push(...pageItems);
    if (pageItems.length < Number(params.per_page ?? 100)) break;
    page += 1;
  }
  return results;
}
