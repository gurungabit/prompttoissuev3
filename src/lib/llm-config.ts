import { z } from "zod";

export const PROVIDERS = {
  google: {
    label: "Google",
    models: ["gemini-2.0-flash"],
  },
  openai: {
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o"],
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
  if (!spec) return { provider: "google", model: "gemini-2.0-flash" };
  const i = spec.indexOf(":");
  if (i === -1) return { provider: "google", model: spec }; // backwards compat
  const provider = spec.slice(0, i) as ProviderId;
  const model = spec.slice(i + 1);
  return { provider: provider in PROVIDERS ? provider : "google", model };
}

export const DEFAULT_SPEC = toSpecifier("google", "gemini-2.0-flash");

export const LlmConfigSchema = z.object({
  defaultSpec: z.string(),
  providers: z.record(
    z.string(),
    z.object({ label: z.string(), models: z.array(z.string()) }),
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
  return (cfg.models as readonly string[]).includes(model as string);
}

export function providerLabel(provider: ProviderId): string {
  return PROVIDERS[provider].label;
}
