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
 * Molecule testing level options.
 */
export type MoleculeTestLevel = 'none' | 'basic' | 'advanced';

/**
 * Molecule verifier options.
 */
export type MoleculeVerifier = 'ansible' | 'testinfra';

/**
 * Vagrant provider options.
 */
export type VagrantProvider = 'virtualbox' | 'libvirt' | 'parallels';

/**
 * Vagrant resource preset options.
 */
export type VagrantResourcePreset = 'minimal' | 'standard' | 'powerful';

/**
 * Molecule test stage options (full test sequence).
 */
export type MoleculeTestStage =
  | 'dependency'
  | 'cleanup'
  | 'destroy'
  | 'create'
  | 'prepare'
  | 'converge'
  | 'idempotence'
  | 'side_effect'
  | 'verify';

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
 * Platform-specific Molecule image/box configuration.
 */
export interface MoleculePlatformConfig {
  /** Target platform */
  platform: RolePlatform;
  /** Container image or Vagrant box */
  image: string;
}

/**
 * Molecule testing configuration.
 */
export interface MoleculeConfig {
  /** Whether molecule testing is enabled */
  enabled: boolean;
  /** Testing level (none, basic, advanced) */
  level?: MoleculeTestLevel;
  /** Test driver (when enabled) */
  driver?: MoleculeDriver;

  // Platform-specific image/box configuration
  /** Platform configurations with custom images/boxes */
  platformConfigs?: MoleculePlatformConfig[];
  /** Whether to use pre-built Ansible test images */
  useAnsibleImages?: boolean;

  // Container options (docker/podman)
  /** Enable privileged mode for systemd */
  privileged?: boolean;
  /** Run in rootless mode (podman only) */
  rootless?: boolean;

  // Vagrant options
  /** Vagrant provider (virtualbox/libvirt/parallels) */
  vagrantProvider?: VagrantProvider;
  /** Vagrant VM memory in MB */
  vagrantMemory?: number;
  /** Vagrant VM CPU count */
  vagrantCpus?: number;

  // Delegated options
  /** Whether instances are managed by Molecule */
  delegatedManaged?: boolean;

  // Test execution options
  /** Custom test sequence stages */
  testSequence?: MoleculeTestStage[];
  /** Verifier type (ansible or testinfra) */
  verifier?: MoleculeVerifier;

  // Backward compatibility (derived from new fields)
  /** Test platforms (when enabled) - derived from platformConfigs */
  platforms?: RolePlatform[];
  /** Test scenarios (when enabled) - derived from testSequence */
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

  /** Features selected from research findings */
  selectedFeatures?: string[];
  /** Packages selected from research findings */
  selectedPackages?: string[];

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
 * Zod schema for molecule test level validation.
 */
export const moleculeTestLevelSchema = z.enum(['none', 'basic', 'advanced']);

/**
 * Zod schema for molecule verifier validation.
 */
export const moleculeVerifierSchema = z.enum(['ansible', 'testinfra']);

/**
 * Zod schema for vagrant provider validation.
 */
export const vagrantProviderSchema = z.enum(['virtualbox', 'libvirt', 'parallels']);

/**
 * Zod schema for vagrant resource preset validation.
 */
export const vagrantResourcePresetSchema = z.enum(['minimal', 'standard', 'powerful']);

/**
 * Zod schema for molecule test stage validation.
 */
export const moleculeTestStageSchema = z.enum([
  'dependency',
  'cleanup',
  'destroy',
  'create',
  'prepare',
  'converge',
  'idempotence',
  'side_effect',
  'verify',
]);

/**
 * Zod schema for molecule platform config validation.
 */
export const moleculePlatformConfigSchema = z.object({
  platform: rolePlatformSchema,
  image: z.string(),
});

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
  level: moleculeTestLevelSchema.optional(),
  driver: moleculeDriverSchema.optional(),

  // Platform-specific configuration
  platformConfigs: z.array(moleculePlatformConfigSchema).optional(),
  useAnsibleImages: z.boolean().optional(),

