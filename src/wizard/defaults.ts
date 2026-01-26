/**
 * Wizard defaults helper utilities.
 *
 * Provides functions for comparing, displaying, and generating
 * wizard defaults for --quick mode operation.
 */

import chalk from 'chalk';
import type { PlaybookWizardContext, ProjectWizardContext, RoleWizardContext } from './types.ts';

/**
 * Check if wizard context has changed from stored defaults.
 *
 * Uses JSON comparison for deep equality check.
 * Returns true if contexts differ or if no existing defaults.
 */
export function hasChangedFromDefaults<
  T extends RoleWizardContext | PlaybookWizardContext | ProjectWizardContext,
>(current: T, existing?: T): boolean {
  if (!existing) return true;
  return JSON.stringify(current) !== JSON.stringify(existing);
}

/**
 * Display wizard defaults preview before saving.
 */
export function displayDefaultsPreview(
  type: 'role' | 'playbook' | 'project',
  context: RoleWizardContext | PlaybookWizardContext | ProjectWizardContext,
): void {
  const typeLabel = type === 'role' ? 'Role' : type === 'playbook' ? 'Playbook' : 'Project';
  console.log(chalk.cyan(`\n  ${typeLabel} wizard choices:`));

  if (type === 'role') {
    const roleContext = context as RoleWizardContext;
    console.log(`    Structure:     ${chalk.dim(roleContext.structure.join(', ') || '(none)')}`);
    console.log(`    Platforms:     ${chalk.dim(roleContext.platforms.join(', ') || '(none)')}`);
    console.log(`    Handlers:      ${chalk.dim(roleContext.handlers.join(', ') || '(none)')}`);
    console.log(
      `    Ansible Ver:   ${chalk.dim(roleContext.ansibleVersion.minimum)}${roleContext.ansibleVersion.includeVersionCheck ? ' (with check)' : ''}`,
    );
    console.log(
      `    Variables:     ${chalk.dim(roleContext.variableStrategy.naming)} naming${roleContext.variableStrategy.includeDefaults ? ', defaults' : ''}${roleContext.variableStrategy.includeVars ? ', vars' : ''}`,
    );
    console.log(
      `    Privilege:     ${chalk.dim(roleContext.privilegeEscalation.required)}${roleContext.privilegeEscalation.becomeUser ? ` (${roleContext.privilegeEscalation.becomeUser})` : ''}`,
    );
    console.log(
      `    Tags:          ${chalk.dim(roleContext.tags.strategy)}${roleContext.tags.groups?.length ? ` (${roleContext.tags.groups.join(', ')})` : ''}`,
    );
    console.log(
      `    Idempotency:   ${chalk.dim(
        [
          roleContext.idempotency.supportCheckMode ? 'check-mode' : null,
          roleContext.idempotency.includeChangedWhen ? 'changed_when' : null,
          roleContext.idempotency.includeFailedWhen ? 'failed_when' : null,
        ]
          .filter(Boolean)
          .join(', ') || '(none)',
      )}`,
    );
    console.log(
      `    Dependencies:  ${chalk.dim(roleContext.dependencies.includeMeta ? (roleContext.dependencies.roles.length > 0 ? roleContext.dependencies.roles.join(', ') : 'meta only') : 'no')}`,
    );
    const moleculeInfo = roleContext.molecule.enabled
      ? `${roleContext.molecule.level || 'basic'} ${roleContext.molecule.driver}${roleContext.molecule.verifier === 'testinfra' ? ' (testinfra)' : ''}`
      : 'disabled';
    console.log(`    Molecule:      ${chalk.dim(moleculeInfo)}`);
  } else if (type === 'playbook') {
    const playbookContext = context as PlaybookWizardContext;
    console.log(`    Hosts:     ${chalk.dim(playbookContext.hosts.join(', ') || '(none)')}`);
    console.log(`    Become:    ${chalk.dim(playbookContext.become ? 'yes' : 'no')}`);
    console.log(
      `    Handlers:  ${chalk.dim(playbookContext.includeHandlers ? 'include' : 'exclude')}`,
    );
  } else {
    const projectContext = context as ProjectWizardContext;
    console.log(`    Layout:        ${chalk.dim(projectContext.layout)}`);
    console.log(
      `    Environments:  ${chalk.dim(projectContext.environments.join(', ') || '(none)')}`,
    );
    console.log(`    Groups:        ${chalk.dim(projectContext.groups.join(', ') || '(none)')}`);
    console.log(
      `    Optional dirs: ${chalk.dim(projectContext.optionalDirs.join(', ') || '(none)')}`,
    );
    console.log(`    ansible.cfg:   ${chalk.dim(projectContext.includeAnsibleCfg ? 'yes' : 'no')}`);
    console.log(
      `    Sample files:  ${chalk.dim(projectContext.includeSampleFiles ? 'yes' : 'no')}`,
    );
  }
}

/**
 * Get hard-coded safe defaults for --quick mode when no saved defaults exist.
 *
 * These are conservative defaults suitable for most use cases.
 */
export function getQuickModeDefaults(type: 'role'): RoleWizardContext;
export function getQuickModeDefaults(type: 'playbook'): PlaybookWizardContext;
export function getQuickModeDefaults(type: 'project'): ProjectWizardContext;
export function getQuickModeDefaults(
  type: 'role' | 'playbook' | 'project',
): RoleWizardContext | PlaybookWizardContext | ProjectWizardContext {
  if (type === 'role') {
    return {
      structure: ['tasks', 'handlers', 'defaults', 'meta'],
      platforms: ['Generic'],
      handlers: ['restart', 'reload'],
      ansibleVersion: {
        minimum: '2.14',
        includeVersionCheck: false,
      },
      variableStrategy: {
        includeDefaults: true,
        includeVars: false,
        naming: 'prefixed',
      },
      privilegeEscalation: {
        required: 'yes',
        becomeUser: 'root',
      },
      tags: {
        strategy: 'grouped',
        groups: ['install', 'config', 'service'],
      },
      idempotency: {
        supportCheckMode: true,
        includeChangedWhen: true,
        includeFailedWhen: false,
      },
      dependencies: {
        includeMeta: true,
        roles: [],
      },
      molecule: {
        enabled: true,
        level: 'basic',
        driver: 'docker',
        useAnsibleImages: true,
        privileged: false,
        testSequence: ['create', 'converge', 'idempotence', 'verify', 'destroy'],
        verifier: 'ansible',
        platforms: ['Generic'],
        scenarios: ['default', 'idempotence'],
      },
      custom: {},
    };
  }

  if (type === 'playbook') {
    return {
      hosts: ['all'],
      become: false,
      includeHandlers: true,
      custom: {},
    };
  }

  // Project defaults
  return {
    layout: 'single',
    environments: ['production', 'staging'],
    groups: ['webservers', 'databases'],
    optionalDirs: [],
    includeAnsibleCfg: true,
    includeSampleFiles: true,
    custom: {},
  };
}

/**
 * Current wizard defaults schema version.
 * Increment when adding new fields or changing structure.
 */
export const WIZARD_DEFAULTS_VERSION = 3;
