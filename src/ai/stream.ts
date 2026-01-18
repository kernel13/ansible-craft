/**
 * Streaming response handler for Claude API.
 *
 * Provides token-by-token output with spinner transition on first token.
 * Supports quiet mode and handles mid-stream errors gracefully.
 */
import type Anthropic from '@anthropic-ai/sdk';
import ora, { type Ora } from 'ora';
import { DEFAULT_MAX_TOKENS, DEFAULT_MODEL } from './client.js';
import { type RetryOptions, withRetry } from './retry.js';

/**
 * Options for streaming message creation.
 */
export interface StreamOptions {
  /** Called when connection is established */
  onStart?: () => void;
  /** Called when first token arrives (spinner should stop) */
  onFirstToken?: () => void;
  /** Called for each text token */
  onText?: (text: string) => void;
  /** Called when message is complete */
  onComplete?: (message: Anthropic.Message) => void;
  /** Suppress all output */
  quiet?: boolean;
  /** Show verbose error info */
  verbose?: boolean;
  /** Disable retries */
  noRetry?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Parameters for message creation.
 */
export interface MessageParams {
  /** The user message to send */
  userMessage: string;
  /** Optional system prompt */
  systemPrompt?: string;
  /** Model to use (default: claude-sonnet-4-5-20250929) */
  model?: string;
  /** Max tokens to generate (default: 4096) */
  maxTokens?: number;
}

/**
 * Create a spinner for the loading state.
 *
 * @param text - Initial spinner text
 * @param quiet - Whether to suppress the spinner
 * @returns Spinner instance or null if quiet
 */
function createSpinner(text: string, quiet?: boolean): Ora | null {
  if (quiet) return null;

  return ora({
    text,
    color: 'cyan',
    spinner: 'dots',
    stream: process.stderr, // Keep spinner on stderr
  });
}

/**
 * Stream a message from Claude with spinner transition.
 *
 * Shows "Connecting to Claude..." spinner until first token,
 * then streams tokens to stdout as they arrive.
 *
 * @param client - Configured Anthropic client
 * @param params - Message parameters
 * @param options - Stream options including quiet mode
 * @returns The complete message object
 */
export async function streamMessage(
  client: Anthropic,
  params: MessageParams,
  options: StreamOptions = {},
): Promise<Anthropic.Message> {
  const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: params.model ?? DEFAULT_MODEL,
    max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content: params.userMessage }],
  };

  if (params.systemPrompt) {
    messageParams.system = params.systemPrompt;
  }

  // Wrap in retry logic
  const retryOptions: RetryOptions = {
    noRetry: options.noRetry,
    quiet: options.quiet,
    verbose: options.verbose,
    signal: options.signal,
  };

  return withRetry(async () => {
    // Start spinner
    const spinner = createSpinner('Connecting to Claude...', options.quiet);
    spinner?.start();
    options.onStart?.();

    let firstToken = true;

    try {
      const stream = client.messages.stream(messageParams);

      // Handle text tokens
      stream.on('text', (text) => {
        if (firstToken) {
          // Stop spinner on first token
          spinner?.stop();
          options.onFirstToken?.();
          firstToken = false;
        }

        // Output token
        if (!options.quiet) {
          process.stdout.write(text);
          options.onText?.(text);
        }
      });

      // Wait for completion
      const message = await stream.finalMessage();

      // Final newline after streaming (if we had any output)
      if (!options.quiet && !firstToken) {
        process.stdout.write('\n');
      }

      options.onComplete?.(message);
      return message;
    } catch (error) {
      // Stop spinner if still running
      spinner?.stop();

      // Emit newline before error if we had partial output
      if (!firstToken && !options.quiet) {
        process.stdout.write('\n');
      }

      // Re-throw for retry logic to handle
      throw error;
    }
  }, retryOptions);
}

/**
 * Send a message and get a non-streaming response.
 *
 * Simpler alternative to streamMessage() for cases where streaming
 * is not needed (e.g., short responses, background operations).
 *
 * @param client - Configured Anthropic client
 * @param params - Message parameters
 * @param options - Options including quiet mode and retry settings
 * @returns The complete message object
 */
export async function sendMessage(
  client: Anthropic,
  params: MessageParams,
  options: Pick<StreamOptions, 'quiet' | 'verbose' | 'noRetry' | 'signal'> = {},
): Promise<Anthropic.Message> {
  const messageParams: Anthropic.MessageCreateParamsNonStreaming = {
    model: params.model ?? DEFAULT_MODEL,
    max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
    messages: [{ role: 'user', content: params.userMessage }],
  };

  if (params.systemPrompt) {
    messageParams.system = params.systemPrompt;
  }

  const spinner = createSpinner('Connecting to Claude...', options.quiet);
  spinner?.start();

  const retryOptions: RetryOptions = {
    noRetry: options.noRetry,
    quiet: options.quiet,
    verbose: options.verbose,
    signal: options.signal,
  };

  try {
    const message = await withRetry(() => client.messages.create(messageParams), retryOptions);
    spinner?.stop();
    return message;
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}

/**
 * Extract text content from a message.
 *
 * @param message - The message to extract text from
 * @returns Combined text content from all text blocks
 */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}
