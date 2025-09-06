import { z } from "zod";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/*
  GitLab MCP Server (STDIO)

  Notes:
  - Follows repo guidance: in src/mcp/** use Zod v3 semantics and pass raw shapes
    (ZodRawShape) to MCP APIs. Concretely: inputSchema: { a: z.number() }, not z.object.
  - Exposes tools to list/search projects and explore repositories for deep context.
  - Configure via env:
      GITLAB_HOST   (default: https://gitlab.com)
      GITLAB_TOKEN  (required if private projects)
*/

type Json = unknown;

const GITLAB_HOST =
  process.env.GITLAB_HOST?.replace(/\/$/, "") || "https://gitlab.com";
const GITLAB_TOKEN = process.env.GITLAB_TOKEN || "";

function ensureToken(): void {
  if (!GITLAB_TOKEN) {
    throw new Error(
      "GITLAB_TOKEN is required for authenticated requests. Set it in the environment."
    );
  }
}

function encodeProjectId(projectIdOrPath: string): string {
  // GitLab API allows either numeric ID or URL-encoded full path (group/subgroup/project)
  return encodeURIComponent(projectIdOrPath);
}

async function gitlabJson<T extends Json>(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | boolean | undefined>;
  }
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
  if (GITLAB_TOKEN) headers["PRIVATE-TOKEN"] = GITLAB_TOKenSafe();

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab API error ${res.status}: ${text}`);
  }
  // Some endpoints return text (e.g., empty), but tools use JSON endpoints here
  return (await res.json()) as T;
}

async function gitlabText(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | boolean | undefined>;
  }
): Promise<string> {
  const url = new URL(`${GITLAB_HOST}/api/v4${path}`);
  if (init?.searchParams) {
    for (const [k, v] of Object.entries(init.searchParams)) {
      if (v === undefined) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (GITLAB_TOKEN) headers["PRIVATE-TOKEN"] = GITLAB_TOKenSafe();

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitLab API error ${res.status}: ${text}`);
  }
  return await res.text();
}

function GITLAB_TOKenSafe(): string {
  // small wrapper to keep token usage isolated for easier redaction if needed later
  return GITLAB_TOKEN;
}

async function gitlabPaginated<T extends Json>(
  path: string,
  params: Record<string, string | number | boolean | undefined>,
  maxPages = 10
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

// Types for GitLab API responses (minimal shapes we use)
const ProjectShape = {
  id: z.number(),
  name: z.string(),
  name_with_namespace: z.string().optional(),
  path_with_namespace: z.string(),
  default_branch: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  web_url: z.string().optional(),
};

const BranchShape = {
  name: z.string(),
  default: z.boolean().optional(),
};

const TreeItemShape = {
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(["blob", "tree"]),
  path: z.string(),
  mode: z.string().optional(),
};

const BlobSearchResultShape = {
  filename: z.string(),
  path: z.string(),
  startline: z.number().optional(),
  ref: z.string().optional(),
  project_id: z.number().optional(),
  data: z.string().optional(),
};

const LanguagesShape = z.record(z.string(), z.number());

// Build server
const server = new McpServer({
  name: "gitlab-mcp",
  version: "0.1.0",
});

// Tool: list_projects
server.registerTool(
  "list_projects",
  {
    title: "List GitLab projects",
    description:
      "List accessible GitLab projects. Filter by search; includes basic metadata.",
    inputSchema: {
      search: z.string().optional(),
      membership: z.boolean().optional(),
      archived: z.boolean().optional(),
      simple: z.boolean().optional(),
      maxPages: z.number().min(1).max(50).default(5).optional(),
    },
  },
  async ({ search, membership, archived, simple, maxPages }) => {
    ensureToken();
    const itemsUnknown = await gitlabPaginated<unknown>(
      "/projects",
      {
        search,
        membership: membership ?? true,
        archived,
        simple: simple ?? true,
        order_by: "last_activity_at",
        sort: "desc",
      },
      maxPages ?? 5
    );
    const items = z.array(z.object(ProjectShape)).parse(itemsUnknown);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            items.map((p) => ({
              id: p.id,
              name: p.name,
              path_with_namespace: p.path_with_namespace,
              default_branch: p.default_branch ?? null,
              description: p.description ?? null,
              web_url: p.web_url ?? null,
            })),
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: get_project
server.registerTool(
  "get_project",
  {
    title: "Get project details",
    description: "Fetch detailed metadata for a single GitLab project.",
    inputSchema: {
      projectIdOrPath: z.string(),
    },
  },
  async ({ projectIdOrPath }) => {
    ensureToken();
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}`
    );
    const project = z.object(ProjectShape).passthrough().parse(projectUnknown);
    return {
      content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
    };
  }
);

// Tool: list_branches
server.registerTool(
  "list_branches",
  {
    title: "List repository branches",
    description: "List branches for a project.",
    inputSchema: {
      projectIdOrPath: z.string(),
      search: z.string().optional(),
      maxPages: z.number().min(1).max(50).default(2).optional(),
    },
  },
  async ({ projectIdOrPath, search, maxPages }) => {
    ensureToken();
    const branchesUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/repository/branches`,
      { search },
      maxPages ?? 2
    );
    const branches = z.array(z.object(BranchShape)).parse(branchesUnknown);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            branches.map((b) => ({ name: b.name, default: !!b.default })),
            null,
            2
          ),
        },
      ],
    };
  }
);

