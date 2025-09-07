"use client";
import type { McpSettings } from "./mcp-types";
import { defaultMcpSettings } from "./mcp-types";

// Client-side MCP settings management (in-memory for now)
let mcpSettings: McpSettings | null = null;

export function getMcpSettings(): McpSettings {
  if (!mcpSettings) {
    mcpSettings = { ...defaultMcpSettings };
  }
  return mcpSettings;
}

export function updateMcpSettings(newSettings: McpSettings): void {
  mcpSettings = newSettings;
  // TODO: Persist to localStorage or send to server
}
