/**
 * Rate limit and retry handling for Anthropic API.
 *
 * Provides animated countdown on rate limits and configurable retry logic.
 */
import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import type { CLIError } from '../errors/cli-error.js';
import { displayApiError, transformApiError } from './errors.js';

/** Maximum wait time for rate limits in seconds */
const MAX_WAIT_SECONDS = 120;

/** Default wait time if Retry-After header is missing */
const DEFAULT_WAIT_SECONDS = 30;

/**
 * Parse Retry-After header value.
 *
 * Handles both seconds format and HTTP date format.
 *
 * @param value - The Retry-After header value
 * @returns Wait time in seconds, or undefined if unparseable
 */
export function parseRetryAfter(value: string | null | undefined): number | undefined {
  if (!value) return undefined;

  // Try parsing as seconds
  const seconds = Number.parseInt(value, 10);
  if (!Number.isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // Try parsing as HTTP date
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const waitMs = date - Date.now();
    if (waitMs > 0) {
      return Math.ceil(waitMs / 1000);
    }
  }

  return undefined;
}

/**
 * Sleep for a duration with abort support.
 *
 * @param ms - Duration in milliseconds
 * @param signal - Optional AbortSignal for cancellation
 * @throws Error if aborted
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeout = setTimeout(resolve, ms);
    const abortHandler = () => {
      clearTimeout(timeout);
      reject(new Error('Aborted'));
    };

    signal?.addEventListener('abort', abortHandler, { once: true });
  });
}

/**
 * Display animated countdown for rate limit wait.
 *
 * Updates in place (same line) and clears when done.
 *
 * @param seconds - Total seconds to wait
 * @param signal - Optional AbortSignal for Ctrl+C
 * @throws Error if aborted by user
 */
async function showCountdown(seconds: number, signal?: AbortSignal): Promise<void> {
  const startMessage = chalk.yellow('Rate limited.');

  for (let remaining = seconds; remaining > 0; remaining--) {
    process.stderr.write(`\r${startMessage} Waiting ${chalk.bold(remaining)}s... `);
    await sleep(1000, signal);
  }

  // Clear the countdown line
  process.stderr.write('\r\x1b[K');
}

/**
 * Handle rate limit error with animated countdown.
 *
 * Parses Retry-After header, shows countdown, then resolves.
 * User can cancel with Ctrl+C via AbortSignal.
 *
 * @param error - The rate limit error from API
 * @param options - Handler options
 * @returns Promise that resolves after wait (or rejects if aborted)
 */
export async function handleRateLimit(
  error: Anthropic.RateLimitError,
  options: { quiet?: boolean; signal?: AbortSignal } = {},
): Promise<void> {
  // Get headers - SDK error has headers property
  const headers = (error as unknown as { headers?: Record<string, string> }).headers;
  const retryAfter = parseRetryAfter(headers?.['retry-after']);
  const waitSeconds = Math.min(retryAfter ?? DEFAULT_WAIT_SECONDS, MAX_WAIT_SECONDS);

  if (options.quiet) {
    // Silent wait in quiet mode
    await sleep(waitSeconds * 1000, options.signal);
  } else {
    await showCountdown(waitSeconds, options.signal);
  }
}

/**
 * Retry configuration for API calls.
 */
export interface RetryOptions {
  /** Maximum retry attempts (default: 3) */
  maxAttempts?: number;
  /** Disable retries (--no-retry flag) */
  noRetry?: boolean;
  /** Suppress output */
  quiet?: boolean;
  /** Show debug info on errors */
  verbose?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

/**
 * Execute a function with retry logic for rate limits.
 *
 * Retries on 429 and 5xx errors with exponential backoff.
 * Does NOT retry on 4xx auth/validation errors.
 *
 * @param fn - Async function to execute
 * @param options - Retry configuration
 * @returns Result of the function
 * @throws CLIError on final failure
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxAttempts = options.noRetry ? 1 : (options.maxAttempts ?? 3);
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on auth/validation errors (4xx except 429)
      if (error instanceof Anthropic.APIError) {
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          break; // Don't retry
        }

        // Rate limit - use special handler
        if (error.status === 429 && attempt < maxAttempts) {
          if (!options.quiet) {
            process.stderr.write(`\r${chalk.dim(`Retrying... (${attempt}/${maxAttempts})`)}\n`);
          }
          await handleRateLimit(error as Anthropic.RateLimitError, {
            quiet: options.quiet,
            signal: options.signal,
          });
          continue;
        }

        // 5xx errors - exponential backoff with jitter
        if (error.status >= 500 && attempt < maxAttempts) {
          if (!options.quiet) {
            process.stderr.write(`\r${chalk.dim(`Retrying... (${attempt}/${maxAttempts})`)}\n`);
          }
          const baseDelay = 2 ** (attempt - 1) * 1000; // 1s, 2s, 4s
          const jitter = Math.random() * 500; // 0-500ms jitter
          await sleep(baseDelay + jitter, options.signal);
          continue;
        }
      }

      // Network errors - retry with backoff
      if (error instanceof Error && attempt < maxAttempts) {
        const isRetryable =
          error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('ECONNRESET');

        if (isRetryable) {
          if (!options.quiet) {
            process.stderr.write(`\r${chalk.dim(`Retrying... (${attempt}/${maxAttempts})`)}\n`);
          }
          const baseDelay = 2 ** (attempt - 1) * 1000;
          const jitter = Math.random() * 500;
          await sleep(baseDelay + jitter, options.signal);
          continue;
        }
      }

      // Non-retryable error
      break;
    }
  }

  // All retries exhausted - transform and throw
  const cliError = transformApiError(lastError);
  if (!options.quiet) {
    displayApiError(cliError, options.verbose, lastError);
  }
  throw cliError;
}
