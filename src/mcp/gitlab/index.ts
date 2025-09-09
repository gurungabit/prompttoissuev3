import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { globToRegExp } from "./analysis-utils.js";
import {
  encodeProjectId,
  ensureToken,
  gitlabJson,
  gitlabPaginated,
  gitlabText,
  logToolCall,
} from "./api.js";
import {
  BlobSearchResultShape,
  BranchShape,
  LanguagesShape,
  ProjectShape,
  TreeItemShape,
} from "./types.js";

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

// Build server
const server = new McpServer({
  name: "gitlab-mcp",
  version: "0.1.0",
});
// Important: log to stderr only; stdout is reserved for MCP JSON-RPC
// eslint-disable-next-line no-console
console.error("[MCP][GitLab] Server initialized");

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
    logToolCall("list_projects", {
      search,
      membership,
      archived,
      simple,
      maxPages,
    });
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
      maxPages ?? 5,
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
            2,
          ),
        },
      ],
    };
  },
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
    logToolCall("get_project", { projectIdOrPath });
    ensureToken();
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}`,
    );
    const project = z.object(ProjectShape).passthrough().parse(projectUnknown);
    return {
      content: [{ type: "text", text: JSON.stringify(project, null, 2) }],
    };
  },
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
    logToolCall("list_branches", { projectIdOrPath, search, maxPages });
    ensureToken();
    const branchesUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/repository/branches`,
      { search },
      maxPages ?? 2,
    );
    const branches = z.array(z.object(BranchShape)).parse(branchesUnknown);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            branches.map((b) => ({ name: b.name, default: !!b.default })),
            null,
            2,
          ),
        },
      ],
    };
  },
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
    logToolCall("list_files", {
      projectIdOrPath,
      ref,
      path,
      recursive,
      maxPages,
    });
    ensureToken();
    const itemsUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/repository/tree`,
      {
        ref,
        path,
        recursive: recursive ?? true,
      },
      maxPages ?? 10,
    );
    const items = z.array(z.object(TreeItemShape)).parse(itemsUnknown);
    const files = items.filter((i) => i.type === "blob");
    return {
      content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
    };
  },
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
    logToolCall("read_file", { projectIdOrPath, filePath, ref, maxBytes });
    ensureToken();
    const encodedProject = encodeProjectId(projectIdOrPath);
    const encodedPath = encodeURIComponent(filePath);
    const text = await gitlabText(
      `/projects/${encodedProject}/repository/files/${encodedPath}/raw`,
      { searchParams: { ref } },
    );
    const limit = maxBytes ?? 200_000;
    const truncated =
      text.length > limit ? `${text.slice(0, limit)}\n... [truncated]` : text;
    return { content: [{ type: "text", text: truncated }] };
  },
);

// Tool: read_file_smart
server.registerTool(
  "read_file_smart",
  {
    title: "Read file by name or path",
    description:
      "Read repository file by exact path or best-effort name lookup (uses search, prefers matches under basePath).",
    inputSchema: {
      projectIdOrPath: z.string(),
      nameOrPath: z.string(),
      ref: z.string().optional(),
      basePath: z.string().optional(),
      maxBytes: z.number().min(1).max(5_000_000).default(200_000).optional(),
      maxPages: z.number().min(1).max(50).default(3).optional(),
    },
  },
  async ({
    projectIdOrPath,
    nameOrPath,
    ref,
    basePath,
    maxBytes,
    maxPages,
  }) => {
    logToolCall("read_file_smart", {
      projectIdOrPath,
      nameOrPath,
      ref,
      basePath,
      maxBytes,
      maxPages,
    });
    ensureToken();
    const encodedProject = encodeProjectId(projectIdOrPath);

    async function readByPath(path: string): Promise<string> {
      const encodedPath = encodeURIComponent(path);
      return gitlabText(
        `/projects/${encodedProject}/repository/files/${encodedPath}/raw`,
        { searchParams: { ref } },
      );
    }

    function scorePath(path: string): number {
      // Higher score is better
      let score = 0;
      const name = nameOrPath.replace(/^\.+\//, "");
      if (path.endsWith(name)) score += 5;
      if (basePath && path.startsWith(basePath)) score += 3;
      // prefer shorter paths when tie
      score += Math.max(0, 200 - path.length) / 200;
      return score;
    }

    try {
      // If explicit path-like input, try direct read first
      if (nameOrPath.includes("/")) {
        const text = await readByPath(nameOrPath);
        const limit = maxBytes ?? 200_000;
        const truncated =
          text.length > limit
            ? `${text.slice(0, limit)}\n... [truncated]`
            : text;
        return {
          content: [{ type: "text", text: truncated }],
        };
      }
    } catch {
      // fall through to search
    }

    // Use GitLab code search to find candidate paths
    const resultsUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodedProject}/search`,
      {
        scope: "blobs",
        search: nameOrPath,
        ref,
      },
      maxPages ?? 3,
    );
    const results = z
      .array(z.object(BlobSearchResultShape))
      .parse(resultsUnknown);
    const ranked = results
      .map((r) => ({ path: r.path, s: scorePath(r.path) }))
      .sort((a, b) => b.s - a.s);

    if (ranked.length === 0) {
      return {
        content: [
          { type: "text", text: `No file found matching '${nameOrPath}'.` },
        ],
      };
    }

    // Try reading top candidate
    const chosen = ranked[0].path;
    try {
      const text = await readByPath(chosen);
      const limit = maxBytes ?? 200_000;
      const truncated =
        text.length > limit ? `${text.slice(0, limit)}\n... [truncated]` : text;
      return {
        content: [
          { type: "text", text: truncated },
          {
            type: "text",
            text: `\n[read_file_smart path=${chosen}${ref ? ` ref=${ref}` : ""}]`,
          },
        ],
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return {
        content: [
          { type: "text", text: `Failed to read '${chosen}': ${message}` },
        ],
      };
    }
  },
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
    logToolCall("search_code", { projectIdOrPath, query, ref, maxPages });
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
      maxPages ?? 3,
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
  },
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
    logToolCall("list_languages", { projectIdOrPath });
    ensureToken();
    const languagesUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}/languages`,
    );
    const languages = LanguagesShape.parse(languagesUnknown);
    return {
      content: [{ type: "text", text: JSON.stringify(languages, null, 2) }],
    };
  },
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
    logToolCall("get_readme", { projectIdOrPath, ref });
    ensureToken();
    // Determine default branch if not provided
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}`,
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
            projectIdOrPath,
          )}/repository/files/${encodeURIComponent(fname)}/raw`,
          { searchParams: { ref: branch } },
        );
        return { content: [{ type: "text", text }] };
      } catch {
        // try next
      }
    }
    return { content: [{ type: "text", text: "README not found" }] };
  },
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
    logToolCall("gather_repo_overview", {
      projectIdOrPath,
      ref,
      topNFiles,
      filePatterns,
      readmeBytes,
    });
    ensureToken();
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodeProjectId(projectIdOrPath)}`,
    );
    const project = z.object(ProjectShape).passthrough().parse(projectUnknown);
    const branch = ref ?? project.default_branch ?? "main";

    const [languagesUnknown, branchesUnknown, treeItemsUnknown] =
      await Promise.all([
        gitlabJson<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/languages`,
        ),
        gitlabPaginated<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/repository/branches`,
          {},
          1,
        ),
        gitlabPaginated<unknown>(
          `/projects/${encodeProjectId(projectIdOrPath)}/repository/tree`,
          { ref: branch, recursive: true },
          5,
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
              projectIdOrPath,
            )}/repository/files/${encodeURIComponent(fname)}/raw`,
            { searchParams: { ref: branch } },
          );
          const limit = readmeBytes ?? 100_000;
          readme =
            text.length > limit
              ? `${text.slice(0, limit)}\n... [truncated]`
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
  },
);

// Tool: get_repository_tree — simple repository tree for LLM exploration
server.registerTool(
  "get_repository_tree",
  {
    title: "Get repository file tree",
    description:
      "Returns the complete repository file tree structure. LLM can then decide which specific files to read based on the tree. More efficient than trying to guess important files.",
    inputSchema: {
      projectIdOrPath: z.string(),
      ref: z.string().optional(),
      maxDepth: z.number().min(1).max(10).default(5).optional(),
      showFileTypes: z.boolean().default(true).optional(),
    },
  },
  async ({ projectIdOrPath, ref, maxDepth, showFileTypes }) => {
    logToolCall("get_repository_tree", {
      projectIdOrPath,
      ref,
      maxDepth,
      showFileTypes,
    });
    ensureToken();

    const encodedProject = encodeProjectId(projectIdOrPath);

    // Get project info for default branch
    const projectUnknown = await gitlabJson<unknown>(
      `/projects/${encodedProject}`,
    );
    const project = z.object(ProjectShape).passthrough().parse(projectUnknown);
    const branch = ref ?? project.default_branch ?? "main";

    // Get the repository tree
    const treeUnknown = await gitlabPaginated<unknown>(
      `/projects/${encodedProject}/repository/tree`,
      { ref: branch, recursive: true },
      maxDepth ?? 5,
    );
    const tree = z.array(z.object(TreeItemShape)).parse(treeUnknown);

    // Build a clean tree structure for LLM
    const files = tree.filter((i) => i.type === "blob");
    const directories = tree.filter((i) => i.type === "tree");

    // Group files by directory for better organization
    const filesByDir: Record<string, string[]> = {};
    files.forEach((file) => {
      const dir = file.path.includes("/")
        ? file.path.substring(0, file.path.lastIndexOf("/"))
        : "/";
      if (!filesByDir[dir]) filesByDir[dir] = [];
      filesByDir[dir].push(file.name);
    });

    // Basic file type statistics if requested
    const fileStats = showFileTypes
      ? {
          totalFiles: files.length,
          totalDirectories: directories.length,
          fileExtensions: files.reduce(
            (acc, file) => {
              const ext = file.name.includes(".")
                ? file.name.split(".").pop()?.toLowerCase() || "no-ext"
                : "no-ext";
              acc[ext] = (acc[ext] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        }
      : undefined;

    const result = {
      project: {
        name: project.name,
        path: project.path_with_namespace,
        description: project.description,
        default_branch: project.default_branch,
        web_url: project.web_url,
      },
      tree: {
        branch,
        structure: filesByDir,
        allFiles: files.map((f) => f.path).sort(),
        ...(fileStats && { stats: fileStats }),
      },
      suggestions: {
        commonConfigFiles: files
          .filter((f) =>
            [
              "package.json",
              "tsconfig.json",
              "requirements.txt",
              "go.mod",
              "Cargo.toml",
              "pom.xml",
              "composer.json",
              "Gemfile",
            ].includes(f.name),
          )
          .map((f) => f.path),
        readmeFiles: files
          .filter((f) => f.name.toLowerCase().startsWith("readme"))
          .map((f) => f.path),
        dockerFiles: files
          .filter(
            (f) =>
              f.name.toLowerCase().includes("dockerfile") ||
              f.name === "docker-compose.yml",
          )
          .map((f) => f.path),
      },
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  },
);

// // Optionally expose a file resource URI template for convenience
// // Example URI: gitlab://project/{id}/file/{ref}/{path}
// server.registerResource(
//   "gitlab-file",
//   new ResourceTemplate(
//     "gitlab://project/{projectIdOrPath}/file/{ref}/{filePath}",
//     { list: undefined },
//   ),
//   {
//     title: "GitLab File",
//     description: "Read a GitLab repository file via resource URI.",
//     mimeType: "text/plain",
//   },
//   async (uri, params) => {
//     const { projectIdOrPath, ref, filePath } = params as unknown as {
//       projectIdOrPath: string;
//       ref: string;
//       filePath: string;
//     };
//     const text = await gitlabText(
//       `/projects/${encodeProjectId(
//         projectIdOrPath,
//       )}/repository/files/${encodeURIComponent(filePath)}/raw`,
//       { searchParams: { ref } },
//     );
//     return { contents: [{ uri: uri.href, text }] };
//   },
// );

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
