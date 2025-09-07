"use client";

export type Tone = "default" | "success" | "warn" | "danger" | "info";

export function Badge({
  children,
  tone = "default",
}: {
  children: string;
  tone?: Tone;
}) {
  const toneClasses: Record<Tone, string> = {
    default:
      "bg-[color:var(--color-surface)] text-[color:var(--color-text)] border-[color:var(--color-border)]",
    success:
      "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    danger: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    info: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  } as const;
  return (
    <span
      className={`inline-flex items-center px-2 h-6 rounded-full border text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

export default Badge;
