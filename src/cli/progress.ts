/**
 * Progressive log-style progress display for multi-phase generation.
 *
 * Provides spinner with elapsed time tracking that persists completed
 * phases as log lines while showing the current phase with a spinner.
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Interface for tracking multi-phase progress.
 *
 * As each phase completes, it persists as a log line with checkmark/cross
 * while the next phase spinner starts.
 */
export interface PhaseTracker {
  /** Start tracking a new phase */
  start(phaseName: string): void;
  /** Mark current phase as successful */
  succeed(message?: string): void;
  /** Mark current phase as failed */
  fail(message?: string): void;
  /** Update current phase text */
  update(text: string): void;
}

/**
 * Create a phase tracker for progressive log-style output.
 *
 * In quiet mode, returns a no-op tracker that does nothing.
 * Otherwise, creates an ora spinner that uses stopAndPersist to
 * leave completed phases as log lines.
 *
 * @param quiet - Whether to suppress all output
 * @returns PhaseTracker instance
 */
export function createPhaseTracker(quiet: boolean): PhaseTracker {
  let spinner: Ora | null = null;
  let startTime = 0;

  // No-op tracker for quiet mode
  if (quiet) {
    return {
      start: () => {},
      succeed: () => {},
      fail: () => {},
      update: () => {},
    };
  }

  /**
   * Calculate elapsed time since phase started.
   */
  function getElapsed(): string {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return chalk.dim(`(${elapsed}s)`);
  }

  return {
    start(phaseName: string): void {
      startTime = Date.now();
      spinner = ora({
        text: phaseName,
        color: 'cyan',
        spinner: 'dots',
        stream: process.stderr,
      });
      spinner.start();
    },

    succeed(message?: string): void {
      if (!spinner) return;
      const text = message ?? spinner.text;
      spinner.stopAndPersist({
        symbol: chalk.green('✓'),
        text: `${text} ${getElapsed()}`,
      });
      spinner = null;
    },

    fail(message?: string): void {
      if (!spinner) return;
      const text = message ?? spinner.text;
      spinner.stopAndPersist({
        symbol: chalk.red('✗'),
        text: `${text} ${getElapsed()}`,
      });
      spinner = null;
    },

    update(text: string): void {
      if (spinner) {
        spinner.text = text;
      }
    },
  };
}
