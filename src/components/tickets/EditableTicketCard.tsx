"use client";
import { Trash2 } from "lucide-react";
import type { Ticket } from "../../lib/tickets";
import EditableList from "./EditableList";
import EditableTags from "./EditableTags";

export function EditableTicketCard({
  ticket,
  onChange,
  onDelete,
}: {
  ticket: Ticket;
  onChange: (t: Ticket) => void;
  onDelete: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-[color:var(--color-text)] text-sm font-medium border-b border-[color:var(--color-border)] pb-1"
          value={ticket.title}
          onChange={(e) => onChange({ ...ticket, title: e.target.value })}
          placeholder="Title"
        />
        <button
          onClick={onDelete}
          className="p-1 rounded hover:bg-[color:var(--color-card)] text-[color:var(--color-muted)] hover:text-red-600 dark:hover:text-red-400 cursor-pointer"
          aria-label="Delete ticket"
          title="Delete ticket"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <textarea
        className="w-full bg-transparent text-[color:var(--color-text)] text-sm border border-[color:var(--color-border)] rounded p-2"
        rows={3}
        placeholder="Description"
        value={ticket.description}
        onChange={(e) => onChange({ ...ticket, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2 cursor-default"
          value={ticket.priority}
          onChange={(e) =>
            onChange({ ...ticket, priority: e.target.value as Ticket["priority"] })
          }
        >
          {(["low", "medium", "high", "critical"] as const).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          className="h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2 cursor-default"
          value={ticket.type}
          onChange={(e) =>
            onChange({ ...ticket, type: e.target.value as Ticket["type"] })
          }
        >
          {(["feature", "bug", "task", "improvement"] as const).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <EditableList
        title="Acceptance Criteria"
        items={ticket.acceptanceCriteria.map((a) => ({
          id: a.id,
          text: a.description,
        }))}
        onChange={(items) =>
          onChange({
            ...ticket,
            acceptanceCriteria: items.map((i) => ({
              id: i.id,
              description: i.text,
              completed: false,
            })),
          })
        }
      />
      <EditableList
        title="Tasks"
        items={ticket.tasks.map((a) => ({
          id: a.id,
          text: a.description,
        }))}
        onChange={(items) =>
          onChange({
            ...ticket,
            tasks: items.map((i) => ({
              id: i.id,
              description: i.text,
              completed: false,
            })),
          })
        }
      />
      <EditableTags
        title="Labels"
        values={ticket.labels}
        onChange={(labels) => onChange({ ...ticket, labels })}
      />
    </div>
  );
}

export default EditableTicketCard;

