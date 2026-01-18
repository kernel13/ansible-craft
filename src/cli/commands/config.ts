/**
 * Config command for ansible-craft CLI.
 *
 * Provides config save subcommand for configuring API key and preferences.
 */

import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { CONFIG_PATH, maskApiKey, saveConfig, validateApiKey } from '../../config/index.ts';
import type { Config } from '../../config/schema.ts';
import { runSetupWizard } from '../../config/wizard.ts';

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
