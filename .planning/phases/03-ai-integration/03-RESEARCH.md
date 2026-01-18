# Phase 3: AI Integration - Research

**Researched:** 2026-01-18
**Domain:** Anthropic Claude API, SDK integration, streaming, error handling
**Confidence:** HIGH

## Summary

Phase 3 builds the AI communication infrastructure for ansible-craft. The Anthropic TypeScript SDK (`@anthropic-ai/sdk`) is the official, well-documented library for Claude API access. It provides built-in streaming support with two approaches (helper-based and raw iteration), automatic retries with exponential backoff, and comprehensive TypeScript types.

The SDK has excellent Bun compatibility since Anthropic acquired Bun in 2025 - Claude Code runs on Bun, making this a first-class supported runtime. The SDK already handles rate limiting retries automatically (2 retries by default), but the user decisions in CONTEXT.md require 3 retries and custom UX (animated countdown, styled error boxes).

**Primary recommendation:** Use `@anthropic-ai/sdk` for API calls, but build a wrapper layer that:
1. Customizes retry behavior (3 attempts with animated countdown on rate limits)
2. Transforms SDK errors into styled CLI errors (boxen format matching existing patterns)
3. Exposes streaming via the `.stream()` helper with `.on('text')` for token-by-token output

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | ^0.39+ | Official Claude API client | Official SDK, TypeScript-first, streaming support, automatic retries |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| boxen | ^8.0.1 | Already in project | Error presentation - styled boxes |
| chalk | ^5.4.1 | Already in project | Terminal colors for output |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @anthropic-ai/sdk | Direct fetch calls | SDK handles auth, retries, types, streaming - don't hand-roll |
| @anthropic-ai/sdk | @ai-sdk/anthropic (Vercel) | Less control, abstracts away Anthropic-specific features |

**Installation:**
```bash
bun add @anthropic-ai/sdk
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── ai/                         # AI integration layer
│   ├── client.ts              # SDK wrapper with retry logic
│   ├── errors.ts              # API error → CLI error transformation
│   ├── stream.ts              # Streaming response handler
│   └── types.ts               # Extended types for our use cases
├── api/                        # Existing (validate-key.ts)
├── cli/                        # Existing CLI infrastructure
└── errors/                     # Existing (cli-error.ts)
```

### Pattern 1: Client Wrapper

**What:** Thin wrapper around Anthropic SDK that customizes retry behavior and error handling
**When to use:** All Claude API calls should go through this wrapper
**Example:**

```typescript
// Source: Anthropic SDK docs + custom wrapper pattern
import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming, MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';

export interface ClientOptions {
  apiKey: string;
  maxRetries?: number;      // Default: 3 (user decision)
  timeout?: number;         // Default: 120000 (2 min max wait)
  noRetry?: boolean;        // --no-retry flag
}

export function createClient(options: ClientOptions): Anthropic {
  return new Anthropic({
    apiKey: options.apiKey,
    maxRetries: options.noRetry ? 0 : (options.maxRetries ?? 3),
    timeout: options.timeout ?? 120000,
  });
}
```

### Pattern 2: Streaming Handler

**What:** Wrapper around SDK streaming that handles spinner → content transition
**When to use:** All generation commands (role, playbook, explain, fix)
**Example:**

```typescript
// Source: Anthropic SDK streaming docs
import type Anthropic from '@anthropic-ai/sdk';

export interface StreamOptions {
  onStart?: () => void;           // Show spinner
  onFirstToken?: () => void;      // Clear spinner, start output
  onText?: (text: string) => void; // Token-by-token output
  onComplete?: (message: Anthropic.Message) => void;
  quiet?: boolean;                // --quiet flag
}

export async function streamMessage(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  options: StreamOptions = {}
): Promise<Anthropic.Message> {
  const stream = client.messages.stream(params);

  let firstToken = true;

  stream.on('text', (text) => {
    if (firstToken) {
      options.onFirstToken?.();
      firstToken = false;
    }
    if (!options.quiet) {
      options.onText?.(text);
    }
  });

  return stream.finalMessage();
}
```

