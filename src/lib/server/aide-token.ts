import { z } from "zod";

// Environment variables required to fetch an AIDE token via Entra ID
const EntraEnvSchema = z.object({
  AIDE_ENTRA_TENANT_ID: z.string().min(1, "AIDE_ENTRA_TENANT_ID is required"),
  AIDE_ENTRA_CLIENT_ID: z.string().min(1, "AIDE_ENTRA_CLIENT_ID is required"),
  AIDE_ENTRA_CLIENT_SECRET: z
    .string()
    .min(1, "AIDE_ENTRA_CLIENT_SECRET is required"),
  // Scope must be the fully-qualified resource + "/.default" for client credentials
  // e.g. "api://your-app-id/.default" or "https://graph.microsoft.com/.default"
  AIDE_ENTRA_SCOPE: z.string().min(1, "AIDE_ENTRA_SCOPE is required"),
});

export type EntraEnv = z.infer<typeof EntraEnvSchema>;

/**
 * Ensure that process.env.AIDE_API_KEY is available.
 * If not present, fetch it using Entra ID client credentials and set it.
 */
let cachedToken: string | null = null;
let tokenExpiresAt: number | null = null; // epoch ms
let inflight: Promise<string> | null = null;

function shouldRefresh(now = Date.now()): boolean {
  if (!cachedToken) return true;
  // If we don't know expiry (e.g., static token via env), assume it does not expire
  if (tokenExpiresAt == null) return false;
  // Refresh with 60s safety window
  return now >= tokenExpiresAt - 60_000;
}

export async function ensureAideApiKey(force = false): Promise<string> {
  // Seed cache from env if present
  if (!cachedToken && process.env.AIDE_API_KEY) {
    cachedToken = process.env.AIDE_API_KEY.trim();
    // Unknown expiry if provided externally
    tokenExpiresAt = tokenExpiresAt ?? null;
  }

  if (!force && !shouldRefresh()) {
    return cachedToken as string; // defined by guard above
  }

  const parsed = EntraEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // If Entra creds are not configured but we have some token, just return it.
    if (cachedToken) return cachedToken;
    const missing = parsed.error.errors.map((e) => e.path[0]).join(", ");
    throw new Error(
      `Missing Entra ID env vars for AIDE token: ${missing}. ` +
        `Please set AIDE_ENTRA_TENANT_ID, AIDE_ENTRA_CLIENT_ID, AIDE_ENTRA_CLIENT_SECRET, AIDE_ENTRA_SCOPE or provide AIDE_API_KEY.`,
    );
  }

  // Coalesce concurrent refreshes
  if (inflight) return inflight;

  inflight = (async () => {
    const {
      AIDE_ENTRA_TENANT_ID,
      AIDE_ENTRA_CLIENT_ID,
      AIDE_ENTRA_CLIENT_SECRET,
      AIDE_ENTRA_SCOPE,
    } = parsed.data;

    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(AIDE_ENTRA_TENANT_ID)}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AIDE_ENTRA_CLIENT_ID,
      client_secret: AIDE_ENTRA_CLIENT_SECRET,
      scope: AIDE_ENTRA_SCOPE,
    }).toString();

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "<no body>");
      throw new Error(
        `Failed to fetch AIDE_API_KEY from Entra ID: ${res.status} ${res.statusText} — ${text}`,
      );
    }

    const json = (await res.json()) as {
      token_type?: string;
      access_token?: string;
      expires_in?: number; // seconds
    };

    if (!json.access_token) {
      throw new Error("Entra ID token response missing access_token");
    }

    cachedToken = json.access_token;
    // Compute expiry with safety buffer
    const ttlSec = typeof json.expires_in === "number" ? json.expires_in : 3600;
    tokenExpiresAt = Date.now() + Math.max(0, ttlSec - 60) * 1000;
    process.env.AIDE_API_KEY = cachedToken;
    return cachedToken;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
