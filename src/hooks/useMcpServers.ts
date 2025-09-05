"use client";
import { useMemo, useState } from "react";
import { McpConfig, type McpServerConfig } from "../../mcp/config";

export function useMcpServers(initial?: unknown) {
  const [config, setConfig] = useState(() => McpConfig.parse(initial ?? { featureEnabled: false, servers: [] }));

  function addServer(s: McpServerConfig) {
    setConfig((c) => ({ ...c, servers: [...c.servers, s] }));
  }
  function removeServer(id: string) {
    setConfig((c) => ({ ...c, servers: c.servers.filter((s) => s.id !== id) }));
  }
  function toggleFeature(enabled: boolean) {
    setConfig((c) => ({ ...c, featureEnabled: enabled }));
  }

  return { config, addServer, removeServer, toggleFeature };
}

