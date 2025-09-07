import { z } from "zod";

// Server-side MCP connection configuration
export const ServerMcpConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  command: z.string(),
  args: z.array(z.string()),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
});

export type ServerMcpConnection = z.infer<typeof ServerMcpConnectionSchema>;

// Define available MCP connections as a simple list
const connections: ServerMcpConnection[] = [
  {
    id: "gitlab",
    name: "GitLab",
    enabled: process.env.MCP_GITLAB_ENABLED === "true",
    command: "npx",
    args: [
      "tsx",
      ...(process.env.MCP_GITLAB_ARGS || "src/mcp/gitlab/index.ts")
        .trim()
        .split(/\s+/),
    ],
    cwd: process.env.MCP_GITLAB_CWD || process.cwd(),
    env: {
      GITLAB_HOST: process.env.GITLAB_HOST || "https://gitlab.com",
      GITLAB_TOKEN: process.env.GITLAB_TOKEN || "",
    },
  },

  // Future MCP connections can be added here
  /*
  {
    id: "github",
    name: "GitHub",
    enabled: process.env.MCP_GITHUB_ENABLED === "true",
    command: "npx",
    args: [
      "tsx",
      ...((process.env.MCP_GITHUB_ARGS || "src/mcp/github/index.ts")
        .trim()
        .split(/\s+/)),
    ],
    cwd: process.env.MCP_GITHUB_CWD || process.cwd(),
    env: {
      GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
      GITHUB_HOST: process.env.GITHUB_HOST || "https://api.github.com",
    },
  },
  */
];

// Get all enabled connections
export function getServerMcpConnections(): ServerMcpConnection[] {
  return connections.filter((c) => c.enabled);
}
