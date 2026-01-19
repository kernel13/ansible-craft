/**
 * Playbook plan preview schema for Anthropic structured outputs.
 *
 * Defines both TypeScript interfaces for type safety and JSON schema
 * for the Anthropic API structured outputs beta.
 */

/**
 * A single task in a playbook play.
 */
export interface PlaybookPlanTask {
  /** Task name */
  name: string;
  /** FQCN of the Ansible module (e.g., ansible.builtin.apt) */
  module: string;
  /** What this task accomplishes */
  purpose: string;
  /** Suggestion if this could be extracted to a role */
  role_extraction_hint?: string;
}

/**
 * A single play in the playbook.
 */
export interface PlaybookPlanPlay {
  /** Play name */
  name: string;
  /** Target hosts pattern (e.g., "webservers", "all") */
  hosts: string;
  /** Brief description of play purpose */
  purpose: string;
  /** Tasks in this play */
  tasks: PlaybookPlanTask[];
  /** Handler names for this play */
  handlers: string[];
  /** Whether play uses pre_tasks */
  has_pre_tasks: boolean;
  /** Whether play uses post_tasks */
  has_post_tasks: boolean;
}

/**
 * A variable definition in a group_vars file.
 */
export interface PlaybookPlanVariable {
  /** Variable name */
  name: string;
  /** Default value as string representation (optional) */
  default?: string;
  /** What this variable controls */
  description: string;
}

/**
 * Variables for a specific inventory group.
 */
export interface PlaybookPlanGroupVar {
  /** Group name (e.g., "all", "webservers") */
  group: string;
  /** Variables in this group */
  variables: PlaybookPlanVariable[];
}

/**
 * Complete plan preview for an Ansible playbook.
 *
 * This structure is returned by the AI when planning a playbook
 * and shown to the user for approval before code generation.
 */
export interface PlaybookPlanPreview {
  /** Playbook name (lowercase, hyphens allowed, used for directory) */
  playbook_name: string;
  /** Clear description of what the playbook does */
  description: string;
  /** Plays in execution order */
  plays: PlaybookPlanPlay[];
  /** Group variables organized by inventory group */
  group_vars: PlaybookPlanGroupVar[];
  /** Inventory groups needed for this playbook */
  inventory_groups: string[];
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
 *     schema: PLAYBOOK_PLAN_SCHEMA,
 *   },
 * });
 * ```
 */
export const PLAYBOOK_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    playbook_name: {
      type: 'string',
      description: 'Playbook name (lowercase, hyphens allowed)',
    },
    description: {
      type: 'string',
      description: 'Clear description of what the playbook does',
    },
    plays: {
      type: 'array',
      description: 'Plays in execution order',
      items: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Play name',
          },
          hosts: {
            type: 'string',
            description: 'Target hosts pattern (e.g., webservers, all)',
          },
          purpose: {
            type: 'string',
            description: 'Brief description of play purpose',
          },
          tasks: {
            type: 'array',
            description: 'Tasks in this play',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Task name',
                },
                module: {
                  type: 'string',
                  description: 'FQCN of the Ansible module (e.g., ansible.builtin.apt)',
                },
                purpose: {
                  type: 'string',
                  description: 'What this task accomplishes',
                },
                role_extraction_hint: {
                  type: 'string',
                  description: 'Suggestion if this could be extracted to a role',
                },
              },
              required: ['name', 'module', 'purpose'],
              additionalProperties: false,
            },
          },
          handlers: {
            type: 'array',
            description: 'Handler names for this play',
            items: { type: 'string' },
          },
          has_pre_tasks: {
            type: 'boolean',
            description: 'Whether play uses pre_tasks',
          },
          has_post_tasks: {
            type: 'boolean',
            description: 'Whether play uses post_tasks',
          },
        },
        required: ['name', 'hosts', 'purpose', 'tasks', 'handlers', 'has_pre_tasks', 'has_post_tasks'],
        additionalProperties: false,
      },
    },
    group_vars: {
      type: 'array',
      description: 'Variables organized by inventory group',
      items: {
        type: 'object',
        properties: {
          group: {
            type: 'string',
            description: 'Group name (e.g., all, webservers)',
          },
          variables: {
            type: 'array',
            description: 'Variables in this group',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Variable name',
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
        },
        required: ['group', 'variables'],
        additionalProperties: false,
      },
    },
    inventory_groups: {
      type: 'array',
      description: 'Inventory group names needed for this playbook',
      items: { type: 'string' },
    },
  },
  required: ['playbook_name', 'description', 'plays', 'group_vars', 'inventory_groups'],
  additionalProperties: false,
} as const;
