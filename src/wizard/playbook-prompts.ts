/**
 * Prompt utility functions for the playbook wizard.
 *
 * Provides individual prompt functions for collecting user preferences
 * during interactive playbook generation.
 */

import { confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';

/**
 * Prompt user to enter target hosts or inventory pattern.
 *
 * Required input - user must provide a non-empty host pattern.
 * Warns (but allows) if input contains shell metacharacters.
 *
 * @returns Target host pattern string
 *
 * @example
 * ```typescript
 * const hosts = await promptHosts();
 * // Returns: "webservers"
 * // Returns: "web*:&staging"
 * ```
 */
export async function promptHosts(): Promise<string> {
  return await input({
    message: 'Enter target hosts or inventory pattern:',
    validate: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Host pattern is required';
      }

      // Warn about suspicious characters but allow submission
      const shellMetachars = /[|;$`]/;
      if (shellMetachars.test(value)) {
        console.log(
          chalk.dim('\n⚠️  Warning: Host pattern contains shell metacharacters (|, ;, $, `)'),
        );
      }

      return true;
    },
    theme: {
      placeholder: chalk.dim('e.g., webservers, databases, web*:&staging'),
    },
  });
}

/**
 * Prompt user for privilege escalation settings.
 *
 * First asks if privilege escalation is needed, then optionally
 * asks for the become user if enabled.
 *
 * @returns Object with become flag and optional becomeUser
 *
 * @example
 * ```typescript
 * const result = await promptBecome();
 * // User selects No: { become: false }
 * // User selects Yes, enters "deploy": { become: true, becomeUser: "deploy" }
 * // User selects Yes, empty input: { become: true, becomeUser: undefined }
 * ```
 */
export async function promptBecome(): Promise<{
  become: boolean;
  becomeUser?: string;
}> {
  const become = await confirm({
    message: 'Enable privilege escalation (become)?',
    default: false,
  });

  if (!become) {
    return { become: false };
  }

  // Ask for become user if privilege escalation is enabled
  const becomeUser = await input({
    message: 'Become user (default: root):',
    theme: {
      placeholder: chalk.dim('press Enter for root'),
    },
  });

  // Empty input means use default (root)
  const trimmedUser = becomeUser.trim();
  return {
    become: true,
    becomeUser: trimmedUser.length > 0 ? trimmedUser : undefined,
  };
}

/**
 * Prompt user to describe handlers needed in the playbook.
 *
 * Optional input - user can press Enter to skip handler generation.
 * Warns (but allows) if input looks like YAML code instead of natural language.
 *
 * @returns Handler description string or undefined if skipped
 *
 * @example
 * ```typescript
 * const description = await promptHandlersDescription();
 * // User enters description: "restart nginx, reload config"
 * // User presses Enter: undefined
 * ```
 */
export async function promptHandlersDescription(): Promise<string | undefined> {
  const description = await input({
    message: 'Describe handlers needed (or press Enter to skip):',
    theme: {
      placeholder: chalk.dim('e.g., restart nginx, reload config'),
    },
  });

  const trimmed = description.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  // Warn if input looks like YAML (contains : followed by newline or starts with -)
  const looksLikeYaml = /:\s*\n|^-/.test(trimmed);
  if (looksLikeYaml) {
    console.log(chalk.dim('\n⚠️  Hint: Describe handlers in natural language, not YAML format'));
  }

  return trimmed;
}
