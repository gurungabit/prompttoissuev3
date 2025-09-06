"use client";
import { X, Plus } from "lucide-react";
import { Button } from "../Button";

export function EditableList({
  title,
  items,
  onChange,
}: {
  title: string;
  items: { id: string; text: string }[];
  onChange: (items: { id: string; text: string }[]) => void;
}) {
  const add = () =>
    onChange([
      ...items,
      { id: `i_${Math.random().toString(36).slice(2, 8)}`, text: "" },
    ]);
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-[color:var(--color-muted)]">
        {title}
      </div>
      {items.map((it) => (
        <div key={it.id} className="flex items-center gap-2 group">
          <input
            className="flex-1 h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2"
            value={it.text}
            onChange={(e) =>
              onChange(
                items.map((x) =>
                  x.id === it.id ? { ...x, text: e.target.value } : x,
                ),
              )
            }
          />
          <button
            onClick={() => onChange(items.filter((x) => x.id !== it.id))}
            className="p-1 rounded hover:bg-[color:var(--color-card)] text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] cursor-pointer"
            aria-label="Remove"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <Button onClick={add} variant="solid" size="sm">
        <Plus size={14} />
        <span className="ml-1">Add</span>
      </Button>
    </div>
  );
}

export default EditableList;
