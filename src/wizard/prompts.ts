/**
 * Prompt utility functions for the role wizard.
 *
 * Provides individual prompt functions for collecting user preferences
 * during interactive role generation.
 */

import { Separator, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import type { RoleHandler, RolePlatform, RoleStructureDirectory } from './types.js';

/**
 * Display a styled step header with progress indication.
 *
 * @param current - Current step number (1-based)
 * @param total - Total number of steps
 * @param title - Step title to display
 */
export function showStepHeader(current: number, total: number, title: string): void {
  const percentage = Math.round((current / total) * 100);
  const separator = '='.repeat(60);

  console.log(chalk.cyan(`\n${separator}`));
  console.log(chalk.cyan.bold(`[${current}/${total}] ${title} (${percentage}% complete)`));
  console.log(chalk.cyan(`${separator}\n`));
}

/**
 * Prompt user to select role directories to generate.
 *
 * The `tasks` directory is pre-checked and required (cannot be unchecked).
 * All other directories are optional and unchecked by default.
 *
 * @returns Array of selected directory names
 */
export async function promptDirectories(): Promise<RoleStructureDirectory[]> {
  // Note: disabled items are excluded from checkbox answer array,
  // so we manually include 'tasks' in the result
  const selected = (await checkbox({
    message: 'Select role directories to generate:',
    choices: [
      {
        name: 'tasks - main role tasks (required)',
        value: 'tasks' as RoleStructureDirectory,
        checked: true,
        disabled: true,
      },
      {
        name: 'handlers - service restart/reload actions',
        value: 'handlers' as RoleStructureDirectory,
      },
      {
        name: 'templates - Jinja2 config templates',
        value: 'templates' as RoleStructureDirectory,
      },
      { name: 'files - static files to copy', value: 'files' as RoleStructureDirectory },
      { name: 'vars - role variables', value: 'vars' as RoleStructureDirectory },
      { name: 'defaults - default variable values', value: 'defaults' as RoleStructureDirectory },
      { name: 'meta - role metadata and dependencies', value: 'meta' as RoleStructureDirectory },
    ],
    pageSize: 10,
    loop: true,
  })) as RoleStructureDirectory[];

  // Always include 'tasks' since it's required (disabled items excluded from answer)
  // Filter to avoid duplicates in case behavior changes
  const withoutTasks = selected.filter((dir) => dir !== 'tasks');
  return ['tasks', ...withoutTasks];
}

/**
 * Prompt user to select target platforms for the role.
 *
 * At least one platform must be selected. The `Generic` option is
 * mutually exclusive with specific platforms - selecting Generic
 * indicates a platform-agnostic role.
 *
 * @returns Array of selected platform names
 */
export async function promptPlatforms(): Promise<RolePlatform[]> {
  return (await checkbox({
    message: 'Select target platforms (or Generic for platform-agnostic):',
    choices: [
      { name: 'Ubuntu', value: 'Ubuntu' as RolePlatform },
      { name: 'Debian', value: 'Debian' as RolePlatform },
      { name: 'RHEL/CentOS', value: 'RHEL' as RolePlatform },
      { name: 'Windows', value: 'Windows' as RolePlatform },
      new Separator(),
      { name: 'Generic - no platform-specific tasks', value: 'Generic' as RolePlatform },
    ],
    pageSize: 8,
    loop: true,
    validate: (answer: readonly RolePlatform[]) => {
      if (answer.length === 0) {
        return 'Select at least one platform';
      }

      // Generic is mutually exclusive with specific platforms
      if (answer.includes('Generic') && answer.length > 1) {
        return 'Generic cannot be combined with specific platforms';
      }

      return true;
    },
  })) as RolePlatform[];
}

/**
 * Prompt user to select handlers for service management.
 *
 * Handlers are optional - the user may select none if the role
 * does not need service management functionality.
 *
 * @returns Array of selected handler types
 */
export async function promptHandlers(): Promise<RoleHandler[]> {
  return (await checkbox({
    message: 'Select handlers needed for service management:',
    choices: [
      { name: 'restart - restart service', value: 'restart' as RoleHandler },
      { name: 'reload - reload service configuration', value: 'reload' as RoleHandler },
      { name: 'enable - enable service at boot', value: 'enable' as RoleHandler },
      { name: 'custom - custom handler actions', value: 'custom' as RoleHandler },
    ],
    pageSize: 6,
    loop: true,
  })) as RoleHandler[];
}
