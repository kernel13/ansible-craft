/**
 * Wizard type definitions, validation schemas, and prompt formatters.
 *
 * Provides type-safe wizard context for collecting user requirements
 * before generating Ansible roles and playbooks.
 */

import { z } from 'zod';

/**
 * Supported role directory structure elements.
 */
export type RoleStructureDirectory =
  | 'tasks'
  | 'handlers'
  | 'templates'
  | 'files'
  | 'defaults'
  | 'vars'
  | 'meta';

/**
 * Supported target platforms.
 */
export type RolePlatform = 'Ubuntu' | 'RHEL' | 'Debian' | 'Windows' | 'Generic';

/**
 * Handler types that can be configured.
 */
export type RoleHandler = 'restart' | 'reload' | 'enable' | 'custom';

/**
 * Molecule test driver options.
 */
export type MoleculeDriver = 'docker' | 'podman' | 'vagrant' | 'delegated';

/**
 * Molecule test scenario types.
 */
export type MoleculeScenario = 'default' | 'side_effect' | 'idempotence';

/**
 * Variable naming convention options.
 */
export type VariableNaming = 'flat' | 'prefixed';

/**
 * Task tagging strategy options.
 */
export type TagStrategy = 'none' | 'per-task' | 'grouped' | 'always';

/**
 * Privilege escalation requirement options.
 */
export type BecomeRequirement = 'yes' | 'no' | 'sometimes';

/**
 * Supported Ansible versions.
 */
export type AnsibleVersion =
  | '2.9'
  | '2.10'
  | '2.11'
  | '2.12'
  | '2.13'
  | '2.14'
  | '2.15'
  | '2.16'
  | '2.17';

/**
 * Ansible version configuration.
 */
export interface AnsibleVersionConfig {
  /** Minimum required Ansible version */
  minimum: AnsibleVersion;
  /** Whether to include version check task */
  includeVersionCheck: boolean;
}

/**
 * Variable strategy configuration.
 */
export interface VariableStrategyConfig {
  /** Include defaults directory for overridable vars */
  includeDefaults: boolean;
  /** Include vars directory for internal vars */
  includeVars: boolean;
  /** Variable naming convention */
  naming: VariableNaming;
}

/**
 * Privilege escalation configuration.
 */
export interface PrivilegeEscalationConfig {
  /** Whether privilege escalation is required */
  required: BecomeRequirement;
  /** Default become user (when required is yes/sometimes) */
  becomeUser?: string;
}

/**
 * Tags configuration.
 */
export interface TagsConfig {
  /** Tagging strategy */
  strategy: TagStrategy;
  /** Tag groups (when strategy is grouped) */
  groups?: string[];
}

/**
 * Idempotency configuration.
 */
export interface IdempotencyConfig {
  /** Support check mode (--check) */
  supportCheckMode: boolean;
  /** Include changed_when conditions */
  includeChangedWhen: boolean;
  /** Include failed_when conditions */
  includeFailedWhen: boolean;
}

/**
 * Role dependencies configuration.
 */
export interface DependenciesConfig {
  /** Include meta/main.yml with dependencies */
  includeMeta: boolean;
  /** List of role dependencies */
  roles: string[];
}

/**
 * Molecule testing configuration.
 */
export interface MoleculeConfig {
  /** Whether molecule testing is enabled */
  enabled: boolean;
  /** Test driver (when enabled) */
  driver?: MoleculeDriver;
  /** Test platforms (when enabled) */
  platforms?: RolePlatform[];
  /** Test scenarios (when enabled) */
  scenarios?: MoleculeScenario[];
}

/**
 * Role wizard context collected through interactive prompts.
 */
export interface RoleWizardContext {
  /** Selected role directory structure elements */
  structure: RoleStructureDirectory[];
  /** Target platforms for the role */
  platforms: RolePlatform[];
  /** Handler types needed in the role */
  handlers: RoleHandler[];

  /** Ansible version configuration */
  ansibleVersion: AnsibleVersionConfig;
  /** Variable strategy configuration */
  variableStrategy: VariableStrategyConfig;
  /** Privilege escalation configuration */
  privilegeEscalation: PrivilegeEscalationConfig;
  /** Tags configuration */
  tags: TagsConfig;
  /** Idempotency configuration */
  idempotency: IdempotencyConfig;
  /** Dependencies configuration */
  dependencies: DependenciesConfig;
  /** Molecule testing configuration */
  molecule: MoleculeConfig;

  /** Extensibility field for future wizard data */
  custom: Record<string, string>;
}

/**
 * Playbook wizard context collected through interactive prompts.
 */
export interface PlaybookWizardContext {
  /** Inventory groups to target */
  hosts: string[];
  /** Whether privilege escalation is needed */
  become: boolean;
  /** Whether to include handlers in the playbook */
  includeHandlers: boolean;
  /** Extensibility field for future wizard data */
  custom: Record<string, string>;
}

