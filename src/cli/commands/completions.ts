/**
 * Completions command for ansible-craft CLI.
 *
 * Generates shell completion scripts for bash, zsh, and fish.
 */

import { Command } from 'commander';
import {
  generateBashCompletions,
  generateFishCompletions,
  generateZshCompletions,
} from '../completions.js';

/**
 * Completions command - generate shell completions.
 */
export const completionsCommand = new Command('completions')
  .description('Generate shell completion scripts')
  .argument('<shell>', 'Shell type: bash, zsh, or fish')
  .action((shell: string) => {
    const shellLower = shell.toLowerCase();

    switch (shellLower) {
      case 'bash':
        process.stdout.write(generateBashCompletions());
        break;
      case 'zsh':
        process.stdout.write(generateZshCompletions());
        break;
      case 'fish':
        process.stdout.write(generateFishCompletions());
        break;
      default:
        process.stderr.write(`Error: Unknown shell '${shell}'. Supported: bash, zsh, fish\n`);
        process.exit(1);
    }
  });
