/**
 * Interactive setup wizard for ansible-craft configuration.
 *
 * Provides a guided experience for configuring API key, model, and preferences.
 */

import { confirm, password, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { Config } from './schema.ts';

/**
 * Run the interactive setup wizard.
 *
 * Prompts the user for:
 * 1. Anthropic API key (masked input)
 * 2. Default model (sonnet or opus)
 * 3. Complex mode preference
 *
 * @returns Partial config with user selections
 */
export async function runSetupWizard(): Promise<Partial<Config>> {
  console.log(chalk.cyan("\nWelcome to ansible-craft! Let's set up your configuration.\n"));

  // Prompt for API key
  const apiKey = await password({
    message: 'Enter your Anthropic API key:',
    mask: '*',
    validate: (value) => {
      if (!value || value.trim() === '') {
        return 'API key is required';
      }
      if (!value.startsWith('sk-ant-')) {
        return 'API key must start with "sk-ant-"';
      }
      return true;
    },
  });

  // Prompt for model selection
  const model = await select<'sonnet' | 'opus'>({
    message: 'Choose your default model:',
    choices: [
      {
        name: 'Sonnet (faster, good for most tasks)',
        value: 'sonnet',
      },
      {
        name: 'Opus (more capable, best for complex tasks)',
        value: 'opus',
      },
    ],
    default: 'sonnet',
  });

  // Prompt for complex mode
  const complex = await confirm({
    message: 'Enable complex mode by default?',
    default: false,
  });

  return {
    api: { key: apiKey },
    defaults: { model, complex },
  };
}