### Pattern 3: Error Transformer

**What:** Convert SDK errors to styled CLI errors with user-friendly messages
**When to use:** All error handling from API calls
**Example:**

```typescript
// Source: Anthropic error types + existing CLIError pattern
import Anthropic from '@anthropic-ai/sdk';
import { CLIError } from '../errors/cli-error.js';

const ERROR_DOCS_BASE = 'https://docs.ansible-craft.dev/errors';

export function transformApiError(error: unknown): CLIError {
  if (error instanceof Anthropic.APIError) {
    const code = `API_${error.status}`;

    switch (error.status) {
      case 401:
        return new CLIError(
          'Authentication failed - invalid API key',
          code,
          `Check your API key with: ansible-craft config validate\nSee: ${ERROR_DOCS_BASE}/auth`,
        );
      case 429:
        return new CLIError(
          'Rate limit exceeded',
          code,
          `Wait a moment and try again, or check your usage at console.anthropic.com\nSee: ${ERROR_DOCS_BASE}/rate-limit`,
        );
      case 500:
      case 529:
        return new CLIError(
          'Anthropic API is experiencing issues',
          code,
          `This is temporary - wait a few minutes and retry\nSee: ${ERROR_DOCS_BASE}/api-error`,
        );
      default:
        return new CLIError(
          error.message,
          code,
          `See: ${ERROR_DOCS_BASE}/unknown`,
        );
    }
  }

  // Network errors
  if (error instanceof Error && error.message.includes('fetch')) {
    return new CLIError(
      'Network error - could not reach Anthropic API',
      'NETWORK_ERROR',
      'Check your internet connection and try again',
    );
  }

  return new CLIError(
    error instanceof Error ? error.message : 'Unknown error',
    'UNKNOWN',
    'Try running with --verbose for more details',
  );
}
```

### Anti-Patterns to Avoid

- **Direct SDK usage in commands:** Always go through the wrapper for consistent error handling
- **Catching errors silently:** Every error should produce a styled box with suggestion
- **Blocking on rate limits:** Use animated countdown, not silent waits
- **Ignoring --quiet flag:** Streaming output must respect quiet mode

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API authentication | Custom auth headers | SDK client with apiKey | SDK handles header format, versioning |
| Exponential backoff | Custom retry loops | SDK's maxRetries + custom rate limit handler | SDK has battle-tested retry logic |
| Streaming parsing | SSE parsing | SDK's `.stream()` helper | SDK accumulates message, handles events |
| Token counting | Custom estimation | SDK's `countTokens` method | Exact count from API |
| Error parsing | JSON parsing | SDK error classes | SDK provides typed errors with status |

**Key insight:** The Anthropic SDK handles most complexity internally. The wrapper's job is UX customization (spinners, countdowns, styled errors), not reimplementing SDK functionality.

## Common Pitfalls

### Pitfall 1: Rate Limit Silent Failure

**What goes wrong:** SDK retries automatically but user doesn't see anything happening
**Why it happens:** Default SDK behavior is silent retries with backoff
**How to avoid:**
- Set `maxRetries: 0` on client for rate limits
- Catch 429 errors explicitly
- Show animated countdown using retry-after header
- Re-attempt manually after countdown
**Warning signs:** Users report "hangs" during rate limiting

### Pitfall 2: Streaming Memory Bloat

**What goes wrong:** Using `.stream()` accumulates entire response in memory
**Why it happens:** `.stream()` builds `finalMessage()` object
**How to avoid:**
- For very long responses, consider `create({ stream: true })` instead
- For ansible-craft's use case (role/playbook generation), `.stream()` is fine - responses are bounded
**Warning signs:** Memory usage grows linearly with response length

### Pitfall 3: Error During Streaming

