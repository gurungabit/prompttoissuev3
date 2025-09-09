"use client";
import { ExternalLink, Key, Shield, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useGitLabOAuth } from "../../hooks/useGitLabOAuth";
import { notifyGitLabConnectionChange } from "../../hooks/useStoredGitLab";
import {
  clearGitLabConnection,
  type GitLabConnection,
  type GitLabConnectionType,
  getGitLabConnection,
  isTokenValid,
  saveGitLabConnection,
} from "../../lib/storage";
import { Button } from "../Button";
import { ConfirmModal } from "../ConfirmModal";
import { useToast } from "../Toast";

export function ConnectorsTab() {
  const [connection, setConnection] = useState<GitLabConnection | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [connectionType, setConnectionType] =
    useState<GitLabConnectionType>("token");
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Toast notifications
  const toast = useToast();

  // GitLab OAuth integration
  const {
    startGitLabOAuth,
    disconnectGitLab,
    isLoading: oauthLoading,
    error: oauthError,
    clearError,
  } = useGitLabOAuth();

  // Load connection on mount
  useEffect(() => {
    const stored = getGitLabConnection();
    setConnection(stored);
    if (stored?.token) {
      setTokenInput(stored.token);
      setConnectionType(stored.type);
    }
  }, []);

  // Clear OAuth errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleSaveToken = () => {
    if (!tokenInput.trim()) {
      toast.show("Please enter a valid GitLab token", "error");
      return;
    }

    const newConnection: GitLabConnection = {
      type: connectionType,
      token: tokenInput.trim(),
    };

    if (saveGitLabConnection(newConnection)) {
      setConnection(newConnection);
      setIsEditing(false);
      notifyGitLabConnectionChange();
      toast.show("GitLab connection saved successfully!", "success");
    } else {
      toast.show("Failed to save connection. Please try again.", "error");
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const handleConfirmDisconnect = () => {
    if (connection?.type === "OAuth") {
      // For OAuth connections, use the OAuth disconnect method
      if (disconnectGitLab()) {
        setConnection(null);
        setTokenInput("");
        setIsEditing(false);
        toast.show("GitLab connection removed successfully!", "success");
      } else {
        toast.show("Failed to remove connection. Please try again.", "error");
      }
    } else {
      // For token connections, just clear storage
      if (clearGitLabConnection()) {
        setConnection(null);
        setTokenInput("");
        setIsEditing(false);
        notifyGitLabConnectionChange();
        toast.show("GitLab connection removed successfully!", "success");
      } else {
        toast.show("Failed to remove connection. Please try again.", "error");
      }
    }
  };

  const handleStartOAuth = () => {
    clearError();
    startGitLabOAuth();
  };

  const isConnected = connection && isTokenValid(connection);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[color:var(--color-text)] mb-2">
          GitLab Integration
        </h3>
        <p className="text-sm text-[color:var(--color-muted)]">
          Connect to GitLab to create and manage issues directly from your
          tickets.
        </p>
      </div>

      {/* Connection Status */}
      <div className="p-4 bg-[color:var(--color-card)] border border-[color:var(--color-border)] rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <div>
              <div className="font-medium text-[color:var(--color-text)]">
                {isConnected ? "Connected to GitLab" : "Not Connected"}
              </div>
              <div className="text-sm text-[color:var(--color-muted)]">
                {isConnected
                  ? `Connected via ${connection.type === "OAuth" ? "OAuth OAuth" : "Personal Token"}`
                  : "Choose a connection method below"}
              </div>
            </div>
          </div>
          {isConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDisconnect}
              className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
            >
              <Trash2 size={14} />
              Disconnect
            </Button>
          )}
        </div>
      </div>

      {/* Connection Options */}
      {(!isConnected || isEditing) && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-[color:var(--color-text)] mb-3">
              Connection Method
            </h4>

            {/* Connection Type Selector */}
            <div className="flex items-center gap-1 p-1 bg-[color:var(--color-card)] rounded-lg mb-4">
              <button
                onClick={() => setConnectionType("token")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  connectionType === "token"
                    ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                    : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
                }`}
              >
                <Key size={16} />
                GitLab Token
              </button>
              <button
                onClick={() => setConnectionType("OAuth")}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all cursor-pointer ${
                  connectionType === "OAuth"
                    ? "bg-[color:var(--color-primary)] text-white shadow-sm"
                    : "text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]"
                }`}
              >
                <Shield size={16} />
                GitLab OAuth
              </button>
            </div>

            {/* Token Input */}
            {connectionType === "token" && (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="gitlab-token-input"
                    className="block text-sm font-medium text-[color:var(--color-text)] mb-2"
                  >
                    GitLab Personal Access Token
                  </label>
                  <input
                    id="gitlab-token-input"
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="glpat-xxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 border border-[color:var(--color-border)] rounded-lg bg-[color:var(--color-surface)] text-[color:var(--color-text)] placeholder-[color:var(--color-muted)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)] focus:border-transparent"
                  />
                  <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                    Create a personal access token in GitLab with{" "}
                    <code className="px-1 py-0.5 bg-[color:var(--color-card)] rounded">
                      api
                    </code>{" "}
                    scope.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveToken} variant="solid">
                    Save Connection
                  </Button>
                  {isEditing && (
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        setTokenInput(connection?.token || "");
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                  <a
                    href="https://gitlab.com/-/profile/personal_access_tokens"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[color:var(--color-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Create Token <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            )}

            {/* GitLab OAuth */}
            {connectionType === "OAuth" && (
              <div className="space-y-4">
                {oauthError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      OAuth Error
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-300">
                      {oauthError}
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Secure OAuth Flow
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    Connect securely using GitLab OAuth. This will redirect you
                    to GitLab to authorize the connection and automatically
                    store your access token.
                  </div>
                </div>

                <Button
                  onClick={handleStartOAuth}
                  variant="solid"
                  disabled={oauthLoading}
                >
                  <Shield size={16} />
                  {oauthLoading ? "Connecting..." : "Connect with GitLab OAuth"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Connection */}
      {isConnected && !isEditing && (
        <div className="pt-4 border-t border-[color:var(--color-border)]">
          <Button onClick={() => setIsEditing(true)} variant="outline">
            <Key size={16} />
            Update Connection
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleConfirmDisconnect}
        title="Disconnect GitLab"
        message="Are you sure you want to disconnect from GitLab? You'll need to reconnect to continue using GitLab integration features."
        confirmText="Disconnect"
        cancelText="Cancel"
        dangerous
      />
    </div>
  );
}