// Zod schemas for runtime validation

/**
 * Zod schema for role structure directory validation.
 */
export const roleStructureDirectorySchema = z.enum([
  'tasks',
  'handlers',
  'templates',
  'files',
  'defaults',
  'vars',
  'meta',
]);

/**
 * Zod schema for platform validation.
 */
export const rolePlatformSchema = z.enum(['Ubuntu', 'RHEL', 'Debian', 'Windows', 'Generic']);

/**
 * Zod schema for handler type validation.
 */
export const roleHandlerSchema = z.enum(['restart', 'reload', 'enable', 'custom']);

/**
 * Zod schema for molecule driver validation.
 */
export const moleculeDriverSchema = z.enum(['docker', 'podman', 'vagrant', 'delegated']);

/**
 * Zod schema for molecule scenario validation.
 */
export const moleculeScenarioSchema = z.enum(['default', 'side_effect', 'idempotence']);

/**
 * Zod schema for variable naming convention validation.
 */
export const variableNamingSchema = z.enum(['flat', 'prefixed']);

/**
 * Zod schema for tag strategy validation.
 */
export const tagStrategySchema = z.enum(['none', 'per-task', 'grouped', 'always']);

/**
 * Zod schema for become requirement validation.
 */
export const becomeRequirementSchema = z.enum(['yes', 'no', 'sometimes']);

/**
 * Zod schema for Ansible version validation.
 */
export const ansibleVersionSchema = z.enum([
  '2.9',
  '2.10',
  '2.11',
  '2.12',
  '2.13',
  '2.14',
  '2.15',
  '2.16',
  '2.17',
]);

/**
 * Zod schema for Ansible version config.
 */
export const ansibleVersionConfigSchema = z.object({
  minimum: ansibleVersionSchema,
  includeVersionCheck: z.boolean(),
});

/**
 * Zod schema for variable strategy config.
 */
export const variableStrategyConfigSchema = z.object({
  includeDefaults: z.boolean(),
  includeVars: z.boolean(),
  naming: variableNamingSchema,
});

/**
 * Zod schema for privilege escalation config.
 */
export const privilegeEscalationConfigSchema = z.object({
  required: becomeRequirementSchema,
  becomeUser: z.string().optional(),
});

/**
 * Zod schema for tags config.
 */
export const tagsConfigSchema = z.object({
  strategy: tagStrategySchema,
  groups: z.array(z.string()).optional(),
});

/**
 * Zod schema for idempotency config.
 */
export const idempotencyConfigSchema = z.object({
  supportCheckMode: z.boolean(),
  includeChangedWhen: z.boolean(),
  includeFailedWhen: z.boolean(),
});

/**
 * Zod schema for dependencies config.
 */
export const dependenciesConfigSchema = z.object({
  includeMeta: z.boolean(),
  roles: z.array(z.string()),
});

/**
 * Zod schema for molecule config.
 */
export const moleculeConfigSchema = z.object({
  enabled: z.boolean(),
  driver: moleculeDriverSchema.optional(),
  platforms: z.array(rolePlatformSchema).optional(),
  scenarios: z.array(moleculeScenarioSchema).optional(),
});

/**
 * Zod schema for role wizard context validation with strict mode.
 */
export const roleWizardSchema = z
  .object({
    structure: z.array(roleStructureDirectorySchema),
    platforms: z.array(rolePlatformSchema),
    handlers: z.array(roleHandlerSchema),
    ansibleVersion: ansibleVersionConfigSchema,
    variableStrategy: variableStrategyConfigSchema,
    privilegeEscalation: privilegeEscalationConfigSchema,
    tags: tagsConfigSchema,
    idempotency: idempotencyConfigSchema,
    dependencies: dependenciesConfigSchema,
    molecule: moleculeConfigSchema,
    custom: z.record(z.string(), z.string()),
  })
  .strict();

/**
 * Zod schema for playbook wizard context validation with strict mode.
 */
export const playbookWizardSchema = z
  .object({
    hosts: z.array(z.string()),
    become: z.boolean(),
    includeHandlers: z.boolean(),
    custom: z.record(z.string(), z.string()),
  })
  .strict();

// Export inferred types from Zod schemas for consistency
export type RoleWizardContextValidated = z.infer<typeof roleWizardSchema>;
export type PlaybookWizardContextValidated = z.infer<typeof playbookWizardSchema>;

