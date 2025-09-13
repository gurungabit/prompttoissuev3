# AIDE Provider - New Models Added

## Summary

Added support for the latest Claude 4 models and confirmed existing GPT model support in the AIDE provider.

## New Models Added

### 🆕 Claude 4 Models (AWS Bedrock)
- **`us.anthropic.claude-sonnet-4-20250514-v1:0`** - Claude Sonnet 4 (Balanced performance & speed)
- **`us.anthropic.claude-opus-4-20250514-v1:0`** - Claude Opus 4 (Most capable reasoning model)

### ✅ Existing Models (Confirmed)
- **`us.anthropic.claude-3-7-sonnet-20250219-v1:0`** - Claude 3.7 Sonnet
- **`gpt-4o`** - GPT-4 Omni (Azure OpenAI)
- **`gpt-4o-mini`** - GPT-4 Omni Mini (Azure OpenAI)

## Model Selection Guide

### Use Case Recommendations

#### 🚀 **Claude Opus 4** - `aide:us.anthropic.claude-opus-4-20250514-v1:0`
- **Best for**: Complex reasoning, advanced analysis, difficult problems
- **Example**: Mathematical proofs, complex code analysis, multi-step reasoning
- **Temperature**: 0.1-0.3 for precise reasoning

#### ⚡ **Claude Sonnet 4** - `aide:us.anthropic.claude-sonnet-4-20250514-v1:0`  
- **Best for**: General purpose, balanced performance and speed
- **Example**: Content generation, code assistance, general Q&A
- **Temperature**: 0.5-0.8 for creative tasks

#### 📝 **GPT-4o** - `aide:gpt-4o`
- **Best for**: Structured outputs, specific formats, enterprise use
- **Example**: JSON generation, formal writing, business communications  
- **Temperature**: 0.3-0.7 depending on creativity needs

#### 💨 **GPT-4o Mini** - `aide:gpt-4o-mini`
- **Best for**: Quick responses, simple tasks, high-volume usage
- **Example**: Summarization, simple Q&A, data processing
- **Temperature**: 0.5-0.9 for varied responses

## Usage Examples

### Claude Opus 4 (Most Capable)
```typescript
const { provider, model } = createProvider("aide:us.anthropic.claude-opus-4-20250514-v1:0");
const result = await provider.languageModel(model).doGenerate({
  prompt: [{ role: "user", content: [{ type: "text", text: "Complex reasoning task..." }] }],
  temperature: 0.1, // Precise reasoning
});
```

### Claude Sonnet 4 (Balanced)
```typescript
const { provider, model } = createProvider("aide:us.anthropic.claude-sonnet-4-20250514-v1:0");
const result = await provider.languageModel(model).doGenerate({
  prompt: [{ role: "user", content: [{ type: "text", text: "General task..." }] }],
  temperature: 0.7, // Balanced creativity
});
```

### GPT Models
```typescript
// GPT-4o for structured tasks
const { provider, model } = createProvider("aide:gpt-4o");

// GPT-4o Mini for quick tasks  
const { provider, model } = createProvider("aide:gpt-4o-mini");
```

## Configuration Updates

### Updated llm-config.ts
```typescript
aide: {
  label: "AIDE",
  models: [
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",    // NEW
    "us.anthropic.claude-opus-4-20250514-v1:0",      // NEW  
    "gpt-4o",
    "gpt-4o-mini",
  ],
}
```

### Model Detection Logic
The AIDE provider automatically detects the appropriate backend:
- **Models containing "gpt-"** → Azure OpenAI endpoint
- **All other models** → AWS Bedrock endpoint

## Environment Requirements

All models require the same environment variables:
```bash
AIDE_API_KEY=your_bearer_token_here
AIDE_USE_CASE_ID=RITM1234567  
AIDE_SOLMA_ID=123456
AIDE_BASE_URL=https://... (optional)
```

## Benefits

✅ **Latest Models**: Access to Claude 4 series with improved capabilities  
✅ **Backwards Compatible**: Existing code continues to work  
✅ **Automatic Detection**: No code changes needed for provider selection  
✅ **Type Safety**: Full TypeScript support for all models  
✅ **Consistent API**: Same interface across all models