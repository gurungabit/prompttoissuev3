#!/usr/bin/env tsx
/**
 * Quick single test for AIDE provider
 * Usage: npx tsx quick-test-aide.ts
 */

import { createAide } from "./src/lib/server/aide-provider";

// 🔧 HARDCODED CONFIG - Replace with your actual values
const aide = createAide({
  apiKey: "your_bearer_token_here",
  useCaseId: "RITM1234567",
  solmaId: "123456",
  // baseURL: "https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm", // optional
});

async function quickTest() {
  console.log("🚀 Quick AIDE Test - Claude Sonnet 4\n");

  const model = aide.languageModel(
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
  );

  try {
    const result = await model.doGenerate({
      prompt: [
        {
          role: "user",
          content: [
            { type: "text", text: "Hello! Can you tell me what 2+2 equals?" },
          ],
        },
      ],
      temperature: 0.5,
      maxOutputTokens: 50,
    });

    console.log("✅ Success!");
    console.log(
      "📝 Response:",
      result.content[0]?.type === "text"
        ? result.content[0].text
        : "No response",
    );
    console.log(
      "📊 Tokens used:",
      `${result.usage?.inputTokens} input, ${result.usage?.outputTokens} output`,
    );

    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    return false;
  }
}

// Run the test
quickTest()
  .then((success) => {
    if (success) {
      console.log("\n🎉 AIDE provider is working!");
    } else {
      console.log("\n💥 Test failed. Check your configuration.");
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
