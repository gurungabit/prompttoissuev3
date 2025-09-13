# CLI Usage Examples for AIDE Provider

Quick command-line examples to test the AIDE provider with hardcoded values.

## 🚀 Quick Setup

1. **Edit the hardcoded values** in the CLI files with your actual AIDE credentials
2. **Run the tests** using npm scripts

## 📁 Files Created

### `quick-test-aide.ts` - Simple Single Test
- Tests one model (Claude Sonnet 4) with a basic prompt
- Perfect for verifying your setup works

### `cli-aide-example.ts` - Comprehensive Test Suite  
- Tests all 5 supported models
- Includes streaming example
- Shows different use cases and temperatures

## 🔧 Configuration

Edit the hardcoded values in both files:

```typescript
// In quick-test-aide.ts and cli-aide-example.ts
const aide = createAide({
  apiKey: "your_actual_bearer_token_here",      // ← Replace this
  useCaseId: "RITM1234567",                     // ← Replace this  
  solmaId: "123456",                            // ← Replace this
  // baseURL: "https://...",                    // ← Optional: uncomment if using custom URL
});
```

## 🏃‍♂️ Running the Tests

### Quick Test (Single Model)
```bash
# Test just Claude Sonnet 4
npm run aide:test
# or
npx tsx quick-test-aide.ts
```

### Full Test Suite (All Models)
```bash
# Test all 5 models + streaming
npm run aide:test-all
# or  
npx tsx cli-aide-example.ts
```

## 📋 What Each Test Does

### Quick Test Output
```
🚀 Quick AIDE Test - Claude Sonnet 4

✅ Success!
📝 Response: 2 + 2 equals 4.
📊 Tokens used: 15 input, 8 output

🎉 AIDE provider is working!
```

### Full Test Suite Output
```
🔧 AIDE Provider CLI Test

📝 Configuration:
   • Use Case ID: RITM1234567
   • SOLMA ID: 123456
   • Base URL: https://aide-llm-api-prod...
   • API Key: your_beare...

============================================================
🚀 Testing Claude Sonnet 4 via AIDE...
✅ Response: The capital of France is Paris.
📊 Usage: { inputTokens: 20, outputTokens: 12, totalTokens: 32 }

🧠 Testing Claude Opus 4 via AIDE...
✅ Response: To solve this system of equations: x = 4, y = 3
📊 Usage: { inputTokens: 25, outputTokens: 18, totalTokens: 43 }

💬 Testing GPT-4o via AIDE...
✅ Response: JSON (JavaScript Object Notation) is a lightweight...
📊 Usage: { inputTokens: 22, outputTokens: 35, totalTokens: 57 }

🔄 Testing Streaming with GPT-4o Mini via AIDE...
📝 Streaming response:
Code flows like water,
Logic builds bridges of thought—
Bugs teach us to grow.

📊 Usage: { inputTokens: 18, outputTokens: 20, totalTokens: 38 }
============================================================
✅ All tests completed!
```

## 🛠️ Troubleshooting

### Common Issues

1. **Authentication Error**
   ```
   ❌ Error: AIDE API call failed: 401 Unauthorized
   ```
   → Check your `apiKey` value

2. **Use Case Error**
   ```
   ❌ Error: AIDE API call failed: 403 Forbidden  
   ```
   → Check your `useCaseId` value

3. **Missing SOLMA ID**
   ```
   ❌ Error: Missing required field solmaId
   ```
   → Check your `solmaId` value

4. **Network Error**
   ```
   ❌ Error: fetch failed
   ```
   → Check your network connection and `baseURL`

### Debug Mode

Add console logging to see the exact request being sent:

```typescript
// Add this before the API call
console.log("🔍 Debug - Request body:", JSON.stringify(requestBody, null, 2));
```

## 🔄 Next Steps

Once the CLI tests work:

1. **Environment Variables**: Move to using environment variables instead of hardcoded values
2. **Integration**: Use the provider in your main application via `createProvider("aide:model-name")`
3. **Production**: Remove hardcoded values and use proper configuration management

## 📚 Model Reference

| Model | Use Case | Temperature |
|-------|----------|-------------|
| `us.anthropic.claude-sonnet-4-20250514-v1:0` | General purpose | 0.5-0.8 |
| `us.anthropic.claude-opus-4-20250514-v1:0` | Complex reasoning | 0.1-0.3 |
| `gpt-4o` | Structured output | 0.3-0.7 |
| `gpt-4o-mini` | Quick tasks | 0.5-0.9 |