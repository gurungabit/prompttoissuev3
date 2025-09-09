"use client";
import { useState } from "react";
import { getMcpSettings, updateMcpSettings } from "../../lib/client/mcp-client";
import type { McpSettings } from "../../lib/client/mcp-types";

export function MCPTab() {
  const [settings, setSettings] = useState<McpSettings>(() => getMcpSettings());

  const handleSettingsChange = (newSettings: McpSettings) => {
    setSettings(newSettings);
    updateMcpSettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
          Model Context Protocol
        </h3>
        <p className="text-sm text-[color:var(--color-muted)]">
          Configure MCP connections for enhanced AI capabilities through
          external tools and services.
        </p>
      </div>

      {/* Global MCP Toggle */}
      <div className="p-4 bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-[color:var(--color-text)]">
              Enable MCP
            </div>
            <div className="text-sm text-[color:var(--color-muted)]">
              Allow AI to use external tools and services through Model Context
              Protocol
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.enabled}
              onChange={(e) =>
                handleSettingsChange({
                  ...settings,
                  enabled: e.target.checked,
                })
              }
            />
            <div className="w-11 h-6 bg-[color:var(--color-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--color-primary)]"></div>
          </label>
        </div>
      </div>

      {/* Information Section */}
      {/* {settings.enabled && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Server-Side Configuration
            </div>
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <p>
                MCP servers are configured via environment variables on the server side:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">MCP_GITLAB_ENABLED=true</code> - Enable GitLab MCP server</li>
                <li><code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">GITLAB_TOKEN=...</code> - GitLab API token</li>
                <li><code className="px-1 bg-blue-100 dark:bg-blue-800 rounded">GITLAB_HOST=...</code> - GitLab instance URL (optional)</li>
              </ul>
            </div>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Available MCP Tools
            </div>
            <div className="text-xs text-green-700 dark:text-green-300">
              <p className="mb-2">When properly configured, MCP provides these tools:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>GitLab Integration:</strong> Search code, read files, analyze repositories</li>
                <li><strong>Project Analysis:</strong> Get repository overviews and collect review context</li>
                <li><strong>File Operations:</strong> Smart file reading and content analysis</li>
              </ul>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
}
