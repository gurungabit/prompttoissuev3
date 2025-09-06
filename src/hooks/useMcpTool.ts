"use client";
import { useState } from "react";
import type { z } from "zod";
import { invokeTool } from "../../mcp/adapter";
import type { McpServerConfig } from "../../mcp/config";

export function useMcpTool<TIn extends z.ZodTypeAny, TOut extends z.ZodTypeAny>(
  server: McpServerConfig | null,
  tool: string,
  inputSchema: TIn,
  outputSchema: TOut,
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<z.infer<TOut> | null>(null);

  async function run(input: z.infer<TIn>) {
    if (!server) throw new Error("Server required");
    setLoading(true);
    setError(null);
    try {
      const res = await invokeTool({
        server,
        tool,
        input,
        inputSchema,
        outputSchema,
      });
      setData(res);
      return res;
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, data };
}
