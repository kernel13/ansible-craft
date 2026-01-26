# AI Integration

ansible-craft uses the Anthropic Claude API for AI-powered code generation.

## Overview

The AI integration layer provides:

- Anthropic SDK client configuration
- Streaming response handling
- Structured output validation
- Retry logic for reliability
- Error handling and user feedback

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI INTEGRATION                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    CLIENT    │───▶│   STREAM     │───▶│   PARSER     │      │
│  │   (SDK)      │    │   HANDLER    │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    RETRY     │    │   SPINNER    │    │   SCHEMA     │      │
│  │    LOGIC     │    │   FEEDBACK   │    │  VALIDATION  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Client Configuration

**Location:** `src/ai/client.ts`

### Creating a Client

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { getApiKey } from '../config';

export function createClient(): Anthropic {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new ConfigError('API key not configured');
  }

  return new Anthropic({
    apiKey,
    timeout: 120_000, // 2 minutes
    maxRetries: 0,    // We handle retries ourselves
  });
}
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `timeout` | 120000ms | Request timeout |
| `maxRetries` | 0 | SDK retries (disabled, custom retry used) |

## Model Selection

**Location:** `src/ai/models.ts`

### Available Models

| Model | ID | Use Case |
|-------|----|----|
| Sonnet | `claude-sonnet-4-5-20250929` | Default, fast generation |
| Opus | `claude-opus-4-5-20251101` | Complex requirements |

### Selection Logic

```typescript
export function selectModel(options: { complex?: boolean }): string {
  if (options.complex) {
    return 'claude-opus-4-5-20251101';
  }
  return 'claude-sonnet-4-5-20250929';
}
```

### CLI Flag

```bash
# Use Sonnet (default)
ansible-craft new role "nginx"

# Use Opus for complex tasks
ansible-craft new role "kubernetes cluster" --complex
```

## Streaming Responses

**Location:** `src/ai/stream.ts`

### Stream Handler

Streaming provides real-time feedback during generation:

```typescript
export async function* streamMessage(
  client: Anthropic,
  params: MessageCreateParams
): AsyncGenerator<string, string> {
  const stream = await client.messages.stream(params);

  let fullContent = '';

  for await (const event of stream) {
    if (event.type === 'content_block_delta') {
      const text = event.delta.text;
      fullContent += text;
      yield text;
    }
  }

  return fullContent;
}
```

### Visual Feedback

The stream integrates with spinner UI:

```typescript
async function generateWithFeedback(prompt: string): Promise<string> {
  const spinner = ora('Generating...').start();

  const stream = streamMessage(client, {
    model: selectModel(options),
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 8192
  });

  let content = '';
  for await (const chunk of stream) {
    // First chunk transitions from spinner to streaming
    if (content === '') {
      spinner.stop();
      process.stdout.write('\n');
    }
    process.stdout.write(chunk);
    content += chunk;
  }

  return content;
}
```

## Structured Outputs

**Location:** `src/generation/schemas/`

### Plan Preview Schema

For plan previews, structured outputs guarantee valid JSON:

```typescript
import { z } from 'zod';

export const PlanSchema = z.object({
  name: z.string(),
  description: z.string(),
  tasks: z.array(z.object({
    name: z.string(),
    module: z.string(),
    description: z.string()
  })),
  variables: z.array(z.object({
    name: z.string(),
    default: z.unknown(),
    description: z.string()
  })),
  handlers: z.array(z.object({
    name: z.string(),
    description: z.string()
  })),
  templates: z.array(z.string())
});

export type Plan = z.infer<typeof PlanSchema>;
```

### Using Structured Outputs

```typescript
async function generatePlan(description: string): Promise<Plan> {
  const response = await client.messages.create({
    model: selectModel(options),
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildPlanPrompt(description) }],
    // Beta API for structured outputs
    response_format: {
      type: 'json_schema',
      json_schema: zodToJsonSchema(PlanSchema)
    }
  });

  const content = response.content[0].text;
  return PlanSchema.parse(JSON.parse(content));
}
```

## Retry Logic

**Location:** `src/ai/retry.ts`

### Exponential Backoff

```typescript
interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = DEFAULT_OPTIONS
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt === options.maxRetries) {
        throw error;
      }

      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt),
        options.maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
```

### Retryable Errors

```typescript
function isRetryable(error: unknown): boolean {
  if (error instanceof Anthropic.RateLimitError) {
    return true;
  }

  if (error instanceof Anthropic.InternalServerError) {
    return true;
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return true;
  }

  return false;
}
```

### Retry Indicators

