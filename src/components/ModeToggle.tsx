"use client";
import React from "react";

export type Mode = "assistant" | "ticket";

export function ModeToggle({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const mode = value; // controlled
  const labelClass = mode === "assistant" ? "text-emerald-500" : "text-blue-500";
  // Compact, high-contrast: subtle colored track + white knob
  const trackColor = mode === "assistant" ? "bg-emerald-500/25" : "bg-blue-500/25";
  const knobColor = "bg-white";
  return (
    <div className="flex flex-col items-end select-none">
      <div className={`text-[11px] font-medium mb-0.5 leading-none ${labelClass}`}>
        {mode === "assistant" ? "Assistant" : "Tickets"}
      </div>
      <div className={`relative inline-flex items-center rounded-full ${trackColor} border border-[color:var(--color-border)] h-6 w-14 transition-colors cursor-pointer`}
           onClick={() => {
             const newMode = mode === "assistant" ? "ticket" : "assistant";
             onChange(newMode);
           }}> 
        <div
          className={`absolute top-1 left-1 h-4 w-6 rounded-full ${knobColor} shadow-sm transition-transform ${
            mode === "assistant" ? "translate-x-0" : "translate-x-7"
          } pointer-events-none`}
          aria-hidden
        />
      </div>
    </div>
  );
}

export default ModeToggle;