  // Container options
  privileged: z.boolean().optional(),
  rootless: z.boolean().optional(),

  // Vagrant options
  vagrantProvider: vagrantProviderSchema.optional(),
  vagrantMemory: z.number().optional(),
  vagrantCpus: z.number().optional(),

  // Delegated options
  delegatedManaged: z.boolean().optional(),

  // Test execution options
  testSequence: z.array(moleculeTestStageSchema).optional(),
  verifier: moleculeVerifierSchema.optional(),

  // Backward compatibility
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
    selectedFeatures: z.array(z.string()).optional(),
    selectedPackages: z.array(z.string()).optional(),
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

// ============================================
// Project Wizard Types
// ============================================

/**
 * Ansible project layout type.
 * - single: Inventories at root level (production, staging files)
 * - multi: Separate inventory directories (inventories/production/, etc.)
 */
export type ProjectLayout = 'single' | 'multi';

/**
 * Optional directories that can be included in the project.
 */
export type ProjectOptionalDir = 'library' | 'module_utils' | 'filter_plugins';

/**
 * Project wizard context collected through interactive prompts.
 */
export interface ProjectWizardContext {
  /** Project layout type (single or multi-environment) */
  layout: ProjectLayout;
  /** Environment names (e.g., production, staging) */
  environments: string[];
  /** Initial inventory groups (e.g., webservers, databases) */
  groups: string[];
  /** Optional directories to include */
  optionalDirs: ProjectOptionalDir[];
  /** Whether to include ansible.cfg */
  includeAnsibleCfg: boolean;
  /** Whether to include sample files with placeholder content */
  includeSampleFiles: boolean;
  /** Extensibility field for future wizard data */
  custom: Record<string, string>;
}

// ============================================
// Project Wizard Zod Schemas
// ============================================

/**
 * Zod schema for project layout validation.
 */
export const projectLayoutSchema = z.enum(['single', 'multi']);

/**
 * Zod schema for optional directory validation.
 */
export const projectOptionalDirSchema = z.enum(['library', 'module_utils', 'filter_plugins']);

/**
 * Zod schema for project wizard context validation with strict mode.
 */
export const projectWizardSchema = z
  .object({
    layout: projectLayoutSchema,
    environments: z.array(z.string()).min(1),
    groups: z.array(z.string()),
    optionalDirs: z.array(projectOptionalDirSchema),
    includeAnsibleCfg: z.boolean(),
    includeSampleFiles: z.boolean(),
    custom: z.record(z.string(), z.string()),
  })
  .strict();

/**
 * Export inferred type from Zod schema for consistency.
 */
export type ProjectWizardContextValidated = z.infer<typeof projectWizardSchema>;

// ============================================
// Collection Wizard Types
// ============================================

/**
 * Collection wizard context collected through interactive prompts.
 */
export interface CollectionWizardContext {
  // Metadata
  /** Collection namespace (lowercase, alphanumeric + underscore) */
  namespace: string;
  /** Collection name (lowercase, alphanumeric + underscore) */
  name: string;
  /** Semantic version (MAJOR.MINOR.PATCH) */
  version: string;
  /** Brief description of the collection */
  description: string;
  /** SPDX license identifiers */
  license: string[];
  /** Collection authors */
  authors: string[];

  // Structure
  /** Whether to include roles scaffolding */
  includeRoles: boolean;
  /** Role names to scaffold (if includeRoles is true) */
  roleNames: string[];

  // Plugins
  /** Include modules (plugins/modules) */
  includeModules: boolean;
  /** Include filter plugins (plugins/filter) */
  includeFilterPlugins: boolean;
  /** Include inventory plugins (plugins/inventory) */
  includeInventoryPlugins: boolean;
  /** Include lookup plugins (plugins/lookup) */
  includeLookupPlugins: boolean;
  /** Include test plugins (plugins/test) */
  includeTestPlugins: boolean;

  // Dependencies
  /** Collection dependencies (namespace.name: version) */
  dependencies: Record<string, string>;

