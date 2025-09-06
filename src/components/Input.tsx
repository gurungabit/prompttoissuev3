"use client";
import { forwardRef, type InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  density?: "compact" | "comfortable";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, density = "comfortable", ...props },
  ref,
) {
  const size = density === "compact" ? "h-8 px-2 text-sm" : "h-10 px-3";
  return (
    <input
      ref={ref}
      className={`w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] focus-visible:outline-2 ${size} ${className ?? ""}`}
      {...props}
    />
  );
});
