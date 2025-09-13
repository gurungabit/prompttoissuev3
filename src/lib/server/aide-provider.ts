import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2FinishReason,
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
          }>;
          temperature?: number;
          max_tokens?: number;
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
    content: Array<{ type: string; text: string }>;
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
      body.azure = {
        openai: {
          apiVersion: "2024-10-21",
          chatCompletions: {
            create: {
              model: this.modelId,
              messages: messages.map((msg) => ({
                role: msg.role,
                content: msg.content.map((c) => c.text).join(""),
              })),
              temperature: options.temperature,
              max_tokens: options.maxOutputTokens,
            },
          },
        },
      };
    } else {
      body.aws = {
        bedrock: {
          invoke: {
            modelId: this.modelId,
            body: {
              anthropic_version: "bedrock-2023-05-31",
              max_tokens: options.maxOutputTokens || 1024,
              messages: messages,
              temperature: options.temperature,
              top_p: options.topP,
            },
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
                text: part.text,
              })),
          };
        case "assistant":
          return {
            role: "assistant" as const,
            content: message.content
              .filter((part) => part.type === "text")
              .map((part) => ({
                type: "text" as const,
                text: part.text,
              })),
          };
        default:
          throw new Error(`Unsupported message role: ${message.role}`);
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
        if (contentItem.type === "text") {
          content.push({
            type: "text",
            text: contentItem.text,
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
      content.push({
        type: "text",
        text: choice.message.content,
      });

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
