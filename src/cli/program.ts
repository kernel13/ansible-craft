import { Command } from 'commander';
import { completionsCommand } from './commands/completions.js';
import { configCommand } from './commands/config.js';
import { explainCommand } from './commands/explain.js';
import { fixCommand } from './commands/fix.js';
import { newCommand } from './commands/new.js';
import { formatHelp } from './help.js';
import { formatError } from './output.js';
import { displayVersion } from './version.js';

export const program = new Command();

program
  .name('ansible-craft')
  .description('Generate production-ready Ansible roles from natural language')
  .configureHelp({
    formatHelp: formatHelp,
    sortSubcommands: true,
    sortOptions: true,
  })
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(formatError(str)),
  })
  .exitOverride((err) => {
    // help and version display are not errors
    if (err.code === 'commander.helpDisplayed' || err.code === 'commander.version') {
      process.exit(0);
    }
    // All other Commander errors exit with 1
    process.exit(err.exitCode);
  })
  .showHelpAfterError('(run with --help for available options)');

// Custom version option with styled display
program.option('-V, --version', 'Display version information');

// Register commands
program.addCommand(completionsCommand);
program.addCommand(configCommand);
program.addCommand(newCommand);
program.addCommand(explainCommand);
program.addCommand(fixCommand);

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
