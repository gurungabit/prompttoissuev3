import type { NextRequest } from "next/server";
import {
  generateState,
  getGitLabAuthUrl,
  validateGitLabOAuthConfig,
} from "../../../../../lib/gitlab-oauth";

export async function GET(_request: NextRequest) {
  try {
    // Check if GitLab OAuth is properly configured
    if (!validateGitLabOAuthConfig()) {
      console.error(
        "GitLab OAuth not configured - missing environment variables",
      );
      return new Response("GitLab OAuth not configured", { status: 500 });
    }

    // Generate state for CSRF protection
    const state = generateState();

    // Get GitLab OAuth URL
    const authUrl = getGitLabAuthUrl(state);

    console.log("Redirecting to GitLab OAuth:", authUrl);

    // Redirect to GitLab OAuth
    return Response.redirect(authUrl, 302);
  } catch (error) {
    console.error("GitLab OAuth login error:", error);
    return new Response(
      `GitLab OAuth error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 },
    );
  }
}
