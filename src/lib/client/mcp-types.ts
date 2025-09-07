import { z } from "zod";

// Simple client-side MCP settings - just global enable/disable
export const McpSettingsSchema = z.object({
  enabled: z.boolean().default(true),
});

export type McpSettings = z.infer<typeof McpSettingsSchema>;

export const defaultMcpSettings: McpSettings = {
  enabled: true,
};
