import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
  LanguageModelV2FunctionTool,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
  ProviderV2,
} from "@ai-sdk/provider";
import { generateId, withoutTrailingSlash } from "@ai-sdk/provider-utils";

interface AideProviderSettings {
  /**
   * Base URL for AIDE API calls
   */
  baseURL?: string;

  /**
   * API key for authentication (required)
   */
  apiKey: string;

  /**
   * Use Case ID for AIDE API (required)
   */
  useCaseId: string;

  /**
   * SOLMA ID for log metadata (required)
   */
  solmaId: string;

  /**
   * Custom headers for requests
   */
  headers?: Record<string, string>;

  /**
   * Generation ID function
   */
  generateId?: () => string;
}

interface AideChatSettings {
  /**
   * Apply guardrail (defaults to true)
   */
  applyGuardrail?: boolean;

  /**
   * Scrub input for sensitive data (defaults to true)
   */
  scrubInput?: boolean;

  /**
   * Fail on scrub (defaults to false)
   */
  failOnScrub?: boolean;

  /**
   * Provider model configuration
   */
  modelProvider?: "aws" | "azure";
}

interface AideChatConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string>;
  generateId: () => string;
  solmaId: string;
}

interface AideRequestBody {
  aide: {
    apply_guardrail?: boolean;
    scrub_input?: boolean;
    fail_on_scrub?: boolean;
  };
  gaas: {
    guardrailsEnabled: boolean;
    scrubInput: boolean;
    scrubbingTimeoutSeconds: number;
    pathToPrompt: string;
    logMetadata: {
      solmaId: string;
    };
  };
  aws?: {
    bedrock: {
      invoke: {
        modelId: string;
        body: {
          anthropic_version: string;
          max_tokens: number;
          messages: Array<{
            role: string;
            content: Array<{ type: string; text: string }>;
          }>;
          temperature?: number;
          top_p?: number;
          tools?: Array<{
            name: string;
            description?: string;
            input_schema: Record<string, unknown>;
          }>;
          tool_choice?: { type: "auto" | "any" | "tool"; name?: string };
        };
      };
    };
  };
  azure?: {
    openai: {
      apiVersion: string;
      chatCompletions: {
        create: {
          model: string;
          messages: Array<{
            role: string;
            content: string;
            tool_calls?: Array<{
              id: string;
              type: "function";
              function: { name: string; arguments: string };
            }>;
          }>;
          temperature?: number;
          max_tokens?: number;
          tools?: Array<{
            type: "function";
            function: {
              name: string;
              description?: string;
              parameters: Record<string, unknown>;
            };
          }>;
          tool_choice?:
            | "auto"
            | "none"
            | "required"
            | { type: "function"; function: { name: string } };
        };
      };
    };
  };
}

