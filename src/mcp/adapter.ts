import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
  type ToolSet,
} from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import { getGitLabMcpConfig } from "./config";

let gitlabClientPromise: Promise<MCPClient> | null = null;

async function ensureGitLabClient() {
  if (gitlabClientPromise) return gitlabClientPromise;
  const cfg = getGitLabMcpConfig();
  if (!cfg.enabled)
    throw new Error("GitLab MCP is disabled (MCP_GITLAB_ENABLED not set)");

  // Basic debug logging to verify MCP server startup
  // eslint-disable-next-line no-console
  console.info("[MCP][GitLab] Starting STDIO server", {
    command: cfg.command,
    args: cfg.args,
    cwd: cfg.cwd ?? process.cwd(),
    host: process.env.GITLAB_HOST || "https://gitlab.com",
  });

  const transport = new StdioMCPTransport({
    command: cfg.command,
    args: cfg.args,
    cwd: cfg.cwd,
    env: {
      ...process.env,
      // Ensure server picks these up
      GITLAB_HOST: process.env.GITLAB_HOST || "https://gitlab.com",
      GITLAB_TOKEN: process.env.GITLAB_TOKEN || "",
    },
    // inherit stderr to make debugging easier locally
    stderr: "inherit",
  });

  gitlabClientPromise = createMCPClient({
    transport,
    name: "prompttoissuev3-mcp-client",
    onUncaughtError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error("[MCP][GitLab] Uncaught client error:", msg);
    },
  });

  // Clean up on process exit
  const client = await gitlabClientPromise;
  const close = async () => {
    try {
      await client.close();
      // eslint-disable-next-line no-empty
    } catch {}
  };
  process.once("exit", close);
  process.once("SIGINT", async () => {
    await close();
    process.exit(0);
  });
  process.once("SIGTERM", async () => {
    await close();
    process.exit(0);
  });

  return gitlabClientPromise;
}

export async function getGitLabMcpTools(): Promise<ToolSet | null> {
  try {
    const client = await ensureGitLabClient();
    // Let the client introspect tool schemas automatically
    const tools = await client.tools();
    try {
      const names = Object.keys(tools ?? {});
      // eslint-disable-next-line no-console
      console.info("[MCP][GitLab] Tools available:", names);
    } catch {
      // ignore logging failures
    }
    return tools;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      "[MCP][GitLab] MCP tools not available — proceeding without tools",
    );
    return null;
  }
}

export async function getGitLabMcpToolCatalog(): Promise<
  Array<{ name: string; parameters: string[]; schema?: unknown }>
> {
  try {
    const client = await ensureGitLabClient();
    const anyClient = client as unknown as {
      listTools?: () => Promise<{
        tools: Array<{ name: string; inputSchema?: unknown }>;
      }>;
      tools: () => Promise<Record<string, unknown>>;
    };

    if (typeof anyClient.listTools === "function") {
      const res = await anyClient.listTools();
      const tools = res?.tools ?? [];
      return tools.map((t) => {
        const schema = t.inputSchema as
          | { properties?: Record<string, unknown> }
          | undefined;
        const parameters = schema?.properties
          ? Object.keys(schema.properties)
          : [];
        return { name: t.name, parameters, schema };
      });
    }

    // Fallback: just names
    const tset = await anyClient.tools();
    return Object.keys(tset ?? {}).map((name) => ({ name, parameters: [] }));
  } catch {
    return [];
  }
}
