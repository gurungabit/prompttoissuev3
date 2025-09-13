#!/usr/bin/env tsx
/**
 * Quick CLI example for testing AIDE provider
 * Usage: npx tsx cli-aide-example.ts
 */

import { createAide } from "./src/lib/server/aide-provider";

// HARDCODED VALUES FOR TESTING - Replace with your actual values
const AIDE_CONFIG = {
  apiKey: "your_bearer_token_here",
  useCaseId: "RITM1234567",
  solmaId: "123456",
  baseURL:
    "https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm", // optional
};

async function testClaudeSonnet4() {
  console.log("🚀 Testing Claude Sonnet 4 via AIDE...\n");

  const aide = createAide(AIDE_CONFIG);
  const model = aide.languageModel(
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
  );

  try {
    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "What is the capital of France? Respond in one sentence.",
            },
          ],
        },
      ],
      temperature: 0.7,
      maxOutputTokens: 100,
    });

    console.log(
      "✅ Response:",
      result.content[0]?.type === "text"
        ? result.content[0].text
        : "No text response",
    );
    console.log("📊 Usage:", result.usage);
    console.log("🏁 Finish reason:", result.finishReason);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function testClaudeOpus4() {
  console.log("\n🧠 Testing Claude Opus 4 via AIDE...\n");

  const aide = createAide(AIDE_CONFIG);
  const model = aide.languageModel("us.anthropic.claude-opus-4-20250514-v1:0");

  try {
    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Solve: If x + 2y = 10 and 2x - y = 5, what are x and y?",
            },
          ],
        },
      ],
      temperature: 0.1, // Lower temp for precise math
      maxOutputTokens: 200,
    });

    console.log(
      "✅ Response:",
      result.content[0]?.type === "text"
        ? result.content[0].text
        : "No text response",
    );
    console.log("📊 Usage:", result.usage);
    console.log("🏁 Finish reason:", result.finishReason);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function testGPT4o() {
  console.log("\n💬 Testing GPT-4o via AIDE...\n");

  const aide = createAide(AIDE_CONFIG);
  const model = aide.languageModel("gpt-4o");

  try {
    const result = await model.doGenerate({
      prompt: [
        {
          role: "system",
          content: "You are a helpful assistant. Be concise.",
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Explain JSON in one paragraph.",
            },
          ],
        },
      ],
      temperature: 0.5,
      maxOutputTokens: 150,
    });

    console.log(
      "✅ Response:",
      result.content[0]?.type === "text"
        ? result.content[0].text
        : "No text response",
    );
    console.log("📊 Usage:", result.usage);
    console.log("🏁 Finish reason:", result.finishReason);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function testStreaming() {
  console.log("\n🔄 Testing Streaming with GPT-4o Mini via AIDE...\n");

  const aide = createAide(AIDE_CONFIG);
  const model = aide.languageModel("gpt-4o-mini");

  try {
    const { stream } = await model.doStream({
      prompt: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Write a haiku about coding.",
            },
          ],
        },
      ],
      temperature: 0.8,
      maxOutputTokens: 100,
    });

    const reader = stream.getReader();
    let _fullResponse = "";

    console.log("📝 Streaming response:");
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      if (value.type === "text-delta") {
        process.stdout.write(value.delta);
        _fullResponse += value.delta;
      } else if (value.type === "finish") {
        console.log("\n\n📊 Usage:", value.usage);
        console.log("🏁 Finish reason:", value.finishReason);
      } else if (value.type === "stream-start") {
        if (value.warnings.length > 0) {
          console.log("⚠️  Warnings:", value.warnings);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

async function main() {
  console.log("🔧 AIDE Provider CLI Test\n");
  console.log("📝 Configuration:");
  console.log(`   • Use Case ID: ${AIDE_CONFIG.useCaseId}`);
  console.log(`   • SOLMA ID: ${AIDE_CONFIG.solmaId}`);
  console.log(`   • Base URL: ${AIDE_CONFIG.baseURL}`);
  console.log(`   • API Key: ${AIDE_CONFIG.apiKey.substring(0, 10)}...`);
  console.log(`\n${"=".repeat(60)}`);

  // Test all models
  await testClaudeSonnet4();
  await testClaudeOpus4();
  await testGPT4o();
  await testStreaming();

  console.log(`\n${"=".repeat(60)}`);
  console.log("✅ All tests completed!");
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { main as runAideTests };