| HTTP Status | Retryable | Reason |
|------------|-----------|--------|
| 429 | Yes | Rate limit |
| 500 | Yes | Server error |
| 502/503/504 | Yes | Gateway error |
| 400 | No | Bad request |
| 401 | No | Auth error |
| 404 | No | Not found |

## Error Handling

**Location:** `src/ai/errors.ts`

### Error Transformation

API errors are transformed into user-friendly messages:

```typescript
export function transformApiError(error: unknown): UserError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new UserError(
      'Authentication failed. Check your API key.',
      'API_AUTH_ERROR',
      { suggestion: 'Run: ansible-craft config save' }
    );
  }

  if (error instanceof Anthropic.RateLimitError) {
    return new UserError(
      'Rate limit exceeded. Please wait and try again.',
      'RATE_LIMIT',
      { retryAfter: error.headers?.['retry-after'] }
    );
  }

  if (error instanceof Anthropic.BadRequestError) {
    return new UserError(
      'Invalid request. The description may be too long or contain invalid content.',
      'BAD_REQUEST'
    );
  }

  return new UserError(
    'An unexpected error occurred.',
    'UNKNOWN_ERROR',
    { originalError: error }
  );
}
```

### Error Display

```typescript
function displayError(error: UserError): void {
  console.error(chalk.red(`Error: ${error.message}`));

  if (error.suggestion) {
    console.error(chalk.yellow(`Suggestion: ${error.suggestion}`));
  }

  if (process.env.DEBUG) {
    console.error(chalk.gray(JSON.stringify(error.details, null, 2)));
  }
}
```

## Prompts

**Location:** `src/generation/prompts/`

### System Prompts

Each phase has specialized system prompts:

```typescript
// Plan phase prompt
export const PLAN_SYSTEM_PROMPT = `You are an Ansible expert...`;

// Generation phase prompt
export const GENERATE_SYSTEM_PROMPT = `You are generating production-ready Ansible code...`;
```

### Prompt Building

```typescript
interface PromptContext {
  description: string;
  wizard: WizardContext;
  plan?: Plan;
}

export function buildPlanPrompt(context: PromptContext): string {
  return `
Generate a plan for an Ansible role with these requirements:

Description: ${context.description}

Target platforms: ${context.wizard.platforms.join(', ')}
Ansible version: ${context.wizard.ansibleVersion}
Requires privilege: ${context.wizard.requirePrivilege}
Include Molecule: ${context.wizard.molecule}

Respond with a structured plan...
  `.trim();
}
```

## Token Management

### Max Tokens

| Phase | Max Tokens | Reason |
|-------|------------|--------|
| Plan | 4096 | Structured JSON |
| Generation | 8192 | Full code output |
| Explanation | 4096 | Text explanation |
| Fix | 2048 | Short suggestions |

### Token Estimation

```typescript
function estimateTokens(text: string): number {
  // Rough estimation: 4 characters per token
  return Math.ceil(text.length / 4);
}
```

## Rate Limiting

### Handling Rate Limits

```typescript
async function handleRateLimit(error: Anthropic.RateLimitError): Promise<void> {
  const retryAfter = error.headers?.['retry-after'];

  if (retryAfter) {
    const seconds = parseInt(retryAfter, 10);
    console.log(chalk.yellow(`Rate limited. Waiting ${seconds}s...`));
    await sleep(seconds * 1000);
  } else {
    // Default wait
    await sleep(60000);
  }
}
```

### Best Practices

1. **Batch requests** when possible
2. **Use appropriate max_tokens** to avoid waste
3. **Cache plan results** for retries
4. **Stream responses** for better UX

## Testing

### Mocking the Client

```typescript
// src/__test-utils__/fixtures.ts
export function createMockClient(): Anthropic {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ text: 'mocked response' }]
      }),
      stream: jest.fn().mockReturnValue({
        async *[Symbol.asyncIterator]() {
          yield { type: 'content_block_delta', delta: { text: 'chunk' } };
        }
      })
    }
  } as unknown as Anthropic;
}
```

### Fixture Responses

```typescript
export const MOCK_PLAN_RESPONSE = {
  name: 'nginx',
  tasks: [
    { name: 'Install nginx', module: 'ansible.builtin.apt' }
  ],
  variables: [],
  handlers: []
};
```

## Configuration Reference

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key (required) |
| `DEBUG` | Enable debug logging |

### Config File

```toml
# ~/.config/ansible-craft/config.toml
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"
complex = false
```

## Related

- **[Agent System](agent-system.md)** - How agents use AI
- **[Generation Flow](generation-flow.md)** - End-to-end process
- **[Validation Pipeline](validation-pipeline.md)** - Post-generation validation