**What goes wrong:** Error occurs mid-stream, partial output left on screen
**Why it happens:** Network interruption, timeout, API error mid-response
**How to avoid:**
- Wrap stream iteration in try-catch
- On error, emit newline before error box (clean separation)
- Consider showing partial content was received in error message
**Warning signs:** Error boxes appear jumbled with partial output

### Pitfall 4: Missing Retry-After Header

**What goes wrong:** Rate limit countdown shows wrong duration
**Why it happens:** Retry-after header sometimes missing or in different format
**How to avoid:**
- Default to reasonable fallback (30 seconds) if header missing
- Parse both seconds and HTTP date formats
- Cap at user decision's 2-minute maximum
**Warning signs:** Countdown shows NaN or unreasonable values

### Pitfall 5: Ctrl+C Not Responsive

**What goes wrong:** User presses Ctrl+C but nothing happens during wait
**Why it happens:** Blocking on sleep/timeout without signal handling
**How to avoid:**
- Use AbortController for cancellable waits
- Register SIGINT handler during countdown
- Clear countdown display on abort
**Warning signs:** Users complain about "unresponsive" CLI

## Code Examples

### Complete Client Setup

```typescript
// Source: Anthropic SDK README + custom patterns
import Anthropic from '@anthropic-ai/sdk';

export interface CreateMessageOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  userMessage: string;
  noRetry?: boolean;
  verbose?: boolean;
}

const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_MAX_TOKENS = 4096;

export async function createMessage(options: CreateMessageOptions): Promise<Anthropic.Message> {
  const client = new Anthropic({
    apiKey: options.apiKey,
    maxRetries: options.noRetry ? 0 : 3,
    timeout: 120000, // 2 minutes max
  });

  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: options.model ?? DEFAULT_MODEL,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content: options.userMessage }],
  };

  if (options.systemPrompt) {
    params.system = options.systemPrompt;
  }

  return client.messages.create(params);
}
```

### Streaming with Spinner Transition

```typescript
// Source: Anthropic SDK streaming + ora spinner pattern
import Anthropic from '@anthropic-ai/sdk';

export async function streamWithSpinner(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  options: { quiet?: boolean } = {}
): Promise<Anthropic.Message> {
  // Show spinner until first token
  let spinner: ReturnType<typeof createSpinner> | null = null;
  if (!options.quiet) {
    spinner = createSpinner('Connecting to Claude...');
    spinner.start();
  }

  const stream = client.messages.stream(params);
  let firstToken = true;

  stream.on('text', (text) => {
    if (firstToken) {
      spinner?.stop();
      spinner = null;
      firstToken = false;
    }
    if (!options.quiet) {
      process.stdout.write(text);
    }
  });

  try {
    const message = await stream.finalMessage();
    if (!options.quiet) {
      process.stdout.write('\n'); // Final newline
    }
    return message;
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
```

### Rate Limit Handler with Countdown

```typescript
// Source: Anthropic rate limit docs + user decisions
import Anthropic from '@anthropic-ai/sdk';

const MAX_WAIT_SECONDS = 120; // 2 minutes max

export async function handleRateLimit(
  error: Anthropic.RateLimitError,
  retryFn: () => Promise<void>,
  options: { quiet?: boolean; abortSignal?: AbortSignal } = {}
): Promise<void> {
  // Parse retry-after header (seconds or HTTP date)
  const retryAfter = parseRetryAfter(error.headers?.['retry-after']);
  const waitSeconds = Math.min(retryAfter ?? 30, MAX_WAIT_SECONDS);

  if (!options.quiet) {
    await showCountdown(waitSeconds, options.abortSignal);
  } else {
    await sleep(waitSeconds * 1000, options.abortSignal);
  }

  await retryFn();
}

async function showCountdown(seconds: number, signal?: AbortSignal): Promise<void> {
  for (let remaining = seconds; remaining > 0; remaining--) {
    process.stdout.write(`\rRate limited. Waiting ${remaining}s...`);
    await sleep(1000, signal);
    if (signal?.aborted) {
      process.stdout.write('\r\x1b[K'); // Clear line
      throw new Error('Aborted by user');
    }
  }
  process.stdout.write('\r\x1b[K'); // Clear line
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    });
  });
}
```

