"use client";
import { Cog, Plug, Server, X } from "lucide-react";
import { useState } from "react";
import { Button } from "./Button";
import { Card } from "./Card";
import { ConnectorsTab } from "./settings/ConnectorsTab";
import { MCPTab } from "./settings/MCPTab";

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
  const [activeTab, setActiveTab] = useState<"mcp" | "connectors">(
    "connectors",
  );

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
                  Configure connections and integrations
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

          {/* Tabs */}
          <div className="border-b border-[color:var(--color-border)]">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab("connectors")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "connectors"
                    ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
                    : "border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-border)]"
                }`}
              >
                <Plug size={16} />
                Connectors
              </button>
              <button
                onClick={() => setActiveTab("mcp")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                  activeTab === "mcp"
                    ? "border-[color:var(--color-primary)] text-[color:var(--color-primary)]"
                    : "border-transparent text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] hover:border-[color:var(--color-border)]"
                }`}
              >
                <Server size={16} />
                MCP
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "connectors" && <ConnectorsTab />}
            {activeTab === "mcp" && <MCPTab />}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-[color:var(--color-border)]">
            <Button size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Placeholder: no additional content for now
