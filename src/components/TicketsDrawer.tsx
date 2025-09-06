"use client";
import { Plus, Save, X, Pencil, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { TicketsPayload } from "../lib/tickets";
import { ConfirmModal } from "./ConfirmModal";
import { ReadOnlyTicketCard } from "./tickets/ReadOnlyTicketCard";
import { EditableTicketCard } from "./tickets/EditableTicketCard";
import { Button } from "./Button";

export function TicketsDrawer({
  initialTickets,
  onSave,
  onClose,
}: {
  initialTickets: TicketsPayload | null | undefined;
  onSave?: (tickets: TicketsPayload) => Promise<void> | void;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TicketsPayload | null>(
    (initialTickets ?? null) as TicketsPayload | null,
  );
  const [draft, setDraft] = useState<TicketsPayload | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null);

  useEffect(() => {
    setData((initialTickets ?? null) as TicketsPayload | null);
  }, [initialTickets]);

  const addTicket = () => {
    setDraft((prev) => {
      const base: TicketsPayload =
        prev ??
        data ?? {
          type: "tickets",
          tickets: [],
          reasoning: "",
          needsClarification: false,
          clarificationQuestions: [],
        };
      return {
        ...base,
        tickets: [
          ...base.tickets,
          {
            id: `t_${Math.random().toString(36).slice(2, 8)}`,
            title: "Untitled",
            description: "",
            acceptanceCriteria: [],
            tasks: [],
            labels: [],
            priority: "medium",
            type: "task",
          },
        ],
      };
    });
  };

  const deleteTicket = (ticketId: string) => {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            tickets: prev.tickets.filter((t) => t.id !== ticketId),
          }
        : prev,
    );
  };

  const save = async () => {
    const toSave = draft ?? data;
    if (!toSave) return;
    setSaving(true);
    try {
      if (onSave) await onSave(toSave);
      setData(toSave);
      setIsEditing(false);
      setDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraft(null);
  };

  const startEdit = () => {
    setIsEditing(true);
    setDraft((prev) => {
      if (prev) return prev; // retain if already staged
      const base = data ?? {
        type: "tickets",
        tickets: [],
        reasoning: "",
        needsClarification: false,
        clarificationQuestions: [],
      } satisfies TicketsPayload;
      // Prefer structuredClone if available at runtime; fallback to JSON clone
      try {
        const maybeClone: unknown = (globalThis as unknown as {
          structuredClone?: (x: unknown) => unknown;
        }).structuredClone;
        if (typeof maybeClone === "function") {
          return maybeClone(base) as TicketsPayload;
        }
        return JSON.parse(JSON.stringify(base)) as TicketsPayload;
      } catch {
        return JSON.parse(JSON.stringify(base)) as TicketsPayload;
      }
    });
  };

  const ticketsToRender = useMemo(() => {
    return isEditing ? draft : data;
  }, [isEditing, draft, data]);

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[61] w-full max-w-xl bg-[color:var(--color-surface)] border-l border-[color:var(--color-border)] shadow-[var(--shadow-elev-3)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
          <div className="text-sm font-semibold">Tickets</div>
          <div className="flex items-center gap-2">
            {!loading && (
              <Button
                onClick={isEditing ? cancelEdit : startEdit}
                variant="outline"
                size="sm"
                className={
                  isEditing
                    ? "text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                    : undefined
                }
                aria-label={isEditing ? "Cancel editing" : "Edit tickets"}
              >
                {isEditing ? <Undo2 size={14} /> : <Pencil size={14} />}
                <span className="ml-1">{isEditing ? "Cancel" : "Edit"}</span>
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[color:var(--color-card)] cursor-pointer"
              aria-label="Close tickets"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-[color:var(--color-muted)] text-sm">Loading…</div>
          ) : !ticketsToRender ? (
            <div className="text-[color:var(--color-muted)] text-sm">
              No tickets.
            </div>
          ) : ticketsToRender.tickets.length === 0 && !isEditing ? (
            <div className="text-[color:var(--color-muted)] text-sm">
              No tickets. Click Edit to add.
            </div>
          ) : (
            ticketsToRender.tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 space-y-3"
              >
                {isEditing ? (
                  <EditableTicketCard
                    ticket={t}
                    onChange={(next) =>
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              tickets: prev.tickets.map((x) =>
                                x.id === t.id ? next : x,
                              ),
                            }
                          : prev,
                      )
                    }
                    onDelete={() => setDeleteTicketId(t.id)}
                  />
                ) : (
                  <ReadOnlyTicketCard ticket={t} />
                )}
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--color-border)]">
          {isEditing ? (
            <>
              <Button onClick={addTicket} variant="solid" size="md">
                <Plus size={16} />
                <span className="ml-2">Add ticket</span>
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  onClick={cancelEdit}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                >
                  <Undo2 size={16} />
                  <span className="ml-2">Cancel</span>
                </Button>
                <Button onClick={save} variant="solid" disabled={saving}>
                  <Save size={16} />
                  <span className="ml-2">{saving ? "Saving…" : "Save"}</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <Button onClick={startEdit} variant="outline">
                <Pencil size={16} />
                <span className="ml-2">Edit</span>
              </Button>
            </div>
          )}
        </div>
      </aside>

      <ConfirmModal
        isOpen={Boolean(deleteTicketId)}
        onClose={() => setDeleteTicketId(null)}
        onConfirm={() => {
          if (deleteTicketId) deleteTicket(deleteTicketId);
          setDeleteTicketId(null);
        }}
        title="Delete ticket?"
        message="This will permanently remove the ticket from the draft."
        confirmText="Delete"
        cancelText="Cancel"
        dangerous
      />
    </>
  );
}
export default TicketsDrawer;