/**
 * Convert role wizard context to clarifications format for prompt builders.
 *
 * Formats wizard context as terse key-value pairs optimized for token efficiency.
 * The returned Record<string, string> can be passed directly to prompt builders
 * like generateRolePlan() and buildPlanPrompt().
 *
 * @param context - Validated role wizard context
 * @returns Record of clarifications for AI prompt
 *
 * @example
 * ```typescript
 * const context: RoleWizardContext = {
 *   structure: ['tasks', 'handlers'],
 *   platforms: ['Ubuntu', 'RHEL'],
 *   handlers: ['restart'],
 *   // ... other fields
 *   custom: {}
 * };
 * const clarifications = formatRoleContextForPrompt(context);
 * // Returns formatted key-value pairs for AI prompt
 * ```
 */
export function formatRoleContextForPrompt(context: RoleWizardContext): Record<string, string> {
  const result: Record<string, string> = {};

  // Format arrays as comma-separated strings
  if (context.structure.length > 0) {
    result.structure = context.structure.join(', ');
  }

  if (context.platforms.length > 0) {
    result.platforms = context.platforms.join(', ');
  }

  if (context.handlers.length > 0) {
    result.handlers = context.handlers.join(', ');
  }

  // Ansible version settings
  result.ansible_min_version = context.ansibleVersion.minimum;
  if (context.ansibleVersion.includeVersionCheck) {
    result.ansible_version_check = 'include version check task';
  }

  // Variable strategy
  const varStrategy: string[] = [];
  if (context.variableStrategy.includeDefaults) {
    varStrategy.push('defaults');
  }
  if (context.variableStrategy.includeVars) {
    varStrategy.push('vars');
  }
  if (varStrategy.length > 0) {
    result.variable_directories = varStrategy.join(', ');
  }
  result.variable_naming =
    context.variableStrategy.naming === 'prefixed' ? 'prefixed by role name' : 'flat';

  // Privilege escalation
  result.privilege_escalation = context.privilegeEscalation.required;
  if (context.privilegeEscalation.becomeUser) {
    result.become_user = context.privilegeEscalation.becomeUser;
  }

  // Tags configuration
  result.tag_strategy = context.tags.strategy;
  if (context.tags.groups && context.tags.groups.length > 0) {
    result.tag_groups = context.tags.groups.join(', ');
  }

  // Idempotency settings
  const idempotencyFlags: string[] = [];
  if (context.idempotency.supportCheckMode) {
    idempotencyFlags.push('check mode support');
  }
  if (context.idempotency.includeChangedWhen) {
    idempotencyFlags.push('changed_when conditions');
  }
  if (context.idempotency.includeFailedWhen) {
    idempotencyFlags.push('failed_when conditions');
  }
  if (idempotencyFlags.length > 0) {
    result.idempotency = idempotencyFlags.join(', ');
  }

  // Dependencies
  if (context.dependencies.includeMeta) {
    result.include_meta = 'yes';
    if (context.dependencies.roles.length > 0) {
      result.role_dependencies = context.dependencies.roles.join(', ');
    }
  }

  // Molecule testing
  if (context.molecule.enabled) {
    result.molecule_testing = 'enabled';
    if (context.molecule.driver) {
      result.molecule_driver = context.molecule.driver;
    }
    if (context.molecule.platforms && context.molecule.platforms.length > 0) {
      result.molecule_platforms = context.molecule.platforms.join(', ');
    }
    if (context.molecule.scenarios && context.molecule.scenarios.length > 0) {
      result.molecule_scenarios = context.molecule.scenarios.join(', ');
    }
  } else {
    result.molecule_testing = 'disabled';
  }

  // Include custom fields if non-empty
  if (Object.keys(context.custom).length > 0) {
    Object.assign(result, context.custom);
  }

  return result;
}

/**
 * Convert playbook wizard context to clarifications format for prompt builders.
 *
 * Formats wizard context as terse key-value pairs optimized for token efficiency.
 * Uses Ansible conventions (yes/no) for boolean values.
 *
 * @param context - Validated playbook wizard context
 * @returns Record of clarifications for AI prompt
 *
 * @example
 * ```typescript
 * const context: PlaybookWizardContext = {
 *   hosts: ['webservers', 'databases'],
 *   become: true,
 *   includeHandlers: false,
 *   custom: {}
 * };
 * const clarifications = formatPlaybookContextForPrompt(context);
 * // Returns: {
 * //   hosts: 'webservers, databases',
 * //   become: 'yes',
 * //   handlers: 'exclude'
 * // }
 * ```
 */
export function formatPlaybookContextForPrompt(
  context: PlaybookWizardContext,
): Record<string, string> {
  const result: Record<string, string> = {};

  // Format hosts as comma-separated string
  if (context.hosts.length > 0) {
    result.hosts = context.hosts.join(', ');
  }

  // Use Ansible convention for boolean values
  result.become = context.become ? 'yes' : 'no';

  // Format handler inclusion
  result.handlers = context.includeHandlers ? 'include' : 'exclude';

  // Include custom fields if non-empty
  if (Object.keys(context.custom).length > 0) {
    Object.assign(result, context.custom);
  }

  return result;
}