### Accessing Request ID for Verbose Mode

```typescript
// Source: Anthropic error docs
import Anthropic from '@anthropic-ai/sdk';

export function getErrorDetails(error: Anthropic.APIError): {
  status: number;
  type: string;
  message: string;
  requestId?: string;
} {
  return {
    status: error.status,
    type: error.error?.type ?? 'unknown',
    message: error.message,
    requestId: error.headers?.['request-id'],
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct fetch + SSE parsing | SDK streaming helpers | SDK v0.20+ | Eliminates complex event parsing |
| Manual retry loops | SDK maxRetries option | SDK v0.25+ | Built-in exponential backoff |
| Generic error handling | Typed error classes | SDK v0.30+ | Better error discrimination |
| Node.js only | Bun 1.0+ support | 2025 acquisition | First-class Bun support |

**Deprecated/outdated:**
- `client.completions.create()`: Replaced by `messages.create()` - completions API deprecated
- `claude-2-*` models: Use claude-3-5 or claude-sonnet-4 for best results
- Raw SSE parsing: SDK handles this internally now

## Open Questions

1. **Spinner library choice**
   - What we know: Need spinner for "Connecting to Claude..." state
   - What's unclear: Use existing library (ora) or lightweight custom implementation?
   - Recommendation: Add ora or similar - worth the dependency for polished UX

2. **Token counting before generation**
   - What we know: SDK provides `client.messages.countTokens()` method
   - What's unclear: Should we validate input fits context window before sending?
   - Recommendation: Skip for MVP - let API return error if too large

3. **Model version pinning**
   - What we know: Current latest is claude-sonnet-4-5-20250929
   - What's unclear: Should we pin to specific version or use alias?
   - Recommendation: Pin to specific version, update intentionally

## Sources

### Primary (HIGH confidence)
- [Anthropic SDK TypeScript GitHub](https://github.com/anthropics/anthropic-sdk-typescript) - Installation, streaming, error handling
- [Anthropic Platform Docs - Errors](https://platform.claude.com/docs/en/api/errors) - Error types, HTTP codes, request-id
- [Anthropic Platform Docs - Rate Limits](https://platform.claude.com/docs/en/api/rate-limits) - Headers, token bucket, tiers
- [Anthropic Platform Docs - Streaming](https://platform.claude.com/docs/en/api/messages-streaming) - Event types, SSE format

### Secondary (MEDIUM confidence)
- [NPM @anthropic-ai/sdk](https://www.npmjs.com/package/@anthropic-ai/sdk) - Version info, basic usage
- [AWS Architecture Blog - Exponential Backoff](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/) - Jitter algorithm theory
- [Bun Blog - Anthropic Acquisition](https://bun.com/blog/bun-joins-anthropic) - Bun compatibility confirmation

### Tertiary (LOW confidence)
- WebSearch results for community patterns - General ecosystem guidance

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official SDK, well-documented, Bun-supported
- Architecture: HIGH - Patterns derived from SDK docs and existing codebase
- Pitfalls: MEDIUM - Some based on GitHub issues, some extrapolated from docs

**Research date:** 2026-01-18
**Valid until:** 2026-03-18 (SDK is stable, 60 days reasonable)

---

## Key Decisions to Make

Based on research, the planner should decide:

1. **Spinner implementation:** Add `ora` dependency vs lightweight custom solution
2. **Error docs URL:** Placeholder `docs.ansible-craft.dev/errors` - need real domain
3. **Default model:** Use `claude-sonnet-4-5-20250929` (latest) or config-driven?
4. **Rate limit retry strategy:** SDK built-in vs fully custom (user decisions suggest custom UX)
