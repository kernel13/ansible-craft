/**
 * Config command for ansible-craft CLI.
 *
 * Provides config save subcommand for configuring API key and preferences.
 */

import { ExitPromptError } from '@inquirer/core';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { CONFIG_PATH, maskApiKey, saveConfig, validateApiKey } from '../../config/index.ts';
import type { Config } from '../../config/schema.ts';
import { runSetupWizard } from '../../config/wizard.ts';
import { runPlaybookWizard } from '../../wizard/playbook-wizard.ts';
import { runRoleWizard } from '../../wizard/role-wizard.ts';
import { displayDefaultsPreview, WIZARD_DEFAULTS_VERSION } from '../../wizard/defaults.ts';

interface SaveOptions {
  apiKey?: string;
  model?: 'sonnet' | 'opus';
  complex?: boolean;
  validate: boolean;
  yes?: boolean;
}

/**
 * Config command with save subcommand.
 */
export const configCommand = new Command('config').description(
  'Manage ansible-craft configuration',
);

configCommand
  .command('save')
  .description('Save configuration to file')
  .option('--api-key <key>', 'API key to save')
  .option('--model <model>', 'Default model (sonnet or opus)', (value) => {
    if (value !== 'sonnet' && value !== 'opus') {
      throw new Error('Model must be either "sonnet" or "opus"');
    }
    return value as 'sonnet' | 'opus';
  })
  .option('--complex', 'Enable complex mode by default')
  .option('--no-validate', 'Skip API key validation')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (options: SaveOptions) => {
    let updates: Partial<Config>;

    // Determine if using flags or wizard
    const hasFlags = options.apiKey || options.model || options.complex !== undefined;

    if (hasFlags) {
      // Build config from flags
      updates = {};

      if (options.apiKey) {
        updates.api = { key: options.apiKey };
      }

      if (options.model || options.complex !== undefined) {
        const defaults: Partial<Config['defaults']> = {};
        if (options.model) {
          defaults.model = options.model;
        }
        if (options.complex !== undefined) {
          defaults.complex = options.complex;
        }
        updates.defaults = defaults as Config['defaults'];
      }
    } else {
      // Run interactive wizard
      updates = await runSetupWizard();
    }

    // Validate API key if provided and validation not skipped
    const apiKey = updates.api?.key;
    if (apiKey && options.validate !== false) {
      console.log(chalk.dim('\nValidating API key...'));
      const result = await validateApiKey(apiKey);

      if (!result.valid) {
        console.log(chalk.red(`\nAPI key validation failed: ${result.error}`));
        process.exit(1);
      }

      console.log(chalk.green('API key validated successfully'));
    }

    // Show confirmation unless --yes flag
    if (!options.yes) {
      console.log(chalk.cyan('\nConfiguration to save:'));
      if (updates.api?.key) {
        console.log(`  API key: ${chalk.dim(maskApiKey(updates.api.key))}`);
      }
      if (updates.defaults?.model) {
        console.log(`  Model: ${chalk.dim(updates.defaults.model)}`);
      }
      if (updates.defaults?.complex !== undefined) {
        console.log(
          `  Complex mode: ${chalk.dim(updates.defaults.complex ? 'enabled' : 'disabled')}`,
        );
      }

      const confirmed = await confirm({
        message: `Save configuration to ${CONFIG_PATH}?`,
        default: true,
      });

      if (!confirmed) {
        console.log(chalk.yellow('\nConfiguration not saved.'));
        return;
      }
    }

    // Save config
    await saveConfig(updates);

    // Show success message
    console.log(chalk.green(`\nConfiguration saved to: ${CONFIG_PATH}`));
    console.log(chalk.dim('\nSettings saved:'));
    if (updates.api?.key) {
      console.log(`  - API key: ${maskApiKey(updates.api.key)}`);
    }
    if (updates.defaults?.model) {
      console.log(`  - Default model: ${updates.defaults.model}`);
    }
    if (updates.defaults?.complex !== undefined) {
      console.log(`  - Complex mode: ${updates.defaults.complex ? 'enabled' : 'disabled'}`);
    }
  });

configCommand
  .command('defaults <type>')
  .description('Update wizard defaults for role or playbook generation')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (type: string, options: { yes?: boolean }) => {
    // Validate type argument
    if (type !== 'role' && type !== 'playbook') {
      console.error(chalk.red('Error: Type must be either "role" or "playbook"'));
      console.error(chalk.dim('Usage: ansible-craft config defaults <role|playbook>'));
      process.exit(1);
    }

    console.log(chalk.cyan(`\nConfiguring ${type} wizard defaults...\n`));

    try {
      // Run appropriate wizard to collect defaults
      const context = type === 'role' ? await runRoleWizard() : await runPlaybookWizard();

      // Show preview
      displayDefaultsPreview(type, context);

      // Confirm unless --yes
      if (!options.yes) {
        const confirmed = await confirm({
          message: `Save these as your ${type} defaults?`,
          default: true,
        });

        if (!confirmed) {
          console.log(chalk.yellow('\nDefaults not saved.'));
          return;
        }
      }

      // Save to config with error handling
      try {
        const wizardDefaults = {
          defaults_version: WIZARD_DEFAULTS_VERSION,
          [type]: context,
        };

        await saveConfig({
          defaults: {
            wizard: wizardDefaults,
          },
        } as Partial<Config>);

        console.log(chalk.green(`\n${type} defaults saved to: ${CONFIG_PATH}`));
        console.log(chalk.dim(`\nUse --quick with 'new ${type}' to apply these defaults.`));
      } catch (saveError) {
        console.error(
          chalk.red(
            `\nFailed to save defaults: ${saveError instanceof Error ? saveError.message : String(saveError)}`,
          ),
        );
        process.exit(1);
      }
    } catch (error) {
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\nWizard cancelled.'));
        return;
      }
      throw error;
    }
  });
