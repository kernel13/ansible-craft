/**
 * Agent error handling utilities for CLI commands.
 *
 * Provides consistent error handling and warning display for agent results.
 */

import chalk from 'chalk';
import type { AgentResult } from '../../core/types.js';
import { formatJsonError, outputJson } from '../json-output.js';
import type { PhaseTracker } from '../progress.js';

/**
 * Options for handling agent failures.
 */
export interface AgentFailureOptions {
  /** Whether to output in JSON format */
  jsonMode: boolean;
  /** Optional phase tracker to mark as failed */
  tracker?: PhaseTracker;
  /** Phase name to mark as failed */
  phaseName?: string;
}

/**
 * Handle an agent failure by displaying errors and exiting.
 *
 * This function never returns - it always calls process.exit(1).
 *
 * @param result - The failed agent result
 * @param options - Display options
 *
 * @example
 * ```typescript
 * const result = await validatorAgent.execute(input, context);
 * if (!result.success) {
 *   handleAgentFailure(result, { jsonMode, tracker, phaseName: 'Validation' });
 * }
 * ```
 */
export function handleAgentFailure<T>(result: AgentResult<T>, options: AgentFailureOptions): never {
  // Mark phase as failed if tracker provided
  if (options.tracker && options.phaseName) {
    options.tracker.fail(options.phaseName);
  }

  // Output in JSON format
  if (options.jsonMode) {
    const error = result.errors?.[0];
    outputJson(formatJsonError(error?.code ?? 'UNKNOWN_ERROR', error?.message ?? 'Unknown error'));
    process.exit(1);
  }

  // Output in human-readable format
  for (const error of result.errors ?? []) {
    console.error(chalk.red(`Error [${error.code}]: ${error.message}`));
  }
  process.exit(1);
}

/**
 * Display agent warnings to the console.
 *
 * Warnings are non-blocking issues that the user should be aware of.
 *
 * @param warnings - List of warning messages
 * @param quiet - If true, suppress warning output
 *
 * @example
 * ```typescript
 * if (result.success && result.warnings) {
 *   displayAgentWarnings(result.warnings, options.quiet);
 * }
 * ```
 */
export function displayAgentWarnings(warnings: string[] | undefined, quiet: boolean): void {
  if (quiet || !warnings || warnings.length === 0) return;

  for (const warning of warnings) {
    console.log(chalk.yellow(`  ⚠ ${warning}`));
  }
}
