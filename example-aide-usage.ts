// Example usage of the AIDE provider
// This file demonstrates how to use the custom AIDE provider in your application

import { createProvider } from "./src/lib/server/providers";

// Example 1: Using AIDE with Claude Sonnet 4 model
async function exampleAideClaudeUsage() {
  // The provider will be created based on environment variables:
  // AIDE_API_KEY, AIDE_USE_CASE_ID, AIDE_BASE_URL
  const { provider, model } = createProvider(
    "aide:us.anthropic.claude-sonnet-4-20250514-v1:0",
  );

  try {
    const result = await provider.languageModel(model).doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What is the capital of France?",
            },
          ],
        },
      ],
    });

    console.log("Response:", result.content);
    console.log("Usage:", result.usage);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 2: Using AIDE with GPT model
async function exampleAideGPTUsage() {
  const { provider, model } = createProvider("aide:gpt-4o");

  try {
    const result = await provider.languageModel(model).doGenerate({
      prompt: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Explain quantum computing in simple terms.",
            },
          ],
        },
      ],
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    console.log("Response:", result.content);
    console.log("Usage:", result.usage);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 3: Using streaming with AIDE
async function exampleAideStreamingUsage() {
  const { provider, model } = createProvider("aide:gpt-4o-mini");

  try {
    const { stream } = await provider.languageModel(model).doStream({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Write a short story about a robot.",
            },
          ],
        },
      ],
    });

    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value.type === "text-delta") {
        process.stdout.write(value.delta);
      } else if (value.type === "finish") {
        console.log("\n\nFinish reason:", value.finishReason);
        console.log("Usage:", value.usage);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 4: Using AIDE with Claude Opus 4 (most capable model)
async function exampleAideClaudeOpusUsage() {
  const { provider, model } = createProvider(
    "aide:us.anthropic.claude-opus-4-20250514-v1:0",
  );

  try {
    const result = await provider.languageModel(model).doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Solve this complex reasoning problem: A company has 3 departments. Each department has a different number of employees (between 10-50). The total is 90 employees. Department A has twice as many as Department C. Department B has 10 more than Department C. How many employees are in each department?",
            },
          ],
        },
      ],
      temperature: 0.1, // Lower temperature for precise reasoning
    });

    console.log("Claude Opus 4 Response:", result.content);
    console.log("Usage:", result.usage);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 5: Using AIDE with custom settings
async function exampleAideCustomSettings() {
  const { provider, model } = createProvider(
    "aide:us.anthropic.claude-sonnet-4-20250514-v1:0",
  );

  try {
    // Create model instance with custom AIDE settings
    const modelInstance = provider.languageModel(model, {
      applyGuardrail: true, // Apply AIDE guardrails
      scrubInput: true, // Enable sensitive data scrubbing
      failOnScrub: false, // Continue even if sensitive data is detected
      modelProvider: "aws", // Force AWS Bedrock (auto-detected by default)
    });

    const result = await modelInstance.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this business document for key insights.",
            },
          ],
        },
      ],
    });

    console.log("Response:", result.content);
  } catch (error) {
    console.error("Error:", error);
  }
}

// Environment Variables Required:
// AIDE_API_KEY=your_bearer_token_here
// AIDE_USE_CASE_ID=RITM1234567
// AIDE_SOLMA_ID=123456
// AIDE_BASE_URL=https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm (optional)

export {
  exampleAideClaudeUsage,
  exampleAideGPTUsage,
  exampleAideStreamingUsage,
  exampleAideClaudeOpusUsage,
  exampleAideCustomSettings,
};
