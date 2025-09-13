#!/usr/bin/env tsx

/**
 * Tool Calling Example for AIDE Provider
 * Usage: npx tsx tool-calling-example.ts
 */

import type { LanguageModelV2FunctionTool } from "@ai-sdk/provider";
import { createAide } from "./src/lib/server/aide-provider";

// 🔧 HARDCODED CONFIG - Replace with your actual values
const aide = createAide({
  apiKey: "your_bearer_token_here",
  useCaseId: "RITM1234567",
  solmaId: "123456",
  // baseURL: "https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm", // optional
});

// Define some example tools
const tools: LanguageModelV2FunctionTool[] = [
  {
    type: "function",
    name: "calculate_sum",
    description: "Calculate the sum of two numbers",
    inputSchema: {
      type: "object",
      properties: {
        a: {
          type: "number",
          description: "First number to add",
        },
        b: {
          type: "number",
          description: "Second number to add",
        },
      },
      required: ["a", "b"],
    },
  },
  {
    type: "function",
    name: "get_weather",
    description: "Get the current weather for a location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city and state/country to get weather for",
        },
        unit: {
          type: "string",
          enum: ["fahrenheit", "celsius"],
          description: "Temperature unit",
          default: "fahrenheit",
        },
      },
      required: ["location"],
    },
  },
  {
    type: "function",
    name: "search_knowledge",
    description: "Search a knowledge base for information",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
        category: {
          type: "string",
          enum: ["technology", "science", "history", "general"],
          description: "Category to search in",
        },
      },
      required: ["query"],
    },
  },
];

// Tool execution simulator (normally you'd implement these)
function executeTools(toolCalls: any[]): any[] {
  return toolCalls.map((call) => {
    const args =
      typeof call.args === "string" ? JSON.parse(call.args) : call.args;

    switch (call.toolName) {
      case "calculate_sum":
        return {
          toolCallId: call.toolCallId,
          result: `The sum of ${args.a} and ${args.b} is ${args.a + args.b}`,
        };
      case "get_weather":
        return {
          toolCallId: call.toolCallId,
          result: `The weather in ${args.location} is sunny and 72°F with light winds.`,
        };
      case "search_knowledge":
        return {
          toolCallId: call.toolCallId,
          result: `Found 3 relevant articles about "${args.query}" in the ${args.category || "general"} category.`,
        };
      default:
        return {
          toolCallId: call.toolCallId,
          result: "Unknown tool",
          isError: true,
        };
    }
  });
}

async function testToolCallingClaude() {
  console.log("🧠 Testing Tool Calling with Claude Sonnet 4 via AIDE\n");

  const model = aide.languageModel(
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
  );

  try {
    console.log("🔧 Step 1: Making initial request with tools...");
    const result1 = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "I need help with a few things: First, what's 15 + 27? Second, what's the weather like in San Francisco? Third, search for information about artificial intelligence in the technology category.",
            },
          ],
        },
      ],
      tools,
      toolChoice: { type: "auto" }, // Let the model decide when to use tools
      temperature: 0.3,
      maxOutputTokens: 500,
    });

    console.log("📊 Response 1:");
    result1.content.forEach((content) => {
      if (content.type === "text") {
        console.log("💬 Text:", content.text);
      } else if (content.type === "tool-call") {
        const toolCall = content as any;
        console.log(`🔧 Tool Call: ${toolCall.toolName}(${toolCall.args})`);
      }
    });

    console.log("🏁 Finish reason:", result1.finishReason);
    console.log("📈 Usage:", result1.usage);

    // If there were tool calls, execute them and continue the conversation
    const toolCalls = result1.content.filter((c) => c.type === "tool-call");
    if (toolCalls.length > 0) {
      console.log(
        "\n🔧 Step 2: Executing tools and continuing conversation...",
      );

      const toolResults = executeTools(toolCalls);

      // Create a follow-up conversation with tool results
      const result2 = await model.doGenerate({
        prompt: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "I need help with a few things: First, what's 15 + 27? Second, what's the weather like in San Francisco? Third, search for information about artificial intelligence in the technology category.",
              },
            ],
          },
          {
            role: "assistant",
            content: result1.content as any,
          },
          {
            role: "tool",
            content: toolResults.map((result) => ({
              type: "tool-result" as const,
              toolCallId: result.toolCallId,
              toolName: "", // Will be filled by the provider
              result: result.result,
              isError: result.isError || false,
            })) as any,
          },
        ],
        tools,
        temperature: 0.3,
        maxOutputTokens: 300,
      });

      console.log("📊 Response 2 (after tool execution):");
      result2.content.forEach((content) => {
        if (content.type === "text") {
          console.log("💬 Text:", content.text);
        }
      });

      console.log("🏁 Final finish reason:", result2.finishReason);
      console.log("📈 Final usage:", result2.usage);
    }

    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

async function testToolCallingGPT() {
  console.log("\n💬 Testing Tool Calling with GPT-4o via AIDE\n");

  const model = aide.languageModel("gpt-4o");

  try {
    console.log("🔧 Making request with required tool usage...");
    const result = await model.doGenerate({
      prompt: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Use the provided tools to answer questions accurately.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What's 42 plus 58? Also, can you search for information about quantum computing?",
            },
          ],
        },
      ],
      tools,
      toolChoice: { type: "required" }, // Force tool usage
      temperature: 0.1,
      maxOutputTokens: 400,
    });

    console.log("📊 Response:");
    result.content.forEach((content) => {
      if (content.type === "text") {
        console.log("💬 Text:", content.text);
      } else if (content.type === "tool-call") {
        const toolCall = content as any;
        console.log(`🔧 Tool Call: ${toolCall.toolName}(${toolCall.args})`);
      }
    });

    console.log("🏁 Finish reason:", result.finishReason);
    console.log("📈 Usage:", result.usage);

    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

async function testToolCallingStreaming() {
  console.log("\n🔄 Testing Tool Calling with Streaming (Claude Opus 4)\n");

  const model = aide.languageModel("us.anthropic.claude-opus-4-20250514-v1:0");

  try {
    const { stream } = await model.doStream({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Calculate 123 + 456 and also get the weather for New York.",
            },
          ],
        },
      ],
      tools,
      toolChoice: { type: "auto" },
      temperature: 0.2,
      maxOutputTokens: 300,
    });

    const reader = stream.getReader();

    console.log("📝 Streaming response:");
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value.type === "text-delta") {
        process.stdout.write(value.delta);
      } else if (value.type === "tool-call") {
        const toolCall = value as any;
        console.log(`\n🔧 Tool Call: ${toolCall.toolName}(${toolCall.args})`);
      } else if (value.type === "finish") {
        console.log("\n\n🏁 Finish reason:", value.finishReason);
        console.log("📈 Usage:", value.usage);
      } else if (value.type === "stream-start") {
        if (value.warnings.length > 0) {
          console.log("⚠️ Warnings:", value.warnings);
        }
      }
    }

    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

async function main() {
  console.log("🔧 AIDE Provider Tool Calling Test\n");
  console.log("📝 Available Tools:");
  tools.forEach((tool) => {
    console.log(`   • ${tool.name}: ${tool.description}`);
  });
  console.log(`\n${"=".repeat(60)}`);

  // Test tool calling with different models
  await testToolCallingClaude();
  await testToolCallingGPT();
  await testToolCallingStreaming();

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ All tool calling tests completed!");
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { main as runToolCallingTests };
