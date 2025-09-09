"use client";

// Local storage keys
const STORAGE_KEYS = {
  GITLAB_TOKEN: "prompttoissue_gitlab_token",
  GITLAB_CONNECTION_TYPE: "prompttoissue_gitlab_connection_type",
  GITLAB_CONNECTION_DATA: "prompttoissue_gitlab_connection_data",
} as const;

export type GitLabConnectionType = "token" | "OAuth";

export interface GitLabConnection {
  type: GitLabConnectionType;
  token?: string;
  expiresAt?: number;
  // OAuth specific fields
  OAuthUserId?: string;
  refreshToken?: string;
}

// Safe localStorage access with SSR protection
function getStorageItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn("Failed to access localStorage:", error);
    return null;
  }
}

function setStorageItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("Failed to write to localStorage:", error);
    return false;
  }
}

function removeStorageItem(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn("Failed to remove from localStorage:", error);
    return false;
  }
}

// GitLab connection management
export function getGitLabConnection(): GitLabConnection | null {
  try {
    const connectionDataStr = getStorageItem(
      STORAGE_KEYS.GITLAB_CONNECTION_DATA,
    );
    if (connectionDataStr) {
      // New format - full connection object stored as JSON
      const connectionData = JSON.parse(connectionDataStr) as GitLabConnection;
      return connectionData;
    }

    // Fallback to old format for backward compatibility
    const connectionType = getStorageItem(
      STORAGE_KEYS.GITLAB_CONNECTION_TYPE,
    ) as GitLabConnectionType;
    const token = getStorageItem(STORAGE_KEYS.GITLAB_TOKEN);

    if (!connectionType) {
      return null;
    }

    const connection = {
      type: connectionType,
      token: token || undefined,
    };

    // Migrate to new format
    saveGitLabConnection(connection);
    return connection;
  } catch (error) {
    console.warn("Failed to parse connection data:", error);
    return null;
  }
}

export function saveGitLabConnection(connection: GitLabConnection): boolean {
  try {
    // Save the full connection object as JSON (new format)
    const connectionDataStr = JSON.stringify(connection);
    const success = setStorageItem(
      STORAGE_KEYS.GITLAB_CONNECTION_DATA,
      connectionDataStr,
    );

    if (success) {
      // Also maintain backward compatibility with old format
      setStorageItem(STORAGE_KEYS.GITLAB_CONNECTION_TYPE, connection.type);
      if (connection.token) {
        setStorageItem(STORAGE_KEYS.GITLAB_TOKEN, connection.token);
      } else {
        removeStorageItem(STORAGE_KEYS.GITLAB_TOKEN);
      }
    }

    return success;
  } catch (error) {
    console.warn("Failed to save connection data:", error);
    return false;
  }
}

export function clearGitLabConnection(): boolean {
  let success = true;
  success = removeStorageItem(STORAGE_KEYS.GITLAB_CONNECTION_DATA) && success;
  success = removeStorageItem(STORAGE_KEYS.GITLAB_CONNECTION_TYPE) && success;
  success = removeStorageItem(STORAGE_KEYS.GITLAB_TOKEN) && success;
  return success;
}

// Token validation
export function isTokenValid(connection: GitLabConnection | null): boolean {
  if (!connection?.token) return false;
  if (connection.expiresAt && Date.now() > connection.expiresAt) return false;
  return true;
}
