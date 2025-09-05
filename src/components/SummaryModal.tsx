"use client";
import { Button } from "./Button";
import { Card } from "./Card";

export function SummaryModal({ open, onClose, summary }: { open: boolean; onClose: () => void; summary: null | { narrative: string; highlights?: string[]; facts?: string[]; todos?: string[]; citations?: string[] } }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal className="fixed inset-0 grid place-items-center bg-black/50 p-4">
      <Card className="w-full max-w-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-medium">Thread Summary</h2>
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
        {!summary ? (
          <div className="text-sm text-[color:var(--color-muted)]">No summary available yet.</div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm whitespace-pre-wrap">{summary.narrative}</p>
            {summary.highlights && summary.highlights.length > 0 && (
              <Section title="Highlights" items={summary.highlights} />
            )}
            {summary.facts && summary.facts.length > 0 && <Section title="Facts" items={summary.facts} />}
            {summary.todos && summary.todos.length > 0 && <Section title="TODOs" items={summary.todos} />}
          </div>
        )}
      </Card>
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-medium mb-1">{title}</div>
      <ul className="list-disc pl-5 text-sm space-y-1">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

