"use client";
import { User, Users } from "lucide-react";

interface GitLabModeToggleProps {
  value: "same" | "multiple";
  onChange: (mode: "same" | "multiple") => void;
  disabled?: boolean;
}

export function GitLabModeToggle({
  value,
  onChange,
  disabled = false,
}: GitLabModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-[color:var(--color-card)] rounded-lg">
      <button
        onClick={() => onChange("same")}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          value === "same"
            ? "bg-[color:var(--color-primary)] text-white shadow-sm"
            : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <User size={16} />
        Same
      </button>
      <button
        onClick={() => onChange("multiple")}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
          value === "multiple"
            ? "bg-[color:var(--color-primary)] text-white shadow-sm"
            : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <Users size={16} />
        Multiple
      </button>
    </div>
  );
}
