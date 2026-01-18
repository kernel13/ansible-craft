/**
 * CLI types for ansible-craft
 */

/**
 * Global CLI options available to all commands
 */
export interface CLIOptions {
  verbose?: boolean;
}

/**
 * Exit codes used by the CLI
 */
export const ExitCode = {
  Success: 0,
  Error: 1,
  InvalidArgument: 2,
} as const;

export type ExitCode = (typeof ExitCode)[keyof typeof ExitCode];
