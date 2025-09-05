import { z } from "zod";

export const McpToolParam = z.object({
  name: z.string(),
  schema: z.any(), // Placeholder; future: strict zod schemas per tool
});

export const McpServerConfig = z.object({
  id: z.string(),
  name: z.string(),
  endpoint: z.string().url(),
  apiKey: z.string().optional(),
  tools: z.array(McpToolParam).default([]),
  enabled: z.boolean().default(true),
});
export type McpServerConfig = z.infer<typeof McpServerConfig>;

export const McpConfig = z.object({
  featureEnabled: z.boolean().default(false),
  servers: z.array(McpServerConfig).default([]),
});
export type McpConfig = z.infer<typeof McpConfig>;