  // Testing
  /** Testing configuration level */
  testingLevel: 'none' | 'basic' | 'molecule';

  // Optional
  /** Include meta/runtime.yml */
  includeRuntime: boolean;
  /** Ansible version requirement (e.g., ">=2.9") */
  requiresAnsible?: string;
  /** Include docs directory with templates */
  includeDocs: boolean;
  /** Include CHANGELOG.md */
  includeChangelog: boolean;

  /** Extensibility field for future wizard data */
  custom: Record<string, string>;
}

// ============================================
// Collection Wizard Zod Schemas
// ============================================

/**
 * Zod schema for collection namespace/name validation.
 * Must be lowercase, start with letter, contain only alphanumeric + underscore.
 */
const collectionNameRegex = /^[a-z][a-z0-9_]*$/;

/**
 * Zod schema for semantic version validation (MAJOR.MINOR.PATCH).
 */
const semanticVersionRegex = /^\d+\.\d+\.\d+$/;

/**
 * Zod schema for testing level validation.
 */
export const collectionTestingLevelSchema = z.enum(['none', 'basic', 'molecule']);

/**
 * Zod schema for collection wizard context validation with strict mode.
 */
export const collectionWizardSchema = z
  .object({
    namespace: z.string().regex(collectionNameRegex, {
      message:
        'Namespace must be lowercase, start with letter, contain only alphanumeric + underscore',
    }),
    name: z.string().regex(collectionNameRegex, {
      message: 'Name must be lowercase, start with letter, contain only alphanumeric + underscore',
    }),
    version: z.string().regex(semanticVersionRegex, {
      message: 'Version must follow semantic versioning (MAJOR.MINOR.PATCH)',
    }),
    description: z.string().min(1, { message: 'Description is required' }),
    license: z.array(z.string()).min(1, { message: 'At least one license is required' }),
    authors: z.array(z.string()).min(1, { message: 'At least one author is required' }),
    includeRoles: z.boolean(),
    roleNames: z.array(z.string()),
    includeModules: z.boolean(),
    includeFilterPlugins: z.boolean(),
    includeInventoryPlugins: z.boolean(),
    includeLookupPlugins: z.boolean(),
    includeTestPlugins: z.boolean(),
    dependencies: z.record(z.string()),
    testingLevel: collectionTestingLevelSchema,
    includeRuntime: z.boolean(),
    requiresAnsible: z.string().optional(),
    includeDocs: z.boolean(),
    includeChangelog: z.boolean(),
    custom: z.record(z.string(), z.string()),
  })
  .strict();

/**
 * Export inferred type from Zod schema for consistency.
 */
export type CollectionWizardContextValidated = z.infer<typeof collectionWizardSchema>;

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
    if (context.molecule.level) {
      result.molecule_level = context.molecule.level;
    }
    if (context.molecule.driver) {
      result.molecule_driver = context.molecule.driver;
    }
    if (context.molecule.platforms && context.molecule.platforms.length > 0) {
      result.molecule_platforms = context.molecule.platforms.join(', ');
    }
    if (context.molecule.scenarios && context.molecule.scenarios.length > 0) {
      result.molecule_scenarios = context.molecule.scenarios.join(', ');
    }
    // Platform configs with custom images/boxes
    if (context.molecule.platformConfigs && context.molecule.platformConfigs.length > 0) {
      result.molecule_platform_images = context.molecule.platformConfigs
        .map((pc) => `${pc.platform}: ${pc.image}`)
        .join('; ');
    }
    // Container options
    if (context.molecule.useAnsibleImages !== undefined) {
      result.molecule_ansible_images = context.molecule.useAnsibleImages ? 'yes' : 'no';
    }
    if (context.molecule.privileged !== undefined) {
      result.molecule_privileged = context.molecule.privileged ? 'yes' : 'no';
    }
    if (context.molecule.rootless !== undefined) {
      result.molecule_rootless = context.molecule.rootless ? 'yes' : 'no';
    }
    // Vagrant options
    if (context.molecule.vagrantProvider) {
      result.molecule_vagrant_provider = context.molecule.vagrantProvider;
    }
    if (context.molecule.vagrantMemory) {
      result.molecule_vagrant_memory = `${context.molecule.vagrantMemory}MB`;
    }
    if (context.molecule.vagrantCpus) {
      result.molecule_vagrant_cpus = String(context.molecule.vagrantCpus);
    }
    // Delegated options
    if (context.molecule.delegatedManaged !== undefined) {
      result.molecule_delegated_managed = context.molecule.delegatedManaged ? 'yes' : 'no';
    }
    // Test execution options
    if (context.molecule.testSequence && context.molecule.testSequence.length > 0) {
      result.molecule_test_sequence = context.molecule.testSequence.join(', ');
    }
    if (context.molecule.verifier) {
      result.molecule_verifier = context.molecule.verifier;
    }
  } else {
    result.molecule_testing = 'disabled';
  }

  // Research selections
  if (context.selectedFeatures && context.selectedFeatures.length > 0) {
    result.selected_features = context.selectedFeatures.join(', ');
  }

  if (context.selectedPackages && context.selectedPackages.length > 0) {
    result.selected_packages = context.selectedPackages.join(', ');
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

/**
 * Convert collection wizard context to clarifications format for prompt builders.
 *
 * Formats wizard context as terse key-value pairs optimized for token efficiency.
 * Used by collection generation prompts to provide user configuration context.
 *
 * @param context - Validated collection wizard context
 * @returns Record of clarifications for AI prompt
 *
 * @example
 * ```typescript
 * const context: CollectionWizardContext = {
 *   namespace: 'mycompany',
 *   name: 'web_utils',
 *   version: '1.0.0',
 *   description: 'Web utilities collection',
 *   license: ['MIT'],
 *   authors: ['John Doe'],
 *   includeRoles: true,
 *   roleNames: ['nginx', 'apache'],
 *   includeModules: true,
 *   // ... other fields
 *   custom: {}
 * };
 * const clarifications = formatCollectionContextForPrompt(context);
 * // Returns formatted key-value pairs for AI prompt
 * ```
 */
export function formatCollectionContextForPrompt(
  context: CollectionWizardContext,
): Record<string, string> {
  const result: Record<string, string> = {};

  // Core metadata
  result.namespace = context.namespace;
  result.collection_name = context.name;
  result.version = context.version;
  result.description = context.description;

  // License and authors
  if (context.license.length > 0) {
    result.licenses = context.license.join(', ');
  }
  if (context.authors.length > 0) {
    result.authors = context.authors.join(', ');
  }

  // Roles
  if (context.includeRoles) {
    result.include_roles = 'yes';
    if (context.roleNames.length > 0) {
      result.role_names = context.roleNames.join(', ');
    }
  } else {
    result.include_roles = 'no';
  }

  // Plugins
  const plugins: string[] = [];
  if (context.includeModules) plugins.push('modules');
  if (context.includeFilterPlugins) plugins.push('filter');
  if (context.includeInventoryPlugins) plugins.push('inventory');
  if (context.includeLookupPlugins) plugins.push('lookup');
  if (context.includeTestPlugins) plugins.push('test');
  if (plugins.length > 0) {
    result.plugin_types = plugins.join(', ');
  }

  // Dependencies
  if (Object.keys(context.dependencies).length > 0) {
    result.dependencies = Object.entries(context.dependencies)
      .map(([name, version]) => `${name}:${version}`)
      .join(', ');
  }

  // Testing
  result.testing_level = context.testingLevel;

  // Optional features
  result.include_runtime = context.includeRuntime ? 'yes' : 'no';
  if (context.requiresAnsible) {
    result.requires_ansible = context.requiresAnsible;
  }
  result.include_docs = context.includeDocs ? 'yes' : 'no';
  result.include_changelog = context.includeChangelog ? 'yes' : 'no';

  // Include custom fields if non-empty
  if (Object.keys(context.custom).length > 0) {
    Object.assign(result, context.custom);
  }

  return result;
}
