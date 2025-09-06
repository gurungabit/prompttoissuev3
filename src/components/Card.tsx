import type { HTMLAttributes, PropsWithChildren } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement> & PropsWithChildren;

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-card)] shadow-[var(--shadow-elev-1)] ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
