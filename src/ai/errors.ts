/**
 * API error transformation and display.
 *
 * Converts Anthropic SDK errors to user-friendly CLIError instances
 * with actionable suggestions and styled error boxes.
 */
import Anthropic from '@anthropic-ai/sdk';
import boxen from 'boxen';
import chalk from 'chalk';
import { CLIError } from '../errors/cli-error.js';

/** Base URL for error documentation */
const ERROR_DOCS_BASE = 'https://github.com/ansible-craft/ansible-craft#errors';

/**
 * Extract error details from Anthropic API error.
 *
 * @param error - The API error
 * @returns Structured error details including request ID for debugging
 */
export function getErrorDetails(error: Anthropic.APIError): {
  status: number;
  type: string;
  message: string;
  requestId?: string;
} {
  return {
    status: error.status,
    type: (error as unknown as { error?: { type?: string } }).error?.type ?? 'unknown',
    message: error.message,
    requestId: error.headers?.['request-id'],
  };
}

/**
 * Transform an API error into a user-friendly CLIError.
 *
 * Maps HTTP status codes to specific error messages with suggestions.
 * Includes documentation links for each error type.
 *
 * @param error - The error to transform (may be any type)
 * @returns CLIError with user-friendly message and suggestion
 */
export function transformApiError(error: unknown): CLIError {
  if (error instanceof Anthropic.APIError) {
    const code = `API_${error.status}`;

    switch (error.status) {
      case 401:
        return new CLIError(
          'Authentication failed - invalid API key',
          code,
          `Check your API key with: ansible-craft config validate\nSee: ${ERROR_DOCS_BASE}#authentication`,
        );
      case 403:
        return new CLIError(
          'Permission denied - API key lacks required access',
          code,
          `Verify your API key has the correct permissions\nSee: ${ERROR_DOCS_BASE}#permissions`,
        );
      case 429:
        return new CLIError(
          'Rate limit exceeded',
          code,
          `Wait a moment and try again, or check usage at console.anthropic.com\nSee: ${ERROR_DOCS_BASE}#rate-limit`,
        );
      case 500:
        return new CLIError(
          'Anthropic API internal error',
          code,
          `This is temporary - wait a few minutes and retry\nSee: ${ERROR_DOCS_BASE}#api-error`,
        );
      case 529:
        return new CLIError(
          'Anthropic API is overloaded',
          code,
          `The API is experiencing high load - wait and retry\nSee: ${ERROR_DOCS_BASE}#overloaded`,
        );
      default:
        return new CLIError(
          error.message || `API error (${error.status})`,
          code,
          `See: ${ERROR_DOCS_BASE}#unknown`,
        );
    }
  }

  // Network/connection errors
  if (error instanceof Error) {
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return new CLIError(
        'Network error - could not reach Anthropic API',
        'NETWORK_ERROR',
        'Check your internet connection and try again',
      );
    }
    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new CLIError(
        'Request timed out',
        'TIMEOUT',
        'The request took too long - try again or use a simpler prompt',
      );
    }
  }

  return new CLIError(
    error instanceof Error ? error.message : 'Unknown error',
    'UNKNOWN',
    'Try running with --verbose for more details',
  );
}

/**
 * Display an API error with styled box presentation.
 *
 * Shows a professional error box matching the missing API key error style.
 * In verbose mode, includes additional debug information (request ID, status).
 *
 * @param error - The CLIError to display
 * @param verbose - Whether to show additional debug info
 * @param rawError - Optional raw error for verbose output
 */
export function displayApiError(error: CLIError, verbose = false, rawError?: unknown): void {
  let message = `${chalk.bold.red(error.message)}`;

  if (error.suggestion) {
    message += `\n\n${chalk.yellow('Try this:')}\n  ${error.suggestion.replace(/\n/g, '\n  ')}`;
  }

  if (verbose && rawError instanceof Anthropic.APIError) {
    const details = getErrorDetails(rawError);
    message += `\n\n${chalk.dim('Debug info:')}`;
    message += `\n  ${chalk.dim('Status:')} ${details.status}`;
    message += `\n  ${chalk.dim('Type:')} ${details.type}`;
    if (details.requestId) {
      message += `\n  ${chalk.dim('Request ID:')} ${details.requestId}`;
    }
  }

  const box = boxen(message, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'red',
    title: `Error: ${error.code}`,
    titleAlignment: 'center',
  });

  process.stderr.write(`${box}\n`);
}
