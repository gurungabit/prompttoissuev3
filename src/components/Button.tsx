"use client";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

function classes(variant: Variant, size: Size) {
  const base =
    "inline-flex items-center justify-center rounded-md focus-visible:outline-2 transition-shadow cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";
  const v =
    variant === "solid"
      ? "bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] shadow-[var(--shadow-elev-1)] hover:shadow-[var(--shadow-elev-2)]"
      : variant === "outline"
        ? "border border-[color:var(--color-border)] text-[color:var(--color-text)] bg-[color:var(--color-card)] hover:bg-[color:var(--color-surface)]"
        : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]";
  const s =
    size === "sm"
      ? "h-8 px-3 text-sm"
      : size === "lg"
        ? "h-12 px-5"
        : "h-10 px-4";
  return `${base} ${v} ${s}`;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { className, variant = "outline", size = "md", ...props },
    ref,
  ) {
    return (
      <button
        ref={ref}
        className={`${classes(variant, size)} ${className ?? ""}`}
        {...props}
      />
    );
  },
);
