"use client";
import type { Ticket } from "../../lib/tickets";
import Badge from "./Badge";

export function ReadOnlyTicketCard({ ticket }: { ticket: Ticket }) {
  const priorityTone: Record<
    Ticket["priority"],
    "default" | "warn" | "danger" | "info" | "success"
  > = {
    low: "success",
    medium: "info",
    high: "warn",
    critical: "danger",
  };
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-[color:var(--color-text)]">
            {ticket.title || "Untitled"}
          </div>
          {ticket.description && (
            <p className="mt-1 text-sm text-[color:var(--color-muted)] whitespace-pre-wrap">
              {ticket.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
          <Badge>{ticket.type}</Badge>
        </div>
      </div>
      {ticket.acceptanceCriteria.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-[color:var(--color-muted)]">
            Acceptance Criteria
          </div>
          <ul className="list-disc list-inside space-y-1">
            {ticket.acceptanceCriteria.map((a) => (
              <li key={a.id} className="text-sm text-[color:var(--color-text)]">
                {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ticket.tasks.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-[color:var(--color-muted)]">
            Tasks
          </div>
          <ul className="list-disc list-inside space-y-1">
            {ticket.tasks.map((a) => (
              <li key={a.id} className="text-sm text-[color:var(--color-text)]">
                {a.description}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ticket.labels.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs font-medium text-[color:var(--color-muted)]">
            Labels
          </div>
          <div className="flex flex-wrap gap-2">
            {ticket.labels.map((l) => (
              <span
                key={`${l}`}
                className="inline-flex items-center gap-1 px-2 h-7 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-xs"
              >
                {l}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ReadOnlyTicketCard;
