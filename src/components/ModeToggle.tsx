"use client";

export type Mode = "assistant" | "ticket";

export function ModeToggle({
  value,
  onChange,
}: {
  value: Mode;
  onChange: (m: Mode) => void;
}) {
  const mode = value; // controlled
  const isTickets = mode === "ticket";

  // Use theme tokens for color; assistant=green, tickets=primary
  const labelClass = isTickets
    ? "text-[color:var(--color-primary)]"
    : "text-[color:var(--color-success)]";

  return (
    <div className="flex flex-col items-end select-none">
      <div
        className={`text-[11px] font-medium mb-1 leading-none ${labelClass}`}
      >
        {isTickets ? "Tickets" : "Assistant"}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isTickets}
        aria-label="Toggle mode"
        onClick={() => onChange(isTickets ? "assistant" : "ticket")}
        className={`relative inline-flex items-center h-6 w-14 rounded-full transition-colors cursor-pointer ring-1 ring-[color:var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-ring)] ${
          isTickets
            ? "bg-[color:var(--color-primary)]/25"
            : "bg-[color:var(--color-success)]/25"
        }`}
      >
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white dark:bg-[color:var(--color-card)] shadow transition-transform ${
            isTickets ? "translate-x-8" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export default ModeToggle;
