/**
 * Anthropic SDK client wrapper.
 *
 * Creates configured SDK instances with custom retry behavior.
 * Uses 3 retries by default (CONTEXT.md decision), 2-minute timeout.
 */
import Anthropic from '@anthropic-ai/sdk';
import type { ClientOptions } from './types.ts';

/** Default model: claude-sonnet-4-5-20250929 (pinned version per RESEARCH.md) */
export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

/** Default max tokens for generation */
export const DEFAULT_MAX_TOKENS = 4096;

/** Default timeout in milliseconds (2 minutes) */
export const DEFAULT_TIMEOUT = 120000;

/** Default retry attempts (CONTEXT.md decision: 3 retries) */
export const DEFAULT_MAX_RETRIES = 3;

/**
 * Create a configured Anthropic client.
 *
 * @param options - Client configuration
 * @returns Configured Anthropic SDK instance
 */
export function createClient(options: ClientOptions): Anthropic {
  return new Anthropic({
    apiKey: options.apiKey,
    maxRetries: options.noRetry ? 0 : (options.maxRetries ?? DEFAULT_MAX_RETRIES),
    timeout: options.timeout ?? DEFAULT_TIMEOUT,
  });
}