// Tool: list_files
server.registerTool(
  "list_files",
  {
    title: "List repository files",
    description:
      "List files (tree) for a project at a ref; supports recursive listing.",
    inputSchema: {
      projectIdOrPath: z.string(),
      ref: z.string().optional(),
      path: z.string().optional(),
      recursive: z.boolean().optional(),
      maxPages: z.number().min(1).max(50).default(10).optional(),
    },
  },
  async ({ projectIdOrPath, ref, path, recursive, maxPages }) => {
    ensureToken();
    const itemsUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/repository/tree`,
      {
        ref,
        path,
        recursive: recursive ?? true,
      },
      maxPages ?? 10
    );
    const items = z.array(z.object(TreeItemShape)).parse(itemsUnknown);
    const files = items.filter((i) => i.type === "blob");
    return {
      content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
    };
  }
);

// Tool: read_file
server.registerTool(
  "read_file",
  {
    title: "Read repository file",
    description: "Read raw contents of a file at a ref.",
    inputSchema: {
      projectIdOrPath: z.string(),
      filePath: z.string(),
      ref: z.string().optional(),
      maxBytes: z.number().min(1).max(5_000_000).default(200_000).optional(),
    },
  },
  async ({ projectIdOrPath, filePath, ref, maxBytes }) => {
    ensureToken();
    const encodedProject = encodeProjectId(projectIdOrPath);
    const encodedPath = encodeURIComponent(filePath);
    const text = await gitlabText(
      `/projects/${encodedProject}/repository/files/${encodedPath}/raw`,
      { searchParams: { ref } }
    );
    const limit = maxBytes ?? 200_000;
    const truncated =
      text.length > limit ? text.slice(0, limit) + "\n... [truncated]" : text;
    return { content: [{ type: "text", text: truncated }] };
  }
);

// Tool: search_code
server.registerTool(
  "search_code",
  {
    title: "Search repository code (blobs)",
    description:
      "Search within repository files using GitLab search API (scope=blobs).",
    inputSchema: {
      projectIdOrPath: z.string(),
      query: z.string(),
      ref: z.string().optional(),
      maxPages: z.number().min(1).max(50).default(3).optional(),
    },
  },
  async ({ projectIdOrPath, query, ref, maxPages }) => {
    ensureToken();
    const encodedProject = encodeProjectId(projectIdOrPath);
    // GitLab search API: /projects/:id/search?scope=blobs&search=foo
    const resultsUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodedProject}/search`,
      {
        scope: "blobs",
        search: query,
        ref,
      },
      maxPages ?? 3
    );
    const results = z
      .array(z.object(BlobSearchResultShape))
      .parse(resultsUnknown);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }
);

// Tool: languages
server.registerTool(
  "list_languages",
  {
    title: "List repository languages",
    description: "Get language breakdown for a project.",
    inputSchema: { projectIdOrPath: z.string() },
  },
  async ({ projectIdOrPath }) => {
    ensureToken();
    const languagesUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/languages`
    );
    const languages = LanguagesShape.parse(languagesUnknown);
    return {
      content: [{ type: "text", text: JSON.stringify(languages, null, 2) }],
    };
  }
);

// Tool: get_readme (best-effort)
server.registerTool(
  "get_readme",
  {
    title: "Get README",
    description:
      "Fetch README for a project (tries common names at default branch unless ref specified).",
    inputSchema: { projectIdOrPath: z.string(), ref: z.string().optional() },
  },
  async ({ projectIdOrPath, ref }) => {
    ensureToken();
    // Determine default branch if not provided
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}`
    );
    const project = z.object(ProjectShape).passthrough().parse(projectUnknown);
    const branch = ref ?? project.default_branch ?? "main";
    const candidates = [
      "README.md",
      "README.MD",
      "Readme.md",
      "readme.md",
      "README",
    ];
    for (const fname of candidates) {
      try {
        const text = await gitlabText(
          `/projects/${encodeProjectId(
            projectIdOrPath
          )}/repository/files/${encodeURIComponent(fname)}/raw`,
          { searchParams: { ref: branch } }
        );
        return { content: [{ type: "text", text }] };
      } catch {
        // try next
      }
    }
    return { content: [{ type: "text", text: "README not found" }] };
  }
);

