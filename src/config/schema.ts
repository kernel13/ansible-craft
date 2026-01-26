/**
 * Configuration type definitions for ansible-craft
 */

import type {
  PlaybookWizardContext,
  ProjectWizardContext,
  RoleWizardContext,
} from '../wizard/types.ts';

export interface ApiConfig {
  key?: string;
}

/**
 * Wizard defaults storage for reusable preferences.
 */
export interface WizardDefaults {
  /** Schema version for migration support */
  defaults_version: number;
  /** Saved role wizard preferences */
  role?: RoleWizardContext;
  /** Saved playbook wizard preferences */
  playbook?: PlaybookWizardContext;
  /** Saved project wizard preferences */
  project?: ProjectWizardContext;
}

export interface DefaultsConfig {
  model: 'sonnet' | 'opus';
  complex: boolean;
  /** Optional wizard defaults for --quick mode */
  wizard?: WizardDefaults;
}

export interface OutputConfig {
  format: 'plain' | 'json';
  verbose: boolean;
  dry_run: boolean;
}

export interface Config {
  api: ApiConfig;
  defaults: DefaultsConfig;
  output: OutputConfig;
}
