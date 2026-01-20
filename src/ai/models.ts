/**
 * Model selection logic for --complex flag.
 *
 * Handles switching between Claude Sonnet (default) and Claude Opus (--complex)
 * with appropriate cost warnings and user confirmation.
 */
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { DEFAULT_MODEL } from './client.js';

/** Claude Opus model for complex analysis (higher cost) */
export const OPUS_MODEL = 'claude-opus-4-5-20251101';

/**
 * Result of model selection.
 */
export interface ModelSelection {
  /** Model ID to use */
  model: string;
  /** Whether user confirmed the selection (false if cancelled Opus prompt) */
  confirmed: boolean;
}

/**
 * Confirm with user before using Claude Opus (higher cost).
 *
 * Displays cost warning and prompts for confirmation.
 * Default is true (proceed), but user can decline.
 *
 * @returns True if user confirms, false if cancelled
 */
export async function confirmOpusUsage(): Promise<boolean> {
  console.log(
    chalk.yellow('\nNote: Claude Opus provides deeper analysis but has higher API costs.'),
  );
  return confirm({
    message: 'Using Claude Opus (higher cost). Continue?',
    default: true,
  });
}

/**
 * Select model based on --complex flag.
 *
 * Without --complex: Returns DEFAULT_MODEL (Sonnet) immediately.
 * With --complex: Prompts for confirmation, then returns OPUS_MODEL if confirmed.
 *
 * If user declines Opus, falls back to DEFAULT_MODEL with confirmed=false
 * to signal that the command should not proceed (user cancelled).
 *
 * @param useComplex - Whether --complex flag was passed
 * @returns Selected model ID and confirmation status
 */
export async function selectModel(useComplex: boolean): Promise<ModelSelection> {
  if (!useComplex) {
    return { model: DEFAULT_MODEL, confirmed: true };
  }

  const confirmed = await confirmOpusUsage();
  if (!confirmed) {
    return { model: DEFAULT_MODEL, confirmed: false };
  }

  return { model: OPUS_MODEL, confirmed: true };
}