// Tool: gather_repo_overview — quick, compact snapshot for LLM context
server.registerTool(
  "gather_repo_overview",
  {
    title: "Gather repository overview",
    description:
      "Return a compact overview: project meta, languages, branches, top files, README excerpt.",
    inputSchema: {
      projectIdOrPath: z.string(),
      ref: z.string().optional(),
      topNFiles: z.number().min(1).max(200).default(50).optional(),
      filePatterns: z.array(z.string()).optional(),
      readmeBytes: z.number().min(100).max(500_000).default(100_000).optional(),
    },
  },
  async ({ projectIdOrPath, ref, topNFiles, filePatterns, readmeBytes }) => {
    ensureToken();
    const project = await gitlabJson<any>(
      `/projects/${encodeProjectId(projectIdOrPath)}`
    );
    const branch = ref ?? project.default_branch ?? "main";

    const [languagesUnknown, branchesUnknown, treeItemsUnknown] =
      await Promise.all([
        gitlabJson<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/languages`
        ),
        gitlabPaginated<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/repository/branches`,
          {},
          1
        ),
        gitlabPaginated<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/repository/tree`,
          { ref: branch, recursive: true },
          5
        ),
      ]);
    const languages = LanguagesShape.parse(languagesUnknown);
    const branches = z.array(z.object(BranchShape)).parse(branchesUnknown);
    const treeItems = z.array(z.object(TreeItemShape)).parse(treeItemsUnknown);

    // Filter files
    let files = treeItems.filter((i) => i.type === "blob");
    if (filePatterns && filePatterns.length > 0) {
      const globs = filePatterns.map((p) => globToRegExp(p));
      files = files.filter((f) => globs.some((re) => re.test(f.path)));
    }
    files = files.slice(0, topNFiles ?? 50);

    // Try README excerpt (inline to avoid internal invocation)
    let readme = "";
    try {
      const candidates = [
        "README.md",
        "README.MD",
        "Readme.md",
        "readme.md",
        "README",
      ];
      for (const fname of candidates) {
        try {
          const text = await gitlabText(
            `/projects/${encodeProjectId(
              projectIdOrPath
            )}/repository/files/${encodeURIComponent(fname)}/raw`,
            { searchParams: { ref: branch } }
          );
          const limit = readmeBytes ?? 100_000;
          readme =
            text.length > limit
              ? text.slice(0, limit) + "\n... [truncated]"
              : text;
          break;
        } catch {
          // continue trying
        }
      }
    } catch {
      // ignore
    }

    const overview = {
      project: {
        id: project.id,
        name: project.name,
        path_with_namespace: project.path_with_namespace,
        default_branch: branch,
        description: project.description ?? null,
        web_url: project.web_url ?? null,
      },
      languages,
      branches: branches.map((b) => ({ name: b.name, default: !!b.default })),
      files,
      readme_excerpt: readme,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(overview, null, 2) }],
    };
  }
);

// Helper: glob-to-regexp (naive, supports * and **)
function globToRegExp(glob: string): RegExp {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\\\*\\\*\//g, "(?:.*/)?")
    .replace(/\\\*\\\*/g, ".*")
    .replace(/\\\*/g, "[^/]*");
  return new RegExp(`^${escaped}$`);
}

// Optionally expose a file resource URI template for convenience
// Example URI: gitlab://project/{id}/file/{ref}/{path}
server.registerResource(
  "gitlab-file",
  new ResourceTemplate(
    "gitlab://project/{projectIdOrPath}/file/{ref}/{filePath}",
    { list: undefined }
  ),
  {
    title: "GitLab File",
    description: "Read a GitLab repository file via resource URI.",
    mimeType: "text/plain",
  },
  async (uri, params) => {
    const { projectIdOrPath, ref, filePath } = params as unknown as {
      projectIdOrPath: string;
      ref: string;
      filePath: string;
    };
    const text = await gitlabText(
      `/projects/${encodeProjectId(
        projectIdOrPath
      )}/repository/files/${encodeURIComponent(filePath)}/raw`,
      { searchParams: { ref } }
    );
    return { contents: [{ uri: uri.href, text }] };
  }
);

// Start STDIO transport if executed directly
if (require.main === module) {
  const transport = new StdioServerTransport();
  server.connect(transport).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("Failed to start GitLab MCP server:", message);
    process.exit(1);
  });
}

export default server;
