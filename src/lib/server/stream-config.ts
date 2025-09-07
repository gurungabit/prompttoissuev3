import { type ModelMessage, stepCountIs } from "ai";
import { z } from "zod";
import { isSummaryQuery } from "./gitlab-parser";
import type { PrefetchResult } from "./prefetching";

export const streamOptionsSchema = z.object({
  allowPrefetch: z.boolean().optional(),
  enforceFirstToolCall: z.boolean().optional(),
});

export type StreamOptions = z.infer<typeof streamOptionsSchema>;

export function buildSystemMessages(
  toolHint?: string,
  rawText?: string,
  prefetchResult?: PrefetchResult,
): ModelMessage[] {
  const messages: ModelMessage[] = [];

  // Add tool hint if available
  if (toolHint) {
    messages.push({ role: "system" as const, content: toolHint });
  }

  // Add summary hint if this looks like a summary query
  const summaryHint = isSummaryQuery(rawText)
    ? `When tool results or prefetched context include JSON, do not paste the raw JSON in your reply.
Instead, write a concise natural-language summary using the data. Prefer short sections and bullet points (Overview, Languages, Key Files, Notable Findings). Avoid code fences for plain JSON. Include links only if helpful.`
    : undefined;

  if (summaryHint) {
    messages.push({ role: "system" as const, content: summaryHint });
  }

  // Add prefetched data
  if (prefetchResult?.prefetchedOverview) {
    messages.push({
      role: "system" as const,
      content: `GitLab repository overview (prefetched):\n\n${prefetchResult.prefetchedOverview}`,
    });
  }

  if (prefetchResult?.prefetchedListing) {
    messages.push({
      role: "system" as const,
      content: `GitLab subpath listing (prefetched):\n\n${prefetchResult.prefetchedListing}`,
    });
  }

  return messages;
}

export function buildStreamConfig(options?: StreamOptions) {
  return {
    // Allow up to 20 sequential steps (tool calls + responses)
    stopWhen: stepCountIs(20),

    // Optionally require a tool call on the first step (e.g., tickets mode with repo URL)
    prepareStep: options?.enforceFirstToolCall
      ? ({ stepNumber, steps }: { stepNumber: number; steps: unknown[] }) => {
          // Count total tool calls made so far
          const totalToolCalls = steps.reduce(
            (count: number, step) =>
              count +
              ((step as { toolCalls?: unknown[] }).toolCalls?.length ?? 0),
            0,
          );

          // eslint-disable-next-line no-console
          console.log("[AI] prepareStep called:", {
            stepNumber,
            enforceFirstToolCall: options.enforceFirstToolCall,
            totalToolCalls,
            stepsCount: steps.length,
          });

          // Force tool use on first step
          if (stepNumber === 0) {
            return { toolChoice: "required" as const };
          }

          // For early steps, require more tool calls if not enough research done
          if (stepNumber <= 4 && totalToolCalls < 5) {
            return { toolChoice: "required" as const };
          }

          return undefined;
        }
      : undefined,

    onStepFinish: async ({
      toolResults,
      toolCalls,
      finishReason,
    }: {
      toolResults?: unknown[];
      toolCalls?: unknown[];
      finishReason?: string;
    }) => {
      // eslint-disable-next-line no-console
      console.info(
        "[AI] Step finished",
        "toolResults:",
        toolResults?.length ?? 0,
        "toolCalls:",
        toolCalls?.length ?? 0,
        "finish:",
        finishReason,
      );

      // Debug: log tool call names and result sizes
      if (toolCalls && toolCalls.length > 0) {
        toolCalls.forEach((call, i) => {
          // eslint-disable-next-line no-console
          console.info(
            `[AI] Tool call ${i + 1}:`,
            (call as { toolName?: string }).toolName,
            JSON.stringify(call).slice(0, 200),
          );
        });
      }

      if (toolResults && toolResults.length > 0) {
        toolResults.forEach((result, i) => {
          try {
            const resultStr = JSON.stringify(result);
            // eslint-disable-next-line no-console
            console.info(
              `[AI] Tool result ${i + 1}:`,
              `(${resultStr.length} chars)`,
              `${resultStr.slice(0, 200)}...`,
            );
          } catch (_e) {
            // eslint-disable-next-line no-console
            console.info(
              `[AI] Tool result ${i + 1}:`,
              "failed to stringify",
              result,
            );
          }
        });
      }
    },

    onError: ({ error }: { error: unknown }) => {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error("[AI] streamText error:", msg);
    },

    // onChunk logging removed for performance
  };
}
