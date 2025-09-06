import type { z } from "zod";
import type { McpServerConfig } from "./config";

export type InvokeOptions<I extends z.ZodTypeAny, O extends z.ZodTypeAny> = {
  server: McpServerConfig;
  tool: string;
  input: z.infer<I>;
  inputSchema: I;
  outputSchema: O;
};

export async function invokeTool<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
>({ server, tool, input, inputSchema, outputSchema }: InvokeOptions<I, O>) {
  const valid = inputSchema.parse(input);
  // Placeholder adapter: echo back
  const result = { ok: true, tool, server: server.id, input: valid } as unknown;
  return outputSchema.parse(result);
}
