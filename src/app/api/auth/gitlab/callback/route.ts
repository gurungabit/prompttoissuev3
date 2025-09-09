import type { NextRequest } from "next/server";
import { exchangeCodeForToken } from "../../../../../lib/gitlab-oauth";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors
    if (error) {
      const errorDescription = url.searchParams.get("error_description");
      console.error("GitLab OAuth error:", error, errorDescription);
      return Response.redirect(
        `${url.origin}/?error=oauth_error&message=${encodeURIComponent(errorDescription || error)}`,
        302,
      );
    }

    if (!code) {
      return Response.redirect(`${url.origin}/?error=missing_code`, 302);
    }

    // Exchange code for token
    const tokenResponse = await exchangeCodeForToken(code, state || undefined);

    // Store token in URL fragment for client-side handling
    // This is a simple approach - for production, consider using secure cookies
    const redirectUrl = new URL(url.origin);
    redirectUrl.hash = `gitlab_token=${tokenResponse.access_token}&token_type=${tokenResponse.token_type}&expires_in=${tokenResponse.expires_in || ""}&scope=${encodeURIComponent(tokenResponse.scope)}`;

    return Response.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error("GitLab OAuth callback error:", error);
    const url = new URL(request.url);
    return Response.redirect(
      `${url.origin}/?error=token_exchange_failed&message=${encodeURIComponent(error instanceof Error ? error.message : "Unknown error")}`,
      302,
    );
  }
}
