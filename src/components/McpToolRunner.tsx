"use client";
import { useState } from "react";
import { z } from "zod";
import type { McpServerConfig } from "../../mcp/config";
import { useMcpTool } from "../hooks/useMcpTool";
import { Button } from "./Button";
import { Card } from "./Card";
import { Input } from "./Input";

const InputSchema = z.object({ text: z.string().min(1) });
const OutputSchema = z.object({
  ok: z.boolean(),
  tool: z.string(),
  server: z.string(),
  input: z.any(),
});

export function McpToolRunner({
  server,
  enabled,
}: {
  server: McpServerConfig | null;
  enabled?: boolean;
}) {
  const { run, data, error, loading } = useMcpTool(
    server,
    "echo",
    InputSchema,
    OutputSchema,
  );
  const [text, setText] = useState("");
  if (!enabled) return null;
  return (
    <Card className="p-3">
      <div className="text-sm font-medium mb-2">MCP Tool Runner</div>
      <form
        className="flex items-center gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          await run({ text });
        }}
      >
        <Input
          placeholder="Echo input"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={loading} variant="solid">
          Run
        </Button>
      </form>
      {error && <div className="mt-2 text-sm text-red-500">{error}</div>}
      {data && (
        <pre className="mt-2 text-xs text-[color:var(--color-muted)] whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </Card>
  );
}
