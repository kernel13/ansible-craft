import { Command } from 'commander';
import { formatHelp } from './help.js';
import { displayVersion } from './version.js';

export const program = new Command();

program
  .name('ansible-craft')
  .description('Generate production-ready Ansible roles from natural language')
  .configureHelp({
    formatHelp: formatHelp,
    sortSubcommands: true,
    sortOptions: true,
  });

// Custom version option with styled display
program.option('-V, --version', 'Display version information');

/**
 * Check for version flag before parsing and handle no-arguments case.
 */
export function handleSpecialFlags(): boolean {
  const args = process.argv.slice(2);

  // Handle --version / -V flag
  if (args.includes('--version') || args.includes('-V')) {
    displayVersion();
    return true;
  }

  return false;
}

/**
 * Show help when no arguments provided.
 */
export function handleNoArguments(): void {
  if (process.argv.length <= 2) {
    program.help();
  }
}
