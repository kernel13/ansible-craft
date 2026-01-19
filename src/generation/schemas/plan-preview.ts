/**
 * Plan preview schema for Anthropic structured outputs.
 *
 * Defines both TypeScript interface for type safety and JSON schema
 * for the Anthropic API structured outputs beta.
 */

/**
 * A single task in the role plan.
 */
export interface PlanTask {
  /** Descriptive name for the task */
  name: string;
  /** FQCN of the Ansible module (e.g., ansible.builtin.apt) */
  module: string;
  /** What this task accomplishes */
  purpose: string;
}

/**
 * A variable definition in the role plan.
 */
export interface PlanVariable {
  /** Variable name with role prefix (e.g., nginx_port) */
  name: string;
  /** Default value as string representation (optional) */
  default?: string;
  /** What this variable controls */
  description: string;
}

/**
 * Complete plan preview for an Ansible role.
 *
 * This structure is returned by the AI when planning a role
 * and shown to the user for approval before code generation.
 */
export interface PlanPreview {
  /** Role name (lowercase, hyphens allowed) */
  role_name: string;
  /** Clear description of what the role does */
  description: string;
  /** Tasks that will be in tasks/main.yml */
  tasks: PlanTask[];
  /** Variables to define in defaults/main.yml */
  variables: PlanVariable[];
  /** Handler names for service management */
  handlers: string[];
  /** Template filenames (e.g., nginx.conf.j2) */
  templates: string[];
  /** Supported platforms (e.g., Ubuntu, RHEL) */
  platforms: string[];
}

/**
 * JSON Schema for Anthropic structured outputs beta.
 *
 * Use with the `structured-outputs-2025-11-13` beta header.
 *
 * @example
 * ```typescript
 * const response = await client.beta.messages.create({
 *   model: 'claude-sonnet-4-5-20250929',
 *   betas: ['structured-outputs-2025-11-13'],
 *   messages: [{ role: 'user', content: planPrompt }],
 *   output_format: {
 *     type: 'json_schema',
 *     schema: PLAN_PREVIEW_SCHEMA,
 *   },
 * });
 * ```
 */
export const PLAN_PREVIEW_SCHEMA = {
  type: 'object',
  properties: {
    role_name: {
      type: 'string',
      description: 'Role name (lowercase, hyphens allowed)',
    },
    description: {
      type: 'string',
      description: 'Clear description of what the role does',
    },
    tasks: {
      type: 'array',
      description: 'Tasks that will be in tasks/main.yml',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Descriptive name for the task',
          },
          module: {
            type: 'string',
            description: 'FQCN of the Ansible module (e.g., ansible.builtin.apt)',
          },
          purpose: {
            type: 'string',
            description: 'What this task accomplishes',
          },
        },
        required: ['name', 'module', 'purpose'],
        additionalProperties: false,
      },
    },
    variables: {
      type: 'array',
      description: 'Variables to define in defaults/main.yml',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Variable name with role prefix (e.g., nginx_port)',
          },
          default: {
            type: 'string',
            description: 'Default value as string representation',
          },
          description: {
            type: 'string',
            description: 'What this variable controls',
          },
        },
        required: ['name', 'description'],
        additionalProperties: false,
      },
    },
    handlers: {
      type: 'array',
      description: 'Handler names for service management',
      items: { type: 'string' },
    },
    templates: {
      type: 'array',
      description: 'Template filenames (e.g., nginx.conf.j2)',
      items: { type: 'string' },
    },
    platforms: {
      type: 'array',
      description: 'Supported platforms (e.g., Ubuntu, RHEL)',
      items: { type: 'string' },
    },
  },
  required: ['role_name', 'description', 'tasks', 'variables', 'handlers', 'templates', 'platforms'],
  additionalProperties: false,
} as const;
