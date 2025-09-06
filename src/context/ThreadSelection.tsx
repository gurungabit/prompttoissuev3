"use client";
import { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

const ThreadSelectionContext = createContext<Ctx | null>(null);

export function ThreadSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const value = useMemo(() => ({ selectedId, setSelectedId }), [selectedId]);
  return (
    <ThreadSelectionContext.Provider value={value}>
      {children}
    </ThreadSelectionContext.Provider>
  );
}

export function useThreadSelection() {
  const ctx = useContext(ThreadSelectionContext);
  if (!ctx)
    throw new Error(
      "useThreadSelection must be used within ThreadSelectionProvider",
    );
  return ctx;
}
