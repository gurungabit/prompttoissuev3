"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  DEFAULT_SPEC,
  isSupportedModel,
  PROVIDERS,
  type ProviderId,
  parseSpecifier,
  toSpecifier,
} from "../lib/llm-config";

const STORAGE_KEY = "llm.defaultSpec";

const SettingsSchema = z.object({
  defaultSpec: z.string().default(DEFAULT_SPEC),
});
export type Settings = z.infer<typeof SettingsSchema>;

type SettingsContextValue = {
  spec: string; // provider:model
  setSpec: (spec: string) => void;
  provider: ProviderId;
  model: string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [spec, setSpecState] = useState<string>(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && isSupportedModel(raw)) return raw;
    } catch {}
    return DEFAULT_SPEC;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, spec);
    } catch {}
  }, [spec]);

  // Guard against unknown values written externally
  useEffect(() => {
    if (!isSupportedModel(spec)) setSpecState(DEFAULT_SPEC);
  }, [spec]);

  const { provider, model } = parseSpecifier(spec);

  const value = useMemo<SettingsContextValue>(
    () => ({
      spec,
      setSpec: (next) =>
        setSpecState(isSupportedModel(next) ? next : DEFAULT_SPEC),
      provider,
      model,
    }),
    [spec, provider, model],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}

export function listProviders(): Array<{
  id: ProviderId;
  label: string;
  models: readonly string[];
}> {
  return (Object.keys(PROVIDERS) as ProviderId[]).map((id) => ({
    id,
    label: PROVIDERS[id].label,
    models: PROVIDERS[id].models,
  }));
}
