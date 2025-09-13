import { env } from "../env";
import {
  DEFAULT_SPEC,
  PROVIDERS,
  type ProviderId,
  parseSpecifier,
} from "../llm-config";

export type ValidatedSpec = {
  spec: string;
  provider: ProviderId;
  model: string;
};

export function validateSpec(
  specInput: string | undefined,
):
  | { ok: true; value: ValidatedSpec }
  | { ok: false; error: string; status: number } {
  const spec = specInput ?? DEFAULT_SPEC;
  const { provider, model } = parseSpecifier(spec);
  const provCfg = PROVIDERS[provider];
  const supported = provCfg
    ? (provCfg.models as ReadonlyArray<{ id: string; enabled: boolean }>).find(
        (m) => m.id === model && m.enabled,
      )
    : undefined;

  if (!supported) {
    return {
      ok: false,
      error: `Unsupported model '${spec}'.`,
      status: 400,
    };
  }

  if (provider === "google" && !env.GOOGLE_API_KEY) {
    return {
      ok: false,
      error: "Missing GOOGLE_API_KEY for Google provider.",
      status: 400,
    };
  }
  if (provider === "openai" && !env.OPENAI_API_KEY) {
    return {
      ok: false,
      error: "Missing OPENAI_API_KEY for OpenAI provider.",
      status: 400,
    };
  }

  return { ok: true, value: { spec, provider, model } };
}
