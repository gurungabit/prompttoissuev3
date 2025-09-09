"use client";
import { useEffect, useState } from "react";
import { getGitLabConnection, isTokenValid } from "../lib/storage";
import { useGitLab } from "./useGitLab";

/**
 * Hook that automatically uses GitLab connection from local storage
 */
export function useStoredGitLab() {
  const [storedToken, setStoredToken] = useState<string | undefined>(undefined);

  // Load token from storage on mount and when storage changes
  useEffect(() => {
    const loadToken = () => {
      const connection = getGitLabConnection();
      if (connection && isTokenValid(connection)) {
        setStoredToken(connection.token);
      } else {
        setStoredToken(undefined);
      }
    };

    // Load initial token
    loadToken();

    // Listen for storage changes (if user updates token in another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith("prompttoissue_gitlab_")) {
        loadToken();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab storage updates
    const handleCustomStorageChange = () => {
      loadToken();
    };
    window.addEventListener(
      "gitlabConnectionChange",
      handleCustomStorageChange,
    );

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "gitlabConnectionChange",
        handleCustomStorageChange,
      );
    };
  }, []);

  // Use the GitLab hook with the stored token
  return useGitLab({ token: storedToken });
}

// Helper function to notify about storage changes in the same tab
export function notifyGitLabConnectionChange() {
  window.dispatchEvent(new CustomEvent("gitlabConnectionChange"));
}
