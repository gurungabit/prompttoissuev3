import { z } from "zod";

// Per-model settings
export const ModelEntrySchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  enabled: z.boolean().default(true),
  toolCalling: z.boolean().default(true),
});
export type ModelEntry = z.infer<typeof ModelEntrySchema>;

export const PROVIDERS = {
  google: {
    label: "Google",
    models: [
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash",
        enabled: true,
        toolCalling: false,
      },
    ],
  },
  openai: {
    label: "OpenAI",
    models: [
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini",
        enabled: false,
        toolCalling: true,
      },
      { id: "gpt-4o", label: "GPT-4o", enabled: false, toolCalling: true },
    ],
  },
  aide: {
    label: "AIDE",
    models: [
      {
        id: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
        label: "Claude 3.7 Sonnet (AIDE)",
        enabled: true,
        toolCalling: false,
      },
      {
        id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
        label: "Claude 4 Sonnet (AIDE)",
        enabled: true,
        toolCalling: false,
      },
      {
        id: "us.anthropic.claude-opus-4-20250514-v1:0",
        label: "Claude 4 Opus (AIDE)",
        enabled: true,
        toolCalling: false,
      },
      {
        id: "gpt-4o",
        label: "GPT-4o (AIDE)",
        enabled: true,
        toolCalling: false,
      },
      {
        id: "gpt-4o-mini",
        label: "GPT-4o mini (AIDE)",
        enabled: true,
        toolCalling: false,
      },
    ],
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export function toSpecifier(provider: ProviderId, model: string) {
  return `${provider}:${model}`;
}

export function parseSpecifier(spec: string | null | undefined): {
  provider: ProviderId;
  model: string;
} {
  if (!spec) {
    const fallback = DEFAULT_SPEC;
    const j = fallback.indexOf(":");
    return {
      provider: fallback.slice(0, j) as ProviderId,
      model: fallback.slice(j + 1),
    };
  }
  const i = spec.indexOf(":");
  if (i === -1) {
    const fallback = DEFAULT_SPEC;
    const j = fallback.indexOf(":");
    return { provider: fallback.slice(0, j) as ProviderId, model: spec }; // backwards compat
  }
  const provider = spec.slice(0, i) as ProviderId;
  const model = spec.slice(i + 1);
  if (provider in PROVIDERS) return { provider, model };
  const fallback = DEFAULT_SPEC;
  const j = fallback.indexOf(":");
  return { provider: fallback.slice(0, j) as ProviderId, model };
}

export function firstEnabledModelSpec(): string {
  for (const pid of Object.keys(PROVIDERS) as ProviderId[]) {
    const prov = PROVIDERS[pid];
    const first = (prov.models as readonly ModelEntry[]).find((m) => m.enabled);
    if (first) return toSpecifier(pid, first.id);
  }
  // Fallback to the original default if none are enabled
  return toSpecifier("google", "gemini-2.0-flash");
}

export const DEFAULT_SPEC = firstEnabledModelSpec();

export const LlmConfigSchema = z.object({
  defaultSpec: z.string(),
  providers: z.record(
    z.string(),
    z.object({ label: z.string(), models: z.array(ModelEntrySchema) }),
  ),
});

export const LLM_CONFIG = LlmConfigSchema.parse({
  defaultSpec: DEFAULT_SPEC,
  providers: PROVIDERS,
});

export type LlmConfig = z.infer<typeof LlmConfigSchema>;

export function isKnownProvider(p: string): p is ProviderId {
  return Object.hasOwn(PROVIDERS, p);
}

export function isSupportedModel(spec: string | null | undefined): boolean {
  const { provider, model } = parseSpecifier(spec ?? DEFAULT_SPEC);
  const cfg = PROVIDERS[provider];
  if (!cfg) return false;
  const entry = (cfg.models as readonly ModelEntry[]).find(
    (m) => m.id === model,
  );
  return !!entry && entry.enabled === true;
}

export function providerLabel(provider: ProviderId): string {
  return PROVIDERS[provider].label;
}

export function getModelEntry(
  spec: string | null | undefined,
): (ModelEntry & { provider: ProviderId }) | null {
  const { provider, model } = parseSpecifier(spec ?? DEFAULT_SPEC);
  const cfg = PROVIDERS[provider];
  if (!cfg) return null;
  const entry = (cfg.models as readonly ModelEntry[]).find(
    (m) => m.id === model,
  );
  return entry ? { ...entry, provider } : null;
}

export function isToolCallingEnabled(spec: string | null | undefined): boolean {
  const entry = getModelEntry(spec ?? DEFAULT_SPEC);
  return entry ? entry.toolCalling === true : true; // default to true if unknown
}
