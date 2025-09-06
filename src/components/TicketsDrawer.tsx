"use client";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Ticket, TicketsPayload } from "../lib/tickets";

export function TicketsDrawer({
  messageId,
  onClose,
}: {
  messageId: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<TicketsPayload | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/message?id=${encodeURIComponent(messageId)}`,
        );
        if (res.ok) {
          const j = await res.json();
          if (mounted) setData((j.ticketsJson ?? null) as TicketsPayload | null);
        }
      } catch {}
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [messageId]);

  const addTicket = () => {
    setData((prev) => {
      const base: TicketsPayload =
        prev ?? {
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

  const save = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await fetch(`/api/messages?id=${encodeURIComponent(messageId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticketsJson: data }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-[61] w-full max-w-xl bg-[color:var(--color-surface)] border-l border-[color:var(--color-border)] shadow-[var(--shadow-elev-3)] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[color:var(--color-border)]">
          <div className="text-sm font-semibold">Tickets</div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[color:var(--color-card)] cursor-pointer"
            aria-label="Close tickets"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-[color:var(--color-muted)] text-sm">
              Loading…
            </div>
          ) : !data ? (
            <div className="text-[color:var(--color-muted)] text-sm">
              No tickets.
            </div>
          ) : (
            data.tickets.map((t, idx) => (
              <div
                key={t.id}
                className="rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] p-3 space-y-2"
              >
                <input
                  className="w-full bg-transparent text-[color:var(--color-text)] text-sm font-medium border-b border-[color:var(--color-border)] pb-1"
                  value={t.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setData(
                      (prev) =>
                        prev && {
                          ...prev,
                          tickets: prev.tickets.map((x) =>
                            x.id === t.id ? { ...x, title } : x,
                          ),
                        },
                    );
                  }}
                />
                <textarea
                  className="w-full bg-transparent text-[color:var(--color-text)] text-sm border border-[color:var(--color-border)] rounded p-2"
                  rows={3}
                  placeholder="Description"
                  value={t.description}
                  onChange={(e) => {
                    const description = e.target.value;
                    setData(
                      (prev) =>
                        prev && {
                          ...prev,
                          tickets: prev.tickets.map((x) =>
                            x.id === t.id ? { ...x, description } : x,
                          ),
                        },
                    );
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2"
                    value={t.priority}
                    onChange={(e) => {
                      const priority = e.target.value as Ticket["priority"];
                      setData(
                        (prev) =>
                          prev && {
                            ...prev,
                            tickets: prev.tickets.map((x) =>
                              x.id === t.id ? { ...x, priority } : x,
                            ),
                          },
                      );
                    }}
                  >
                    {(["low", "medium", "high", "critical"] as const).map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
                  </select>
                  <select
                    className="h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] px-2"
                    value={t.type}
                    onChange={(e) => {
                      const type = e.target.value as Ticket["type"];
                      setData(
                        (prev) =>
                          prev && {
                            ...prev,
                            tickets: prev.tickets.map((x) =>
                              x.id === t.id ? { ...x, type } : x,
                            ),
                          },
                      );
                    }}
                  >
                    {(["feature", "bug", "task", "improvement"] as const).map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <EditableList
                  title="Acceptance Criteria"
                  items={t.acceptanceCriteria.map((a) => ({
                    id: a.id,
                    text: a.description,
                  }))}
                  onChange={(items) =>
                    setData(
                      (prev) =>
                        prev && {
                          ...prev,
                          tickets: prev.tickets.map((x) =>
                            x.id === t.id
                              ? {
                                  ...x,
                                  acceptanceCriteria: items.map((i) => ({
                                    id: i.id,
                                    description: i.text,
                                    completed: false,
                                  })),
                                }
                              : x,
                          ),
                        },
                    )
                  }
                />
                <EditableList
                  title="Tasks"
                  items={t.tasks.map((a) => ({
                    id: a.id,
                    text: a.description,
                  }))}
                  onChange={(items) =>
                    setData(
                      (prev) =>
                        prev && {
                          ...prev,
                          tickets: prev.tickets.map((x) =>
                            x.id === t.id
                              ? {
                                  ...x,
                                  tasks: items.map((i) => ({
                                    id: i.id,
                                    description: i.text,
                                    completed: false,
                                  })),
                                }
                              : x,
                          ),
                        },
                    )
                  }
                />
                <EditableTags
                  title="Labels"
                  values={t.labels}
                  onChange={(labels) =>
                    setData(
                      (prev) =>
                        prev && {
                          ...prev,
                          tickets: prev.tickets.map((x) =>
                            x.id === t.id ? { ...x, labels } : x,
                          ),
                        },
                    )
                  }
                />
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-[color:var(--color-border)]">
          <button
            onClick={addTicket}
            className="px-3 h-9 rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-surface)] cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add ticket
          </button>
          <button
            onClick={save}
            className="px-3 h-9 rounded bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] hover:opacity-90 cursor-pointer inline-flex items-center gap-2"
            disabled={saving}
          >
            <Save size={16} /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </aside>
    </>
  );
}

function EditableList({
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
        <div key={it.id} className="flex items-center gap-2">
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
        </div>
      ))}
      <button
        onClick={add}
        className="px-2 h-8 rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-surface)] text-xs cursor-pointer"
      >
        Add
      </button>
    </div>
  );
}

function EditableTags({
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
        <button
          onClick={add}
          className="px-2 h-8 rounded border border-[color:var(--color-border)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-surface)] text-xs cursor-pointer"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export default TicketsDrawer;
