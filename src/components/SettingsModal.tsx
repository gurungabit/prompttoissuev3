"use client";
import { useState } from "react";
import { X, Cog } from "lucide-react";
import { Card } from "./Card";
import { Button } from "./Button";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
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
  const handleSave = () => onClose();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 cursor-pointer" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4">
        <Card className="w-full max-w-2xl shadow-[var(--shadow-elev-2)]" role="dialog" aria-modal>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[color:var(--color-border)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[color:var(--color-surface)] border border-[color:var(--color-border)]">
                <Cog size={18} />
              </span>
              <div>
                <div className="text-sm font-semibold text-[color:var(--color-text)]">Settings</div>
                <div className="text-xs text-[color:var(--color-muted)]">Configure AI providers and models</div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded hover:bg-[color:var(--color-surface)] cursor-pointer" aria-label="Close settings">
              <X size={16} />
            </button>
          </div>

          {/* Tabs removed by request */}

          {/* Content intentionally left empty for future settings */}
          <div className="p-6 text-sm text-[color:var(--color-muted)]">No settings yet.</div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-[color:var(--color-border)]">
            <Button size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" variant="solid" onClick={handleSave}>Save Changes</Button>
          </div>
        </Card>
      </div>
    </>
  );
}

// Placeholder: no additional content for now
