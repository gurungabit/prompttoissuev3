#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "gitlab-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// GitLab API configuration
const GITLAB_TOKEN = process.env.GITLAB_TOKEN;
const GITLAB_URL = process.env.GITLAB_URL || "https://gitlab.com";

interface GitLabProject {
  id: number;
  name: string;
  path: string;
  web_url: string;
  description?: string;
}

interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  web_url: string;
  created_at: string;
  updated_at: string;
}

interface GitLabMergeRequest {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
}

interface GitLabRepositoryFile {
  id: string;
  name: string;
  type: 'tree' | 'blob';
  path: string;
  mode: string;
}

interface GitLabFileContent {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
  content: string;
}

// Helper function to make GitLab API requests
async function gitlabRequest(
  endpoint: string,
  method: string = "GET",
  body?: any
): Promise<any> {
  if (!GITLAB_TOKEN) {
    throw new Error("GITLAB_TOKEN environment variable is required");
  }

  const url = `${GITLAB_URL}/api/v4${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${GITLAB_TOKEN}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `GitLab API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_projects",
        description: "List GitLab projects accessible to the user",
        inputSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Search term to filter projects",
            },
            limit: {
              type: "number",
              description: "Maximum number of projects to return (default: 20)",
              default: 20,
            },
          },
        },
      },
      {
        name: "get_project",
        description: "Get details of a specific GitLab project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description:
                'Project ID or path (e.g., "123" or "group/project")',
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "list_issues",
        description: "List issues in a GitLab project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            state: {
              type: "string",
              enum: ["opened", "closed", "all"],
              description: "Issue state filter",
              default: "opened",
            },
            limit: {
              type: "number",
              description: "Maximum number of issues to return (default: 20)",
              default: 20,
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "create_issue",
        description: "Create a new issue in a GitLab project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            title: {
              type: "string",
              description: "Issue title",
            },
            description: {
              type: "string",
              description: "Issue description",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Issue labels",
            },
          },
          required: ["project_id", "title"],
        },
      },
      {
        name: "get_issue",
        description: "Get details of a specific issue",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            issue_iid: {
              type: "number",
              description: "Issue internal ID (iid)",
            },
          },
          required: ["project_id", "issue_iid"],
        },
      },
      {
        name: "list_merge_requests",
        description: "List merge requests in a GitLab project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            state: {
              type: "string",
              enum: ["opened", "closed", "merged", "all"],
              description: "Merge request state filter",
              default: "opened",
            },
            limit: {
              type: "number",
              description:
                "Maximum number of merge requests to return (default: 20)",
              default: 20,
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "create_merge_request",
        description: "Create a new merge request in a GitLab project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            title: {
              type: "string",
              description: "Merge request title",
            },
            description: {
              type: "string",
              description: "Merge request description",
            },
            source_branch: {
              type: "string",
              description: "Source branch name",
            },
            target_branch: {
              type: "string",
              description: "Target branch name (default: main)",
              default: "main",
            },
          },
          required: ["project_id", "title", "source_branch"],
        },
      },
      {
        name: "search_projects_advanced",
        description: "Advanced search for GitLab projects with more filtering options",
        inputSchema: {
          type: "object",
          properties: {
            search: {
              type: "string",
              description: "Search term to filter projects by name, description, or path",
            },
            visibility: {
              type: "string",
              enum: ["private", "internal", "public"],
              description: "Project visibility level",
            },
            order_by: {
              type: "string",
              enum: ["id", "name", "path", "created_at", "updated_at", "last_activity_at"],
              description: "Order projects by field",
              default: "last_activity_at",
            },
            sort: {
              type: "string",
              enum: ["asc", "desc"],
              description: "Sort order",
              default: "desc",
            },
            limit: {
              type: "number",
              description: "Maximum number of projects to return (default: 20)",
              default: 20,
            },
          },
        },
      },
      {
        name: "get_repository_tree",
        description: "Get repository file tree for browsing project structure",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            path: {
              type: "string",
              description: "Path within the repository (default: root)",
              default: "",
            },
            ref: {
              type: "string",
              description: "Branch, tag, or commit SHA (default: main)",
              default: "main",
            },
            recursive: {
              type: "boolean",
              description: "Get recursive tree (all files and subdirectories)",
              default: false,
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "get_file_content",
        description: "Get content of a specific file from the repository",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            file_path: {
              type: "string",
              description: "Path to the file within the repository",
            },
            ref: {
              type: "string",
              description: "Branch, tag, or commit SHA (default: main)",
              default: "main",
            },
          },
          required: ["project_id", "file_path"],
        },
      },
      {
        name: "search_code",
        description: "Search for code within a project repository",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            query: {
              type: "string",
              description: "Search query (supports regex)",
            },
            ref: {
              type: "string",
              description: "Branch, tag, or commit SHA (default: main)",
              default: "main",
            },
          },
          required: ["project_id", "query"],
        },
      },
      {
        name: "list_branches",
        description: "List all branches in a project repository",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            search: {
              type: "string",
              description: "Search term to filter branches",
            },
          },
          required: ["project_id"],
        },
      },
      {
        name: "get_commits",
        description: "Get commit history for a project",
        inputSchema: {
          type: "object",
          properties: {
            project_id: {
              type: "string",
              description: "Project ID or path",
            },
            ref_name: {
              type: "string",
              description: "Branch, tag, or commit SHA (default: main)",
              default: "main",
            },
            path: {
              type: "string",
              description: "File path to filter commits",
            },
            since: {
              type: "string",
              description: "ISO 8601 date to filter commits after",
            },
            until: {
              type: "string",
              description: "ISO 8601 date to filter commits before",
            },
            limit: {
              type: "number",
              description: "Maximum number of commits to return (default: 20)",
              default: 20,
            },
          },
          required: ["project_id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "list_projects": {
        const { search, limit = 20 } = args as {
          search?: string;
          limit?: number;
        };
        const params = new URLSearchParams();
        params.append("per_page", limit.toString());
        if (search) {
          params.append("search", search);
        }

        const projects: GitLabProject[] = await gitlabRequest(
          `/projects?${params}`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  path: p.path,
                  web_url: p.web_url,
                  description: p.description,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_project": {
        const { project_id } = args as { project_id: string };
        const project: GitLabProject = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      }

      case "list_issues": {
        const {
          project_id,
          state = "opened",
          limit = 20,
        } = args as {
          project_id: string;
          state?: string;
          limit?: number;
        };

        const params = new URLSearchParams();
        params.append("state", state);
        params.append("per_page", limit.toString());

        const issues: GitLabIssue[] = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/issues?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                issues.map((i) => ({
                  id: i.id,
                  iid: i.iid,
                  title: i.title,
                  description: i.description,
                  state: i.state,
                  web_url: i.web_url,
                  created_at: i.created_at,
                  updated_at: i.updated_at,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_issue": {
        const { project_id, title, description, labels } = args as {
          project_id: string;
          title: string;
          description?: string;
          labels?: string[];
        };

        const issueData: any = {
          title,
          description: description || "",
        };

        if (labels && labels.length > 0) {
          issueData.labels = labels.join(",");
        }

        const issue: GitLabIssue = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/issues`,
          "POST",
          issueData
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case "get_issue": {
        const { project_id, issue_iid } = args as {
          project_id: string;
          issue_iid: number;
        };
        const issue: GitLabIssue = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/issues/${issue_iid}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(issue, null, 2),
            },
          ],
        };
      }

      case "list_merge_requests": {
        const {
          project_id,
          state = "opened",
          limit = 20,
        } = args as {
          project_id: string;
          state?: string;
          limit?: number;
        };

        const params = new URLSearchParams();
        params.append("state", state);
        params.append("per_page", limit.toString());

        const mrs: GitLabMergeRequest[] = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/merge_requests?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                mrs.map((mr) => ({
                  id: mr.id,
                  iid: mr.iid,
                  title: mr.title,
                  description: mr.description,
                  state: mr.state,
                  web_url: mr.web_url,
                  source_branch: mr.source_branch,
                  target_branch: mr.target_branch,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_merge_request": {
        const {
          project_id,
          title,
          description,
          source_branch,
          target_branch = "main",
        } = args as {
          project_id: string;
          title: string;
          description?: string;
          source_branch: string;
          target_branch?: string;
        };

        const mrData = {
          title,
          description: description || "",
          source_branch,
          target_branch,
        };

        const mr: GitLabMergeRequest = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/merge_requests`,
          "POST",
          mrData
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(mr, null, 2),
            },
          ],
        };
      }

      case "search_projects_advanced": {
        const {
          search,
          visibility,
          order_by = "last_activity_at",
          sort = "desc",
          limit = 20,
        } = args as {
          search?: string;
          visibility?: string;
          order_by?: string;
          sort?: string;
          limit?: number;
        };

        const params = new URLSearchParams();
        params.append("per_page", limit.toString());
        params.append("order_by", order_by);
        params.append("sort", sort);
        if (search) {
          params.append("search", search);
        }
        if (visibility) {
          params.append("visibility", visibility);
        }

        const projects: GitLabProject[] = await gitlabRequest(
          `/projects?${params}`
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  path: p.path,
                  web_url: p.web_url,
                  description: p.description,
                })),
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_repository_tree": {
        const {
          project_id,
          path = "",
          ref = "main",
          recursive = false,
        } = args as {
          project_id: string;
          path?: string;
          ref?: string;
          recursive?: boolean;
        };

        const params = new URLSearchParams();
        params.append("ref", ref);
        if (path) {
          params.append("path", path);
        }
        if (recursive) {
          params.append("recursive", "true");
        }

        const tree: GitLabRepositoryFile[] = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/repository/tree?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(tree, null, 2),
            },
          ],
        };
      }

      case "get_file_content": {
        const { project_id, file_path, ref = "main" } = args as {
          project_id: string;
          file_path: string;
          ref?: string;
        };

        const params = new URLSearchParams();
        params.append("ref", ref);

        try {
          const fileContent: GitLabFileContent = await gitlabRequest(
            `/projects/${encodeURIComponent(project_id)}/repository/files/${encodeURIComponent(file_path)}?${params}`
          );

          // Decode base64 content if it's base64 encoded
          let decodedContent = fileContent.content;
          if (fileContent.encoding === "base64") {
            decodedContent = Buffer.from(fileContent.content, "base64").toString(
              "utf-8"
            );
          }

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ...fileContent,
                    content: decodedContent,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } catch (error) {
          // If file not found, try to get it as raw content
          const rawContent = await gitlabRequest(
            `/projects/${encodeURIComponent(project_id)}/repository/files/${encodeURIComponent(file_path)}/raw?${params}`,
            "GET"
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    file_path,
                    ref,
                    content: rawContent,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      case "search_code": {
        const { project_id, query, ref = "main" } = args as {
          project_id: string;
          query: string;
          ref?: string;
        };

        // GitLab's search API endpoint
        const params = new URLSearchParams();
        params.append("scope", "blobs");
        params.append("search", query);
        params.append("ref", ref);

        const searchResults = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/search?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(searchResults, null, 2),
            },
          ],
        };
      }

      case "list_branches": {
        const { project_id, search } = args as {
          project_id: string;
          search?: string;
        };

        const params = new URLSearchParams();
        if (search) {
          params.append("search", search);
        }

        const branches = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/repository/branches?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(branches, null, 2),
            },
          ],
        };
      }

      case "get_commits": {
        const {
          project_id,
          ref_name = "main",
          path,
          since,
          until,
          limit = 20,
        } = args as {
          project_id: string;
          ref_name?: string;
          path?: string;
          since?: string;
          until?: string;
          limit?: number;
        };

        const params = new URLSearchParams();
        params.append("ref_name", ref_name);
        params.append("per_page", limit.toString());
        if (path) {
          params.append("path", path);
        }
        if (since) {
          params.append("since", since);
        }
        if (until) {
          params.append("until", until);
        }

        const commits = await gitlabRequest(
          `/projects/${encodeURIComponent(project_id)}/repository/commits?${params}`
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(commits, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitLab MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
