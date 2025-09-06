"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Toast = {
  id: string;
  message: string;
  variant?: "info" | "success" | "error";
};

type ToastContextValue = {
  show: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback(
    (message: string, variant: Toast["variant"] = "info") => {
      const id = `t_${Math.random().toString(36).slice(2, 9)}`;
      setToasts((t) => [...t, { id, message, variant }]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
    },
    [],
  );

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[100] flex justify-center sm:justify-end sm:pr-4">
      <div className="flex max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-[var(--shadow-elev-2)] backdrop-blur ${
              t.variant === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-200"
                : t.variant === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-[color:var(--color-border)] bg-[color:var(--color-card)] text-[color:var(--color-text)]"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
