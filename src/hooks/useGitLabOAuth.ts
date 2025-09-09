"use client";
import { useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import {
  clearGitLabConnection,
  type GitLabConnection,
  saveGitLabConnection,
} from "../lib/storage";
import { notifyGitLabConnectionChange } from "./useStoredGitLab";

export function useGitLabOAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Handle OAuth callback tokens from URL fragment
  useEffect(() => {
    const handleOAuthCallback = () => {
      const hash = window.location.hash;
      if (hash.includes("gitlab_token=")) {
        try {
          setIsLoading(true);

          // Parse token from URL fragment
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("gitlab_token");
          const tokenType = params.get("token_type");
          const expiresIn = params.get("expires_in");

          if (accessToken && tokenType === "Bearer") {
            // Save OAuth connection
            const connection: GitLabConnection = {
              type: "OAuth", // We'll reuse this type for OAuth
              token: accessToken,
              expiresAt: expiresIn
                ? Date.now() + parseInt(expiresIn, 10) * 1000
                : undefined,
            };

            if (saveGitLabConnection(connection)) {
              // Use setTimeout to ensure localStorage write is complete before notification
              setTimeout(() => {
                notifyGitLabConnectionChange();
              }, 0);

              setError(null);

              // Clean up URL
              window.history.replaceState(null, "", window.location.pathname);

              toast.show("GitLab OAuth connection successful!", "success");
            } else {
              setError("Failed to save GitLab connection");
            }
          } else {
            setError("Invalid token received from GitLab");
          }
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to process OAuth callback",
          );
          console.error("OAuth callback error:", err);
        } finally {
          setIsLoading(false);
        }
      }

      // Handle OAuth errors
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get("error");
      const errorMessage = urlParams.get("message");

      if (error) {
        setError(errorMessage || error);
        // Clean up URL
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    handleOAuthCallback();
  }, [toast.show]);

  const startGitLabOAuth = () => {
    setIsLoading(true);
    setError(null);
    // Redirect to our GitLab OAuth endpoint
    window.location.assign("/api/auth/gitlab/login");
  };

  const disconnectGitLab = () => {
    if (clearGitLabConnection()) {
      notifyGitLabConnectionChange();
      setError(null);
      return true;
    } else {
      setError("Failed to disconnect from GitLab");
      return false;
    }
  };

  return {
    startGitLabOAuth,
    disconnectGitLab,
    isLoading,
    error,
    clearError: () => setError(null),
  };
}
