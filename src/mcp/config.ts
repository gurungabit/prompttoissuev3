import { z } from "zod";

// App-side config (Zod v4) for MCP servers. Parsed from process.env.

const McpEnvSchema = z.object({
  MCP_GITLAB_ENABLED: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (typeof v === "boolean") return v;
      if (typeof v === "string") return /^(1|true|yes|on)$/i.test(v);
      return false;
    }),
  MCP_GITLAB_CMD: z.string().optional(),
  MCP_GITLAB_ARGS: z.string().optional(),
  MCP_GITLAB_CWD: z.string().optional(),
});

export type McpGitLabConfig = {
  enabled: boolean;
  command: string;
  args: string[];
  cwd?: string;
};

function resolveTsxBin(): string {
  // Prefer local tsx binary so we can run TS entrypoints directly in dev.
  const bin =
    process.platform === "win32"
      ? "node_modules/.bin/tsx.cmd"
      : "node_modules/.bin/tsx";
  return bin;
}

export function getGitLabMcpConfig(): McpGitLabConfig {
  const raw = McpEnvSchema.parse({
    MCP_GITLAB_ENABLED: process.env.MCP_GITLAB_ENABLED,
    MCP_GITLAB_CMD: process.env.MCP_GITLAB_CMD,
    MCP_GITLAB_ARGS: process.env.MCP_GITLAB_ARGS,
    MCP_GITLAB_CWD: process.env.MCP_GITLAB_CWD,
  });

  const enabled = !!raw.MCP_GITLAB_ENABLED;
  const command = raw.MCP_GITLAB_CMD || resolveTsxBin();
  const args =
    raw.MCP_GITLAB_ARGS && raw.MCP_GITLAB_ARGS.trim().length > 0
      ? raw.MCP_GITLAB_ARGS.split(/\s+/)
      : ["src/mcp/gitlab/index.ts"]; // default to TS entry via tsx

  return {
    enabled,
    command,
    args,
    cwd: raw.MCP_GITLAB_CWD,
  };
}
