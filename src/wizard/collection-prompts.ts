/**
 * Prompt utility functions for the collection wizard.
 *
 * Provides individual prompt functions for collecting user preferences
 * during interactive collection generation.
 */

import { checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { CollectionTestingLevelSchema } from './types.js';

const execAsync = promisify(exec);

/**
 * Common SPDX license identifiers.
 */
export const COMMON_LICENSES = [
  { name: 'MIT License', value: 'MIT' },
  { name: 'Apache License 2.0', value: 'Apache-2.0' },
  { name: 'GNU General Public License v3.0', value: 'GPL-3.0-or-later' },
  { name: 'BSD 3-Clause License', value: 'BSD-3-Clause' },
  { name: 'BSD 2-Clause License', value: 'BSD-2-Clause' },
] as const;

/**
 * Get default author from git config.
 */
async function getDefaultAuthor(): Promise<string> {
  try {
    const { stdout: name } = await execAsync('git config user.name');
    const { stdout: email } = await execAsync('git config user.email');
    return `${name.trim()} <${email.trim()}>`;
  } catch {
    return '';
  }
}

/**
 * Prompt for collection namespace.
 * Must be lowercase, start with letter, contain only alphanumeric + underscore.
 */
export async function promptNamespace(defaultValue?: string): Promise<string> {
  return input({
    message: 'Collection namespace (e.g., mycompany):',
    default: defaultValue,
    validate: (value) => {
      if (!value || value.length === 0) {
        return 'Namespace is required';
      }
      if (!/^[a-z][a-z0-9_]*$/.test(value)) {
        return 'Namespace must start with a letter and contain only lowercase letters, numbers, and underscores';
      }
      if (value.length > 50) {
        return 'Namespace must be 50 characters or less';
      }
      return true;
    },
  });
}

/**
 * Prompt for collection name.
 * Must be lowercase, start with letter, contain only alphanumeric + underscore.
 */
export async function promptCollectionName(defaultValue?: string): Promise<string> {
  return input({
    message: 'Collection name (e.g., web_utils):',
    default: defaultValue,
    validate: (value) => {
      if (!value || value.length === 0) {
        return 'Collection name is required';
      }
      if (!/^[a-z][a-z0-9_]*$/.test(value)) {
        return 'Collection name must start with a letter and contain only lowercase letters, numbers, and underscores';
      }
      if (value.length > 50) {
        return 'Collection name must be 50 characters or less';
      }
      return true;
    },
  });
}

/**
 * Prompt for semantic version.
 */
export async function promptVersion(defaultValue = '1.0.0'): Promise<string> {
  return input({
    message: 'Collection version (semantic versioning):',
    default: defaultValue,
    validate: (value) => {
      if (!/^\d+\.\d+\.\d+$/.test(value)) {
        return 'Version must follow semantic versioning format (MAJOR.MINOR.PATCH), e.g., "1.0.0"';
      }
      return true;
    },
  });
}

/**
 * Prompt for collection description.
 */
export async function promptDescription(): Promise<string> {
  return input({
    message: 'Collection description:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'Description is required';
      }
      return true;
    },
  });
}

/**
 * Prompt for license selection.
 */
export async function promptLicense(): Promise<string[]> {
  return checkbox({
    message: 'Select license(s):',
    choices: COMMON_LICENSES,
    required: true,
    validate: (value) => {
      if (value.length === 0) {
        return 'At least one license is required';
      }
      return true;
    },
  });
}

/**
 * Prompt for collection authors.
 */
export async function promptAuthors(): Promise<string[]> {
  const defaultAuthor = await getDefaultAuthor();
  const authors: string[] = [];

  console.log(chalk.dim('Enter authors one at a time. Press Enter with empty input to finish.'));

  // First author (required)
  const firstAuthor = await input({
    message: 'Author (name or name <email>):',
    default: defaultAuthor,
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return 'At least one author is required';
      }
      return true;
    },
  });
  authors.push(firstAuthor);

  // Additional authors (optional)
  while (true) {
    const author = await input({
      message: `Author ${authors.length + 1} (or press Enter to finish):`,
      default: '',
    });

    if (!author || author.trim().length === 0) {
      break;
    }

    authors.push(author);
  }

  return authors;
}

/**
 * Prompt for plugin types to include.
 */
