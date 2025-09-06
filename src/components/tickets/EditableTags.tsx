"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "../Button";

export function EditableTags({
  title,
  values,
  onChange,
}: {
  title: string;
  values: string[];
  onChange: (labels: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const remove = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const add = () => {
    const v = input.trim();
    if (!v) return;
    onChange([...values, v]);
    setInput("");
  };
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-[color:var(--color-muted)]">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {values.map((l, i) => (
          <span
            key={`${l}-${i}`}
            className="inline-flex items-center gap-1 px-2 h-7 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-xs"
          >
            {l}
            <button
              onClick={() => remove(i)}
              className="ml-1 text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add label"
        />
        <Button onClick={add} variant="solid" size="sm">
          <Plus size={14} />
          <span className="ml-1">Add</span>
        </Button>
      </div>
    </div>
  );
}

export default EditableTags;
