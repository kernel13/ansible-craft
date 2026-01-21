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
 * Role wizard context collected through interactive prompts.
 */
export interface RoleWizardContext {
  /** Selected role directory structure elements */
  structure: RoleStructureDirectory[];
  /** Target platforms for the role */
  platforms: RolePlatform[];
  /** Handler types needed in the role */
  handlers: RoleHandler[];
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
 * Zod schema for role wizard context validation with strict mode.
 */
export const roleWizardSchema = z
  .object({
    structure: z.array(roleStructureDirectorySchema),
    platforms: z.array(rolePlatformSchema),
    handlers: z.array(roleHandlerSchema),
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
 *   custom: {}
 * };
 * const clarifications = formatRoleContextForPrompt(context);
 * // Returns: {
 * //   structure: 'tasks, handlers',
 * //   platforms: 'Ubuntu, RHEL',
 * //   handlers: 'restart'
 * // }
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
