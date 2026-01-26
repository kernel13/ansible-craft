/**
 * Setup command for installing Claude Code skills.
 *
 * Provides a user-friendly CLI interface for skill installation
 * with interactive prompts for updates.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import {
  installSkills,
  formatResult,
  type InstallOptions,
} from '../../../cc/scripts/install-skills.js';

export const setupCommand = new Command('setup')
  .description('Install ansible-craft commands for Claude Code integration')
  .option('-g, --global', 'Install to ~/.claude/commands/ac/ (default)', true)
  .option('-p, --project', 'Install to ./.claude/commands/ac/ (current project)')
  .option('-f, --force', 'Overwrite existing skills without prompting')
  .action(async (options: { global?: boolean; project?: boolean; force?: boolean }) => {
    const installOptions: InstallOptions = {
      project: options.project,
      force: options.force,
      quiet: false,
    };

    // First, do a dry run to check for existing files
    if (!options.force) {
      const dryResult = installSkills({ ...installOptions, quiet: true });

      // Check if any files would be updated (not just skipped because identical)
      const targetDir = dryResult.targetDir;
      const hasExisting = dryResult.skipped.length > 0 || dryResult.installed.length > 0;

      if (hasExisting && !options.force) {
        console.log(chalk.yellow('\nExisting commands found in:'), chalk.dim(targetDir));
        console.log(
          chalk.dim('Files: ' + [...dryResult.installed, ...dryResult.skipped].join(', ')),
        );

        const shouldOverwrite = await confirm({
          message: 'Overwrite existing commands with latest version?',
          default: true,
        });

        if (!shouldOverwrite) {
          console.log(chalk.dim('\nSkipped installation.'));
          return;
        }

        installOptions.force = true;
      }
    }

    // Perform the actual installation
    const result = installSkills(installOptions);

    // Display results
    console.log('\n' + formatResult(result));

    if (result.success) {
      console.log(chalk.green('\n✓ Claude Code commands installed successfully!'));
      console.log(chalk.dim('\nAvailable commands in Claude Code:'));
      console.log(chalk.cyan('  /ac:role     '), chalk.dim('- Generate Ansible roles'));
      console.log(chalk.cyan('  /ac:playbook '), chalk.dim('- Generate Ansible playbooks'));
      console.log(chalk.cyan('  /ac:explain  '), chalk.dim('- Explain Ansible code'));
      console.log(chalk.cyan('  /ac:fix      '), chalk.dim('- Fix Ansible errors'));

      if (installOptions.project) {
        console.log(chalk.dim('\nCommands installed to project directory (.claude/commands/ac/).'));
        console.log(chalk.dim('Consider adding .claude/commands/ to version control.'));
      } else {
        console.log(chalk.dim('\nCommands installed globally (~/.claude/commands/ac/).'));
        console.log(chalk.dim('Available in all projects with Claude Code.'));
      }
    } else {
      console.log(chalk.red('\n✗ Installation failed.'));
      if (result.errors.length > 0) {
        console.log(chalk.dim('Check the errors above and try again.'));
      }
      process.exit(1);
    }
  });
