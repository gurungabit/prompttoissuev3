"use client";
import { useEffect, useState } from "react";
import type { McpServerConfig } from "../../mcp/config";

export function useMcpConnection(server: McpServerConfig | null) {
  const [status, setStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  useEffect(() => {
    if (!server || !server.enabled) return;
    setStatus("connecting");
    const timer = setTimeout(() => setStatus("connected"), 200);
    return () => clearTimeout(timer);
  }, [server?.id, server?.enabled]);
  return { status };
}
