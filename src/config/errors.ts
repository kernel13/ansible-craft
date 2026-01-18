/**
 * Configuration-related error display functions.
 *
 * Provides user-friendly error messages and utilities for config issues.
 */

import boxen from 'boxen';
import chalk from 'chalk';

/**
 * Mask an API key for safe display.
 *
 * Shows first 11 characters (sk-ant-api0) and last 4 characters,
 * masking everything in between.
 *
 * @param key - The API key to mask
 * @returns Masked key string (e.g., "sk-ant-api0***...***xyz1")
 */
export function maskApiKey(key: string): string {
  if (!key || key.length <= 12) {
    return '***';
  }

  const prefix = key.slice(0, 11);
  const suffix = key.slice(-4);
  return `${prefix}***...***${suffix}`;
}

/**
 * Display a user-friendly error message when API key is missing.
 *
 * Shows a styled box with:
 * - What's needed (Anthropic API key)
 * - How to get one (link to console)
 * - Two configuration options (env var or config save command)
 * - Link to documentation
 */
export function displayMissingApiKeyError(): void {
  const message = `
${chalk.bold('API key required')}

ansible-craft needs an Anthropic API key to generate Ansible roles.

${chalk.yellow('To get an API key:')}
  1. Go to ${chalk.cyan('https://console.anthropic.com/')}
  2. Sign in or create an account
  3. Navigate to API Keys and create a new key

${chalk.yellow('To configure ansible-craft:')}
  ${chalk.dim('Option 1:')} Set environment variable
    ${chalk.green('export ANTHROPIC_API_KEY="sk-ant-..."')}

  ${chalk.dim('Option 2:')} Run setup wizard
    ${chalk.green('ansible-craft config save')}

${chalk.dim('Documentation: https://github.com/ansible-craft/ansible-craft#configuration')}
`;

  const box = boxen(message.trim(), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'yellow',
    title: 'Configuration Required',
    titleAlignment: 'center',
  });

  process.stderr.write(`${box}\n`);
}
