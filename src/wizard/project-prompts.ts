/**
 * Prompt utility functions for the project wizard.
 *
 * Provides individual prompt functions for collecting user preferences
 * during interactive project structure generation.
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type { ProjectLayout, ProjectOptionalDir } from './types.js';

/**
 * Prompt user to select project layout type.
 *
 * @returns Selected layout type ('single' or 'multi')
 */
export async function promptLayout(): Promise<ProjectLayout> {
  return (await select({
    message: 'Select project layout:',
    choices: [
      {
        name: 'Single environment - inventories at root level',
        value: 'single' as ProjectLayout,
        description: 'Simpler structure with production, staging files at root',
      },
      {
        name: 'Multi-environment - separate inventory directories',
        value: 'multi' as ProjectLayout,
        description: 'Organized structure with inventories/production/, etc.',
      },
    ],
  })) as ProjectLayout;
}

/**
 * Prompt user to select environments to create.
 *
 * @returns Array of selected environment names
 */
export async function promptEnvironments(): Promise<string[]> {
  const selected = await checkbox({
    message: 'Select environments to create:',
    choices: [
      { name: 'production', value: 'production', checked: true },
      { name: 'staging', value: 'staging', checked: true },
      { name: 'development', value: 'development' },
      { name: 'testing', value: 'testing' },
    ],
    validate: (answer: readonly string[]) => {
      if (answer.length === 0) {
        return 'Select at least one environment';
      }
      return true;
    },
  });

  return selected as string[];
}

/**
 * Prompt user to enter initial inventory groups.
 *
 * @returns Array of group names
 */
export async function promptGroups(): Promise<string[]> {
  const groupsInput = await input({
    message: 'Enter initial inventory groups (comma-separated):',
    default: 'webservers,databases',
    validate: (value: string) => {
      const trimmed = value.trim();
      if (trimmed.length === 0) {
        return true; // Allow empty - will return empty array
      }

      // Validate group names (alphanumeric, underscores, hyphens)
      const groups = trimmed.split(',').map((g) => g.trim());
      const invalidGroup = groups.find((g) => !/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(g));
      if (invalidGroup) {
        return `Invalid group name: "${invalidGroup}". Use letters, numbers, underscores, hyphens (start with letter)`;
      }

      return true;
    },
  });

  const trimmed = groupsInput.trim();
  if (trimmed.length === 0) {
    return [];
  }

  return trimmed.split(',').map((g) => g.trim());
}

/**
 * Prompt user to select optional directories to include.
 *
 * @returns Array of selected optional directory names
 */
export async function promptOptionalDirs(): Promise<ProjectOptionalDir[]> {
  return (await checkbox({
    message: 'Include optional directories:',
    choices: [
      {
        name: 'library/ - custom modules',
        value: 'library' as ProjectOptionalDir,
      },
      {
        name: 'module_utils/ - module utilities',
        value: 'module_utils' as ProjectOptionalDir,
      },
      {
        name: 'filter_plugins/ - custom filters',
        value: 'filter_plugins' as ProjectOptionalDir,
      },
    ],
  })) as ProjectOptionalDir[];
}

/**
 * Prompt user whether to include ansible.cfg file.
 *
 * @returns Boolean indicating whether to include ansible.cfg
 */
export async function promptAnsibleCfg(): Promise<boolean> {
  return await confirm({
    message: 'Include ansible.cfg configuration file?',
    default: true,
  });
}

/**
 * Prompt user whether to include sample files.
 *
 * Sample files contain placeholder content to help users get started.
 *
 * @returns Boolean indicating whether to include sample content
 */
export async function promptSampleFiles(): Promise<boolean> {
  console.log(
    chalk.dim('  Sample files include placeholder hosts, group_vars, and example playbooks'),
  );

  return await confirm({
    message: 'Include sample files with placeholder content?',
    default: true,
  });
}
