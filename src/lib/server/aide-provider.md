# AIDE Provider

A custom provider for the AIDE LLM API, implemented following the Vercel AI SDK Language Model Specification V2.

## Configuration

The AIDE provider requires the following environment variables:

### Required
- `AIDE_API_KEY`: Bearer token for AIDE API authentication
- `AIDE_USE_CASE_ID`: Your AIDE use case ID (e.g., "RITM*******" or "BUSN*******")
- `AIDE_SOLMA_ID`: SOLMA ID for log metadata tracking

### Optional
- `AIDE_BASE_URL`: Custom AIDE API base URL (defaults to production endpoint)

### Environment Variables Example

```bash
# Required
AIDE_API_KEY=your_bearer_token_here
AIDE_USE_CASE_ID=RITM1234567
AIDE_SOLMA_ID=123456

# Optional - defaults to production endpoint
AIDE_BASE_URL=https://aide-llm-api-prod-aide-llm-api.apps.pcrosa01.redk8s.ic1.statefarm
```

## Supported Models

The AIDE provider supports both AWS Bedrock and Azure OpenAI models:

### AWS Bedrock Models
- `us.anthropic.claude-3-7-sonnet-20250219-v1:0`
- `us.anthropic.claude-sonnet-4-20250514-v1:0`
- `us.anthropic.claude-opus-4-20250514-v1:0`

### Azure OpenAI Models
- `gpt-4o`
- `gpt-4o-mini`

## Usage

### In llm-config.ts
The provider is configured with available models:

```typescript
aide: {
  label: "AIDE",
  models: [
    "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
    "us.anthropic.claude-sonnet-4-20250514-v1:0",
    "us.anthropic.claude-opus-4-20250514-v1:0",
    "gpt-4o",
    "gpt-4o-mini",
  ],
}
```

### In providers.ts
The provider factory is set up with environment-based configuration:

```typescript
aide: () => {
  const apiKey = process.env.AIDE_API_KEY;
  const useCaseId = process.env.AIDE_USE_CASE_ID;
  const solmaId = process.env.AIDE_SOLMA_ID;

  if (!apiKey) throw new Error("AIDE_API_KEY environment variable is required");
  if (!useCaseId) throw new Error("AIDE_USE_CASE_ID environment variable is required");
  if (!solmaId) throw new Error("AIDE_SOLMA_ID environment variable is required");

  return createAide({
    apiKey,
    useCaseId,
    solmaId,
    baseURL: process.env.AIDE_BASE_URL,
  });
},
```

### Model Selection
Use model specifiers to select AIDE models:

```typescript
// Claude models via AIDE
const claude37Spec = "aide:us.anthropic.claude-3-7-sonnet-20250219-v1:0"
const claudeSonnet4Spec = "aide:us.anthropic.claude-sonnet-4-20250514-v1:0"
const claudeOpus4Spec = "aide:us.anthropic.claude-opus-4-20250514-v1:0"

// GPT models via AIDE
const gpt4oSpec = "aide:gpt-4o"
const gpt4oMiniSpec = "aide:gpt-4o-mini"
```

## Features

### Implemented
- ✅ Text generation (non-streaming)
- ✅ Streaming support (converted from non-streaming)
- ✅ Provider metadata with AIDE-specific information
- ✅ Proper error handling and warnings
- ✅ Support for both AWS Bedrock and Azure OpenAI models
- ✅ Configurable guardrails and sensitive data scrubbing

### AIDE-Specific Settings
The provider supports AIDE-specific configuration:

```typescript
interface AideChatSettings {
  applyGuardrail?: boolean;     // Apply guardrail (default: true)
  scrubInput?: boolean;         // Scrub sensitive data (default: true)
  failOnScrub?: boolean;        // Fail on scrub detection (default: false)
  modelProvider?: "aws" | "azure"; // Override provider detection
}
```

### Not Supported
- ❌ Tool calling (AIDE API limitation)
- ❌ Native streaming (converted from generate)
- ❌ Image inputs (AIDE API limitation)
- ❌ Embedding models
- ❌ Image generation models

## Implementation Details

### Provider Detection
The provider automatically detects whether to use AWS Bedrock or Azure OpenAI based on the model ID:
- Models containing "gpt-" use Azure OpenAI
- All other models use AWS Bedrock

### Request Format
The provider maps AI SDK messages to AIDE's specific request format, including:
- AIDE configuration (guardrails, scrubbing)
- GaaS configuration (path mapping, metadata)
- Provider-specific payload (AWS Bedrock or Azure OpenAI)

### Response Handling
Responses are mapped back to AI SDK format with:
- Content extraction from provider-specific response format
- Usage token tracking
- Provider metadata preservation
- Proper finish reason mapping

## Error Handling

The provider uses AI SDK standard error types and includes AIDE-specific error information in provider metadata when available.