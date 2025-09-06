"use client";
import { useState } from "react";
import { useMcpServers } from "../hooks/useMcpServers";
import { Button } from "./Button";
import { Card } from "./Card";
import { Input } from "./Input";

export function McpSettingsModal({
  initialOpen = false,
}: {
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  const { config, addServer, removeServer, toggleFeature } = useMcpServers();
  if (!config.featureEnabled) return null;
  return (
    <div>
      <Button size="sm" onClick={() => setOpen(true)}>
        MCP Settings
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal
          className="fixed inset-0 grid place-items-center bg-black/50 p-4"
        >
          <Card className="w-full max-w-lg p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">MCP Settings</h2>
              <Button size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-3 space-y-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={config.featureEnabled}
                  onChange={(e) => toggleFeature(e.target.checked)}
                />
                Enable MCP
              </label>
              <div className="space-y-2">
                {config.servers.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{s.name}</div>
                      <div className="truncate text-xs text-[color:var(--color-muted)]">
                        {s.endpoint}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => removeServer(s.id)}>
                      Remove
                    </Button>
                  </div>
                ))}
                <AddServer onAdd={addServer} />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AddServer({ onAdd }: { onAdd: (s: any) => void }) {
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const id = `srv_${Math.random().toString(36).slice(2, 8)}`;
        onAdd({ id, name: name || id, endpoint, enabled: true, tools: [] });
        setName("");
        setEndpoint("");
      }}
    >
      <Input
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="max-w-[140px]"
      />
      <Input
        placeholder="Endpoint"
        value={endpoint}
        onChange={(e) => setEndpoint(e.target.value)}
      />
      <Button type="submit" size="sm">
        Add
      </Button>
    </form>
  );
}
