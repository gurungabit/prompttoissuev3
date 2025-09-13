import { type ModelMessage, streamText } from "ai";
import type { McpSettings } from "../client/mcp-types";
import { DEFAULT_SPEC, isToolCallingEnabled } from "../llm-config";
import {
  containsGitLabUrl,
  type GitLabInfo,
  parseGitLabInfo,
} from "./gitlab-parser";
import { setupMcpTools } from "./mcp-integration";
import {
  type McpToolsRecord,
  prefetchData,
  resolveProjectPathViaMcp,
} from "./prefetching";
import { createProvider } from "./providers";
import {
  buildStreamConfig,
  buildSystemMessages,
  type StreamOptions,
} from "./stream-config";

export const DEFAULT_MODEL = DEFAULT_SPEC;

export async function streamAssistant(
  messages: ModelMessage[],
  modelSpec: string = DEFAULT_SPEC,
  options?: StreamOptions & {
    mcpSettings?: McpSettings;
  },
) {
  // Provider instance (async: AIDE may fetch a token)
  const { provider, model } = await createProvider(modelSpec);

  // Extract user message and check for GitLab URLs
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const rawText =
    typeof lastUser?.content === "string" ? lastUser.content : undefined;

  let projectIdHint: string | undefined;
  let refHint: string | undefined;
  let gitLabInfo: GitLabInfo = {};

  if (rawText && containsGitLabUrl(rawText)) {
    gitLabInfo = parseGitLabInfo(rawText);
    projectIdHint = gitLabInfo.projectPath;
    refHint = gitLabInfo.ref;
  }

  // Check if tools are allowed for this model before setting up MCP
  const allowTools = isToolCallingEnabled(modelSpec);

  // Setup MCP tools only if tool calling is enabled for this model
  let mcpTools: Record<string, unknown> | null = null;
  let availableToolNames: string[] = [];
  let toolHint: string | undefined;
  if (allowTools) {
    const res = await setupMcpTools(
      options?.mcpSettings,
      projectIdHint,
      refHint,
    );
    mcpTools = res.mcpTools;
    availableToolNames = res.availableToolNames;
    toolHint = res.toolHint;
  }

  // Resolve project path if needed
  if ((options?.allowPrefetch ?? true) && projectIdHint && mcpTools) {
    projectIdHint = await resolveProjectPathViaMcp(
      projectIdHint,
      mcpTools as McpToolsRecord,
    );
  }

  // Prefetch data if allowed
  const prefetchResult =
    (options?.allowPrefetch ?? true)
      ? await prefetchData(
          projectIdHint,
          refHint,
          gitLabInfo,
          mcpTools as McpToolsRecord | null,
          availableToolNames,
          rawText,
        )
      : {};

  // Build system messages
  const systemMessages = buildSystemMessages(
    allowTools ? toolHint : undefined,
    rawText,
    prefetchResult,
  );
  const augmentedMessages = [...systemMessages, ...messages] as ModelMessage[];

  // Log strategy
  const activeTools = mcpTools ? Object.keys(mcpTools) : [];
  // eslint-disable-next-line no-console
  console.info(
    "[MCP] strategy:",
    options?.enforceFirstToolCall
      ? "forced first tool call"
      : "auto (no forced first tool)",
    "activeTools:",
    activeTools.length,
    projectIdHint ? `projectIdHint: ${projectIdHint}` : "",
    prefetchResult.prefetchedOverview ? "(prefetched overview)" : "",
    prefetchResult.prefetchedListing ? "(prefetched listing)" : "",
  );

  const result = await streamText({
    model: provider(model),
    messages: augmentedMessages,
    tools: allowTools ? (mcpTools as unknown) : undefined,
    ...buildStreamConfig({
      ...(options ?? {}),
      enforceFirstToolCall: allowTools ? options?.enforceFirstToolCall : false,
    }),
  } as unknown as Parameters<typeof streamText>[0]);

  return result;
}
