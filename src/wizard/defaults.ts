/**
 * Wizard defaults helper utilities.
 *
 * Provides functions for comparing, displaying, and generating
 * wizard defaults for --quick mode operation.
 */

import chalk from 'chalk';
import type { PlaybookWizardContext, RoleWizardContext } from './types.ts';

/**
 * Check if wizard context has changed from stored defaults.
 *
 * Uses JSON comparison for deep equality check.
 * Returns true if contexts differ or if no existing defaults.
 */
export function hasChangedFromDefaults<T extends RoleWizardContext | PlaybookWizardContext>(
  current: T,
  existing?: T,
): boolean {
  if (!existing) return true;
  return JSON.stringify(current) !== JSON.stringify(existing);
}

/**
 * Display wizard defaults preview before saving.
 */
export function displayDefaultsPreview(
  type: 'role' | 'playbook',
  context: RoleWizardContext | PlaybookWizardContext,
): void {
  console.log(chalk.cyan(`\n  ${type === 'role' ? 'Role' : 'Playbook'} wizard choices:`));

  if (type === 'role') {
    const roleContext = context as RoleWizardContext;
    console.log(`    Structure: ${chalk.dim(roleContext.structure.join(', ') || '(none)')}`);
    console.log(`    Platforms: ${chalk.dim(roleContext.platforms.join(', ') || '(none)')}`);
    console.log(`    Handlers:  ${chalk.dim(roleContext.handlers.join(', ') || '(none)')}`);
  } else {
    const playbookContext = context as PlaybookWizardContext;
    console.log(`    Hosts:     ${chalk.dim(playbookContext.hosts.join(', ') || '(none)')}`);
    console.log(`    Become:    ${chalk.dim(playbookContext.become ? 'yes' : 'no')}`);
    console.log(`    Handlers:  ${chalk.dim(playbookContext.includeHandlers ? 'include' : 'exclude')}`);
  }
}

/**
 * Get hard-coded safe defaults for --quick mode when no saved defaults exist.
 *
 * These are conservative defaults suitable for most use cases.
 */
export function getQuickModeDefaults(type: 'role'): RoleWizardContext;
export function getQuickModeDefaults(type: 'playbook'): PlaybookWizardContext;
export function getQuickModeDefaults(
  type: 'role' | 'playbook',
): RoleWizardContext | PlaybookWizardContext {
  if (type === 'role') {
    return {
      structure: ['tasks', 'handlers', 'defaults', 'meta'],
      platforms: ['Generic'],
      handlers: ['restart', 'reload'],
      custom: {},
    };
  }

  return {
    hosts: ['all'],
    become: false,
    includeHandlers: true,
    custom: {},
  };
}

/**
 * Current wizard defaults schema version.
 * Increment when adding new fields or changing structure.
 */
export const WIZARD_DEFAULTS_VERSION = 1;
