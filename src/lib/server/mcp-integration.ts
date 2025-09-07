import { z } from "zod";
import {
  getAllMcpTools,
  getGitLabMcpToolCatalog,
  setClientMcpEnabled,
} from "../../mcp/adapter";
import type { McpSettings } from "../client/mcp-types";

export const mcpToolsResultSchema = z.object({
  mcpTools: z.record(z.any()).nullable(),
  availableToolNames: z.array(z.string()),
  toolHint: z.string().optional(),
});

export type McpToolsResult = z.infer<typeof mcpToolsResultSchema>;

export async function setupMcpTools(
  mcpSettings?: McpSettings,
  projectIdHint?: string,
  refHint?: string,
): Promise<McpToolsResult> {
  // Update MCP enabled state if provided
  if (mcpSettings) {
    setClientMcpEnabled(mcpSettings.enabled);
  }

  // Try to load all MCP tools if enabled; fall back silently if not.
  const mcpTools = await getAllMcpTools().catch(() => ({}));
  const availableToolNames = Object.keys(mcpTools);

  if (availableToolNames.length > 0) {
    // eslint-disable-next-line no-console
    console.info("[MCP] Attaching tools to streamText:", availableToolNames);
  } else {
    // Check if MCP is disabled via settings
    const isDisabled = mcpSettings && !mcpSettings.enabled;
    // eslint-disable-next-line no-console
    console.info(
      isDisabled
        ? "[MCP] No tools attached (MCP disabled via settings)"
        : "[MCP] No tools attached (disabled or failed to load)",
    );
  }

  // Generate tool hint if tools are available
  let toolHint: string | undefined;
  const toolNames = mcpTools ? (Object.keys(mcpTools) as string[]) : [];

  if (toolNames.length > 0) {
    const dynamicCatalog = await getGitLabMcpToolCatalog().catch(() => []);
    if (dynamicCatalog.length > 0) {
      const toolsJson = {
        scope: "optional-tools",
        description:
          "These tools are available if relevant (e.g., repository analysis). Use them only when they help answer the user's request.",
        tools: dynamicCatalog.map((t) => ({
          name: t.name,
          parameters: t.parameters,
          schema: t.schema ?? undefined,
        })),
        note: "Call any tools needed to gather context. You may chain up to 20 tool calls.",
        ...(projectIdHint
          ? {
              defaultParams: {
                projectIdOrPath: projectIdHint,
                ...(refHint ? { ref: refHint } : {}),
              },
            }
          : {}),
      } as const;
      toolHint = `MCP Tools Catalog (JSON)\n${JSON.stringify(
        toolsJson,
        null,
        2,
      )}`;
    }
  }

  return {
    mcpTools: Object.keys(mcpTools).length > 0 ? mcpTools : null,
    availableToolNames,
    toolHint,
  };
}