interface AideResponse {
  aide: {
    request_id: string;
    filters: {
      scrub?: {
        executed: boolean;
        violation: boolean;
        details: { scrubbed: string[] };
      };
      guardrail?: {
        executed: boolean;
        violation: boolean;
        details: Record<string, unknown>;
      };
    };
  };
  gaas?: {
    scrubbingRuleViolation: boolean;
  };
  aws?: {
    id: string;
    type: string;
    role: string;
    model: string;
    content: Array<{
      type: string;
      text?: string;
      id?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
    stop_reason: string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  azure?: {
    id: string;
    choices: Array<{
      finish_reason: string;
      index: number;
      message: {
        content: string;
        role: string;
        tool_calls?: Array<{
          id: string;
          type: "function";
          function: {
            name: string;
            arguments: string;
          };
        }>;
      };
    }>;
    usage: {
      completion_tokens: number;
      prompt_tokens: number;
      total_tokens: number;
    };
    model: string;
  };
}

class AideChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = "v2" as const;
  readonly provider: string;
  readonly modelId: string;
  readonly settings: AideChatSettings;
  readonly config: AideChatConfig;

  constructor(
    modelId: string,
    settings: AideChatSettings,
    config: AideChatConfig,
  ) {
    this.provider = config.provider;
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }

  private convertToolsToAws(tools: LanguageModelV2FunctionTool[]) {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));
  }

  private convertToolsToAzure(tools: LanguageModelV2FunctionTool[]) {
    return tools.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }));
  }

  private convertToolChoiceToAws(toolChoice: any) {
    if (!toolChoice) return undefined;
    if (typeof toolChoice === "object") {
      if (toolChoice.type === "auto") return { type: "auto" as const };
      if (toolChoice.type === "required") return { type: "any" as const };
      if (toolChoice.type === "none") return undefined;
      if (toolChoice.type === "tool") {
        return { type: "tool" as const, name: toolChoice.toolName };
      }
    }
    return { type: "auto" as const };
  }

  private convertToolChoiceToAzure(toolChoice: any) {
    if (!toolChoice) return "auto";
    if (typeof toolChoice === "object") {
      if (toolChoice.type === "auto") return "auto";
      if (toolChoice.type === "required") return "required";
      if (toolChoice.type === "none") return "none";
      if (toolChoice.type === "tool") {
        return {
          type: "function" as const,
          function: { name: toolChoice.toolName },
        };
      }
    }
    return "auto";
  }

  private getArgs(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    // Convert AI SDK prompt to AIDE format
    const messages = this.convertToAideMessages(options.prompt);

    // Determine provider type based on model
    const isAzureModel = this.modelId.includes("gpt-");
    const providerType =
      this.settings.modelProvider || (isAzureModel ? "azure" : "aws");

    // Build AIDE request body
    const body: AideRequestBody = {
      aide: {
        apply_guardrail: this.settings.applyGuardrail ?? true,
        scrub_input: this.settings.scrubInput ?? true,
        fail_on_scrub: this.settings.failOnScrub ?? false,
      },
      gaas: {
        guardrailsEnabled: false, // Use AIDE config instead
        scrubInput: false, // Use AIDE config instead
        scrubbingTimeoutSeconds: 8,
        pathToPrompt: isAzureModel
          ? "azure.openai.chatCompletions.create.messages[*].content"
          : "aws.bedrock.invoke.body.messages[*].content[*].text",
        logMetadata: {
          solmaId: this.config.solmaId,
        },
      },
    };

    if (providerType === "azure") {
      const azureBody: any = {
        model: this.modelId,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content
            .filter((c) => c.type === "text")
            .map((c) => (c as { text: string }).text)
            .join(""),
        })),
        temperature: options.temperature,
        max_tokens: options.maxOutputTokens,
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        azureBody.tools = this.convertToolsToAzure(
          options.tools as LanguageModelV2FunctionTool[],
        );
        azureBody.tool_choice = this.convertToolChoiceToAzure(
          options.toolChoice,
        );
      }

      body.azure = {
        openai: {
          apiVersion: "2024-10-21",
          chatCompletions: {
            create: azureBody,
          },
        },
      };
    } else {
      const awsBody: any = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: options.maxOutputTokens || 1024,
        messages: messages,
        temperature: options.temperature,
        top_p: options.topP,
      };

      // Add tools if provided
      if (options.tools && options.tools.length > 0) {
        awsBody.tools = this.convertToolsToAws(
          options.tools as LanguageModelV2FunctionTool[],
        );
        awsBody.tool_choice = this.convertToolChoiceToAws(options.toolChoice);
      }

      body.aws = {
        bedrock: {
          invoke: {
            modelId: this.modelId,
            body: awsBody,
          },
        },
      };
    }

    return { args: body, warnings };
  }

  private convertToAideMessages(prompt: LanguageModelV2Prompt) {
    return prompt.map((message) => {
      switch (message.role) {
        case "system":
          return {
            role: "system" as const,
            content: [{ type: "text", text: message.content }],
          };
        case "user":
          return {
            role: "user" as const,
            content: message.content
              .filter((part) => part.type === "text")
              .map((part) => ({
                type: "text" as const,
                text: (part as { text: string }).text,
              })),
          };
        case "assistant": {
          const assistantContent: Array<{
            type: string;
            text?: string;
            id?: string;
            name?: string;
            input?: any;
          }> = [];

          for (const part of message.content) {
            if (part.type === "text") {
              assistantContent.push({
                type: "text" as const,
                text: part.text,
              });
            } else if (
              part.type === "tool-call" &&
              "toolCallId" in part &&
              "toolName" in part &&
              "input" in part
            ) {
              const toolPart = part as any;
              assistantContent.push({
                type: "tool_use" as const,
                id: toolPart.toolCallId,
                name: toolPart.toolName,
                input:
                  typeof toolPart.input === "string"
                    ? JSON.parse(toolPart.input)
                    : toolPart.input,
              });
            }
          }

          return {
            role: "assistant" as const,
            content: assistantContent,
          };
        }
        case "tool":
          return {
            role: "user" as const,
            content: message.content.map((part) => {
              const toolPart = part as any;
              return {
                type: "tool_result" as const,
                tool_use_id: toolPart.toolCallId,
                content:
                  typeof toolPart.result === "string"
                    ? toolPart.result
                    : JSON.stringify(toolPart.result),
                is_error: toolPart.isError || false,
              };
            }),
          };
        default:
          throw new Error(`Unsupported message role: ${(message as any).role}`);
      }
    });
  }

  private mapFinishReason(finishReason: string): LanguageModelV2FinishReason {
    switch (finishReason) {
      case "stop":
      case "end_turn":
        return "stop";
      case "length":
      case "max_tokens":
        return "length";
      case "content_filter":
        return "content-filter";
      case "tool_calls":
      case "tool_use":
        return "tool-calls";
      default:
        return "other";
    }
  }

  async doGenerate(options: LanguageModelV2CallOptions) {
    const { args, warnings } = this.getArgs(options);

    const response = await fetch(`${this.config.baseURL}/generate`, {
      method: "POST",
      headers: {
        ...this.config.headers(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: options.abortSignal,
    });

    if (!response.ok) {
      throw new Error(
        `AIDE API call failed: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as AideResponse;

    // Extract content based on provider type
    const content: LanguageModelV2Content[] = [];

    if (data.aws) {
      // AWS Bedrock response
      for (const contentItem of data.aws.content) {
        if (contentItem.type === "text" && contentItem.text) {
          content.push({
            type: "text",
            text: contentItem.text,
          });
        } else if (
          contentItem.type === "tool_use" &&
          contentItem.id &&
          contentItem.name
        ) {
          content.push({
            type: "tool-call",
            toolCallId: contentItem.id,
            toolName: contentItem.name,
            input: JSON.stringify(contentItem.input || {}),
          });
        }
      }

      return {
        content,
        finishReason: this.mapFinishReason(data.aws.stop_reason),
        usage: {
          inputTokens: data.aws.usage.input_tokens,
          outputTokens: data.aws.usage.output_tokens,
          totalTokens:
            data.aws.usage.input_tokens + data.aws.usage.output_tokens,
        },
        request: { body: args },
        response: { body: data },
        warnings,
      };
    }

    if (data.azure) {
      // Azure OpenAI response
      const choice = data.azure.choices[0];

      if (choice.message.content) {
        content.push({
          type: "text",
          text: choice.message.content,
        });
      }

      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          content.push({
            type: "tool-call",
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            input: toolCall.function.arguments,
          });
        }
      }

      return {
        content,
        finishReason: this.mapFinishReason(choice.finish_reason),
        usage: {
          inputTokens: data.azure.usage.prompt_tokens,
          outputTokens: data.azure.usage.completion_tokens,
          totalTokens: data.azure.usage.total_tokens,
        },
        request: { body: args },
        response: { body: data },
        warnings,
      };
    }

    throw new Error("No valid response from AIDE API");
  }

  async doStream(options: LanguageModelV2CallOptions): Promise<{
    stream: ReadableStream<LanguageModelV2StreamPart>;
    warnings: LanguageModelV2CallWarning[];
  }> {
    // AIDE API doesn't support streaming, so we'll convert to a stream
    const result = await this.doGenerate(options);
    const generateId = this.config.generateId;

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start(controller) {
        controller.enqueue({ type: "stream-start", warnings: result.warnings });

        // Stream each content part
        for (const content of result.content) {
          if (content.type === "text") {
            controller.enqueue({
              type: "text-delta",
              id: generateId(),
              delta: content.text,
            });
          } else if (content.type === "tool-call") {
            const toolCall = content as any;
            controller.enqueue({
              type: "tool-call",
              toolCallId: toolCall.toolCallId,
              toolName: toolCall.toolName,
              input: toolCall.input,
            });
          }
        }

        controller.enqueue({
          type: "finish",
          finishReason: result.finishReason,
          usage: result.usage,
        });

        controller.close();
      },
    });

    return { stream, warnings: result.warnings };
  }

  get supportedUrls() {
    return {};
  }
}

interface AideProvider extends ProviderV2 {
  (modelId: string, settings?: AideChatSettings): AideChatLanguageModel;
  languageModel(
    modelId: string,
    settings?: AideChatSettings,
  ): AideChatLanguageModel;
}

function createAide(options: AideProviderSettings): AideProvider {
  const createChatModel = (modelId: string, settings: AideChatSettings = {}) =>
    new AideChatLanguageModel(modelId, settings, {
      provider: "aide",
      baseURL:
        withoutTrailingSlash(options.baseURL) ??
        "https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm",
      headers: () => ({
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        UseCaseID: options.useCaseId,
        ...options.headers,
      }),
      generateId: options.generateId ?? generateId,
      solmaId: options.solmaId,
    });

  const provider = function (modelId: string, settings?: AideChatSettings) {
    if (new.target) {
      throw new Error(
        "The AIDE model factory function cannot be called with the new keyword.",
      );
    }

    return createChatModel(modelId, settings);
  };

  provider.languageModel = createChatModel;
  provider.textEmbeddingModel = () => {
    throw new Error("AIDE provider does not support text embedding models");
  };
  provider.imageModel = () => {
    throw new Error("AIDE provider does not support image models");
  };

  return provider as AideProvider;
}

export { createAide };
export type { AideProviderSettings, AideChatSettings };