export async function promptPlugins(): Promise<{
  includeModules: boolean;
  includeFilterPlugins: boolean;
  includeInventoryPlugins: boolean;
  includeLookupPlugins: boolean;
  includeTestPlugins: boolean;
}> {
  const selected = await checkbox({
    message: 'Select plugin types to include:',
    choices: [
      { name: 'Modules - Custom Ansible modules', value: 'modules', checked: true },
      { name: 'Filter plugins - Jinja2 filters', value: 'filter' },
      { name: 'Inventory plugins - Custom inventory sources', value: 'inventory' },
      { name: 'Lookup plugins - Data lookup mechanisms', value: 'lookup' },
      { name: 'Test plugins - Jinja2 tests', value: 'test' },
    ],
  });

  return {
    includeModules: selected.includes('modules'),
    includeFilterPlugins: selected.includes('filter'),
    includeInventoryPlugins: selected.includes('inventory'),
    includeLookupPlugins: selected.includes('lookup'),
    includeTestPlugins: selected.includes('test'),
  };
}

/**
 * Prompt for role scaffolding.
 */
export async function promptRoles(): Promise<{ includeRoles: boolean; roleNames: string[] }> {
  const includeRoles = await confirm({
    message: 'Include roles in this collection?',
    default: false,
  });

  if (!includeRoles) {
    return { includeRoles: false, roleNames: [] };
  }

  const roleNames: string[] = [];
  console.log(chalk.dim('Enter role names one at a time. Press Enter with empty input to finish.'));

  while (true) {
    const roleName = await input({
      message: `Role ${roleNames.length + 1} name (or press Enter to finish):`,
      default: '',
      validate: (value) => {
        if (value && !/^[a-z][a-z0-9_]*$/.test(value)) {
          return 'Role name must start with a letter and contain only lowercase letters, numbers, and underscores';
        }
        return true;
      },
    });

    if (!roleName || roleName.trim().length === 0) {
      if (roleNames.length === 0) {
        console.log(chalk.yellow('No roles will be scaffolded.'));
      }
      break;
    }

    roleNames.push(roleName);
  }

  return { includeRoles, roleNames };
}

/**
 * Prompt for collection dependencies.
 */
export async function promptDependencies(): Promise<Record<string, string>> {
  const hasDependencies = await confirm({
    message: 'Does this collection have dependencies on other collections?',
    default: false,
  });

  if (!hasDependencies) {
    return {};
  }

  const dependencies: Record<string, string> = {};
  console.log(
    chalk.dim(
      'Enter dependencies as "namespace.name:version". Press Enter with empty input to finish.',
    ),
  );

  while (true) {
    const dep = await input({
      message: `Dependency ${Object.keys(dependencies).length + 1} (or press Enter to finish):`,
      default: '',
      validate: (value) => {
        if (value && !/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*:\S+$/.test(value)) {
          return 'Dependency must be in format "namespace.name:version"';
        }
        return true;
      },
    });

    if (!dep || dep.trim().length === 0) {
      break;
    }

    const [fqcn, version] = dep.split(':');
    dependencies[fqcn] = version;
  }

  return dependencies;
}

/**
 * Prompt for testing level.
 */
export async function promptTesting(): Promise<'none' | 'basic' | 'molecule'> {
  return select({
    message: 'Testing configuration:',
    choices: [
      { name: 'None - No test structure', value: 'none' as const },
      { name: 'Basic - Integration test structure', value: 'basic' as const },
      { name: 'Molecule - Full Molecule testing', value: 'molecule' as const },
    ],
    default: 'basic' as const,
  });
}

/**
 * Prompt for runtime configuration.
 */
export async function promptRuntime(): Promise<{
  includeRuntime: boolean;
  requiresAnsible?: string;
}> {
  const includeRuntime = await confirm({
    message: 'Include meta/runtime.yml (Ansible version requirements)?',
    default: true,
  });

  if (!includeRuntime) {
    return { includeRuntime: false };
  }

  const requiresAnsible = await input({
    message: 'Minimum Ansible version (e.g., ">=2.9", or press Enter to skip):',
    default: '>=2.9',
    validate: (value) => {
      if (value && !/^[><=]+\d+\.\d+/.test(value)) {
        return 'Version constraint must start with >=, >, <=, < or = followed by version number';
      }
      return true;
    },
  });

  return {
    includeRuntime: true,
    requiresAnsible: requiresAnsible || undefined,
  };
}

/**
 * Prompt for documentation.
 */
export async function promptDocumentation(): Promise<{
  includeDocs: boolean;
  includeChangelog: boolean;
}> {
  const includeDocs = await confirm({
    message: 'Include docs/ directory with documentation templates?',
    default: true,
  });

  const includeChangelog = await confirm({
    message: 'Include CHANGELOG.md?',
    default: true,
  });

  return { includeDocs, includeChangelog };
}
