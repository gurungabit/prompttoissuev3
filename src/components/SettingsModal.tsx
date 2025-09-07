"use client";
import { Cog, X } from "lucide-react";
import { useState } from "react";
import { getMcpSettings, updateMcpSettings } from "../lib/client/mcp-client";
import type { McpSettings } from "../lib/client/mcp-types";
import { Button } from "./Button";
import { Card } from "./Card";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open settings"
        className="h-10 w-10 grid place-items-center rounded-lg border-none bg-transparent text-[color:var(--color-text)] hover:bg-[color:var(--color-card)] hover:opacity-90 cursor-pointer appearance-none focus:outline-none focus-visible:outline-none focus:ring-0"
        onClick={() => setOpen(true)}
      >
        <Cog size={18} />
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<McpSettings>(() => getMcpSettings());

  const handleSave = () => {
    updateMcpSettings(settings);
    onClose();
  };

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 cursor-pointer"
        aria-label="Close settings modal"
        tabIndex={0}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        style={{ all: "unset" }}
      />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <Card
          className="w-full max-w-2xl shadow-[var(--shadow-elev-2)]"
          role="dialog"
          aria-modal
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[color:var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-surface)] border border-[color:var(--color-border)]">
                <Cog size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-[color:var(--color-text)]">
                  Settings
                </div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  Configure MCP connections and integrations
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded hover:bg-[color:var(--color-surface)] cursor-pointer"
              aria-label="Close settings"
            >
              <X size={16} />
            </button>
          </div>

          {/* MCP Settings */}
          <div className="p-6 space-y-6">
            {/* Global MCP Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-[color:var(--color-text)]">
                  Enable MCP
                </div>
                <div className="text-xs text-[color:var(--color-muted)]">
                  Model Context Protocol integrations for enhanced AI
                  capabilities. Server-side MCP connections are configured via
                  environment variables.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      enabled: e.target.checked,
                    }))
                  }
                />
                <div className="w-11 h-6 bg-[color:var(--color-surface)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[color:var(--color-primary)]"></div>
              </label>
            </div>

            {/* Information */}
            {/* {settings.enabled && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  MCP Configuration
                </div>
                <div className="text-xs text-blue-700">
                  MCP connections are configured server-side via environment
                  variables. Currently supported: GitLab MCP (set
                  MCP_GITLAB_ENABLED=true, GITLAB_TOKEN, etc.)
                </div>
              </div>
            )} */}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-[color:var(--color-border)]">
            <Button size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" variant="solid" onClick={handleSave}>
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Placeholder: no additional content for now
