import {
  experimental_createMCPClient as createMCPClient,
  type experimental_MCPClient as MCPClient,
  type ToolSet,
} from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";
import {
  getServerMcpConnections,
  type ServerMcpConnection,
} from "./server-config";

// Global MCP client registry
const mcpClients = new Map<string, Promise<MCPClient>>();

// Client-side MCP enable/disable state
let clientMcpEnabled: boolean = true;

export function setClientMcpEnabled(enabled: boolean): void {
  clientMcpEnabled = enabled;
  // Clear existing clients to force reconnection with new settings
  mcpClients.clear();
}

async function createMcpClient(
  config: ServerMcpConnection,
): Promise<MCPClient> {
  if (!config.enabled) {
    throw new Error(`MCP connection "${config.name}" is disabled`);
  }

  // STDIO transport only works server-side
  if (typeof window !== "undefined") {
    throw new Error("STDIO MCP connections are not supported in the browser");
  }

  // eslint-disable-next-line no-console
  console.info(`[MCP][${config.name}] Starting STDIO server`, {
    command: config.command,
    args: config.args,
    cwd: config.cwd ?? process.cwd(),
  });

  const transport = new StdioMCPTransport({
    command: config.command,
    args: config.args,
    cwd: config.cwd,
    env: {
      // Only pass the specific env vars that this MCP connection needs
      ...(config.env || {}),
    },
    // inherit stderr to make debugging easier locally
    stderr: "inherit",
  });

  const client = createMCPClient({
    transport,
    name: `prompttoissuev3-mcp-client-${config.id}`,
    onUncaughtError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line no-console
      console.error(`[MCP][${config.name}] Uncaught client error:`, msg);
    },
  });

  // Clean up on process exit
  const resolvedClient = await client;
  const close = async () => {
    try {
      await resolvedClient.close();
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

  return client;
}

async function ensureMcpClient(connectionId: string): Promise<MCPClient> {
  if (mcpClients.has(connectionId)) {
    return mcpClients.get(connectionId) as Promise<MCPClient>;
  }

  if (!clientMcpEnabled) {
    throw new Error("MCP is globally disabled");
  }

  const serverConnections = getServerMcpConnections();
  const config = serverConnections.find((c) => c.id === connectionId);
  if (!config) {
    throw new Error(`MCP connection not found: ${connectionId}`);
  }

  const clientPromise = createMcpClient(config);
  mcpClients.set(connectionId, clientPromise);
  return clientPromise;
}

export async function getMcpTools(
  connectionId: string,
): Promise<ToolSet | null> {
  try {
    const client = await ensureMcpClient(connectionId);
    const tools = await client.tools();
    try {
      const names = Object.keys(tools ?? {});
      // eslint-disable-next-line no-console
      console.info(`[MCP][${connectionId}] Tools available:`, names);
    } catch {
      // ignore logging failures
    }
    return tools;
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      `[MCP][${connectionId}] MCP tools not available — proceeding without tools`,
    );
    return null;
  }
}

export async function getAllMcpTools(): Promise<ToolSet> {
  if (!clientMcpEnabled) return {};

  const serverConnections = getServerMcpConnections();
  const allTools: ToolSet = {};

  for (const connection of serverConnections) {
    if (!connection.enabled) continue;

    try {
      const tools = await getMcpTools(connection.id);
      if (tools) {
        Object.assign(allTools, tools);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`Failed to load tools from ${connection.name}:`, error);
    }
  }

  return allTools;
}

export async function getMcpToolCatalog(
  connectionId: string,
): Promise<Array<{ name: string; parameters: string[]; schema?: unknown }>> {
  try {
    const client = await ensureMcpClient(connectionId);
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

export async function getGitLabMcpToolCatalog(): Promise<
  Array<{ name: string; parameters: string[]; schema?: unknown }>
> {
  return getMcpToolCatalog("gitlab");
}
