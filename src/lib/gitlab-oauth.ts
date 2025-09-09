// Server-side GitLab OAuth utilities

// GitLab OAuth configuration
export const GITLAB_OAUTH_CONFIG = {
  clientId: process.env.GITLAB_OAUTH_CLIENT_ID || "",
  clientSecret: process.env.GITLAB_OAUTH_CLIENT_SECRET || "",
  redirectUri:
    process.env.GITLAB_OAUTH_REDIRECT_URI ||
    "http://localhost:3000/api/auth/gitlab/callback",
  gitlabHost: process.env.GITLAB_HOST || "https://gitlab.com",
  scopes: "api read_user read_api read_repository write_repository",
};

// Generate OAuth authorization URL
export function getGitLabAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: GITLAB_OAUTH_CONFIG.clientId,
    redirect_uri: GITLAB_OAUTH_CONFIG.redirectUri,
    response_type: "code",
    scope: GITLAB_OAUTH_CONFIG.scopes,
    ...(state && { state }),
  });

  return `${GITLAB_OAUTH_CONFIG.gitlabHost}/oauth/authorize?${params.toString()}`;
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  code: string,
  _state?: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope: string;
}> {
  const tokenUrl = `${GITLAB_OAUTH_CONFIG.gitlabHost}/oauth/token`;

  const body = new URLSearchParams({
    client_id: GITLAB_OAUTH_CONFIG.clientId,
    client_secret: GITLAB_OAUTH_CONFIG.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: GITLAB_OAUTH_CONFIG.redirectUri,
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(
      `GitLab OAuth token exchange failed: ${response.status} ${errorData}`,
    );
  }

  return await response.json();
}

// Validate GitLab OAuth configuration
export function validateGitLabOAuthConfig(): boolean {
  return !!(
    GITLAB_OAUTH_CONFIG.clientId &&
    GITLAB_OAUTH_CONFIG.clientSecret &&
    GITLAB_OAUTH_CONFIG.redirectUri
  );
}

// Generate state parameter for CSRF protection
export function generateState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
