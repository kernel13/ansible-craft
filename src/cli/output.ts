import boxen from 'boxen';
import chalk from 'chalk';
import { CLIError } from '../errors/cli-error.js';

/**
 * Display an error in a styled bordered box to stderr.
 */
export function displayError(error: CLIError | Error): void {
  let content: string;

  if (error instanceof CLIError && error.suggestion) {
    content = `${chalk.red(error.message)}\n\n${chalk.yellow('Suggestion:')} ${error.suggestion}`;
  } else {
    content = chalk.red(error.message);
  }

  const box = boxen(content, {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'red',
    title: 'Error',
    titleAlignment: 'center',
  });

  process.stderr.write(`${box}\n`);
}

/**
 * Format an error string for Commander's outputError callback.
 * Used for inline Commander errors (simpler than full boxen).
 */
export function formatError(str: string): string {
  return chalk.red(str);
}
