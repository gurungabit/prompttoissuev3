"use client";
import { ChevronDown, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSettings } from "../context/Settings";
import { toSpecifier } from "../lib/llm-config";

type ModelOption = {
  id: string; // provider:model
  label: string;
  provider: "google"; // constrained for now
  model: string;
};

// For now, expose a single Gemini option as requested
const OPTIONS: readonly ModelOption[] = [
  {
    id: toSpecifier("google", "gemini-2.0-flash"),
    label: "Gemini 2.0 Flash",
    provider: "google",
    model: "gemini-2.0-flash",
  },
] as const;

export function ModelPicker() {
  const { spec, setSpec } = useSettings();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(
    () => OPTIONS.find((o) => o.id === spec) ?? OPTIONS[0],
    [spec],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return OPTIONS;
    return OPTIONS.filter(
      (o) =>
        o.label.toLowerCase().includes(q) || o.model.toLowerCase().includes(q),
    );
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClickAway = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", onKey);
      document.addEventListener("mousedown", onClickAway);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickAway);
    };
  }, [open]);

  const handleSelect = (opt: ModelOption) => {
    setSpec(opt.id);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)] px-3 h-9 text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)] hover:opacity-90 cursor-pointer focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Select model"
      >
        <Sparkles size={16} />
        <span className="text-sm font-medium">{selected.label}</span>
        <ChevronDown size={16} className="opacity-70" />
      </button>

      {/* Dropdown (opens upward) */}
      {open && (
        <div
          className="absolute bottom-full mb-2 left-0 z-50 w-[320px] rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-[var(--shadow-elev-3)]"
          role="listbox"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[color:var(--color-border)]">
            <Search size={16} className="text-[color:var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models..."
              className="flex-1 bg-transparent text-sm text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] focus:outline-none"
            />
          </div>
          <div className="max-h-[50vh] overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-sm text-[color:var(--color-muted)]">
                No models
              </div>
            )}
            {filtered.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-[color:var(--color-card)] cursor-pointer ${
                  opt.id === selected.id
                    ? "text-[color:var(--color-primary)]"
                    : "text-[color:var(--color-text)]"
                }`}
                role="option"
                aria-selected={opt.id === selected.id}
              >
                <Sparkles size={14} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelPicker;
