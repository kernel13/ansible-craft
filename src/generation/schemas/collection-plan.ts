/**
 * Collection plan preview schema for Anthropic structured outputs.
 *
 * Defines both TypeScript interface for type safety and JSON schema
 * for the Anthropic API structured outputs beta.
 */

/**
 * galaxy.yml metadata structure.
 */
export interface GalaxyYml {
  /** Collection namespace */
  namespace: string;
  /** Collection name */
  name: string;
  /** Semantic version (MAJOR.MINOR.PATCH) */
  version: string;
  /** Collection authors */
  authors: string[];
  /** SPDX license identifiers */
  license: string[];
  /** Collection dependencies (namespace.name: version) */
  dependencies: Record<string, string>;
  /** Tags for Galaxy search */
  tags: string[];
}

/**
 * A plugin to be generated (module, filter, etc.).
 */
export interface PluginSpec {
  /** Plugin type (module, filter, inventory, lookup, test) */
  type: string;
  /** Plugin name (e.g., nginx_config, format_url) */
  name: string;
  /** What this plugin does */
  purpose: string;
}

/**
 * A file to be created in the collection.
 */
export interface FileSpec {
  /** Relative path from collection root */
  path: string;
  /** Purpose/description of this file */
  purpose: string;
}

/**
 * Complete plan preview for an Ansible collection.
 *
 * This structure is returned by the AI when planning a collection
 * and shown to the user for approval before code generation.
 */
export interface CollectionPlanPreview {
  /** Collection namespace (lowercase, alphanumeric + underscore) */
  namespace: string;
  /** Collection name (lowercase, alphanumeric + underscore) */
  name: string;
  /** Semantic version (MAJOR.MINOR.PATCH) */
  version: string;
  /** Brief description of the collection */
  description: string;
  /** galaxy.yml metadata */
  galaxy_yml: GalaxyYml;
  /** Directories to create */
  directories: string[];
  /** Files to generate */
  files: FileSpec[];
  /** Plugins to generate (modules, filters, etc.) */
  plugins: PluginSpec[];
  /** Role names to scaffold (empty directories) */
  roles: string[];
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
 *     schema: COLLECTION_PLAN_SCHEMA,
 *   },
 * });
 * ```
 */
export const COLLECTION_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    namespace: {
      type: 'string',
      description: 'Collection namespace (lowercase, alphanumeric + underscore)',
    },
    name: {
      type: 'string',
      description: 'Collection name (lowercase, alphanumeric + underscore)',
    },
    version: {
      type: 'string',
      description: 'Semantic version (MAJOR.MINOR.PATCH)',
    },
    description: {
      type: 'string',
      description: 'Brief description of the collection',
    },
    galaxy_yml: {
      type: 'object',
      description: 'galaxy.yml metadata structure',
      properties: {
        namespace: {
          type: 'string',
          description: 'Collection namespace',
        },
        name: {
          type: 'string',
          description: 'Collection name',
        },
        version: {
          type: 'string',
          description: 'Semantic version (MAJOR.MINOR.PATCH)',
        },
        authors: {
          type: 'array',
          description: 'Collection authors',
          items: { type: 'string' },
        },
        license: {
          type: 'array',
          description: 'SPDX license identifiers',
          items: { type: 'string' },
        },
        dependencies: {
          type: 'object',
          description: 'Collection dependencies (namespace.name: version)',
          additionalProperties: { type: 'string' },
        },
        tags: {
          type: 'array',
          description: 'Tags for Galaxy search',
          items: { type: 'string' },
        },
      },
      required: ['namespace', 'name', 'version', 'authors', 'license', 'dependencies', 'tags'],
      additionalProperties: false,
    },
    directories: {
      type: 'array',
      description: 'Directories to create',
      items: { type: 'string' },
    },
    files: {
      type: 'array',
      description: 'Files to generate',
      items: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Relative path from collection root',
          },
          purpose: {
            type: 'string',
            description: 'Purpose/description of this file',
          },
        },
        required: ['path', 'purpose'],
        additionalProperties: false,
      },
    },
    plugins: {
      type: 'array',
      description: 'Plugins to generate (modules, filters, etc.)',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Plugin type (module, filter, inventory, lookup, test)',
          },
          name: {
            type: 'string',
            description: 'Plugin name (e.g., nginx_config, format_url)',
          },
          purpose: {
            type: 'string',
            description: 'What this plugin does',
          },
        },
        required: ['type', 'name', 'purpose'],
        additionalProperties: false,
      },
    },
    roles: {
      type: 'array',
      description: 'Role names to scaffold (empty directories)',
      items: { type: 'string' },
    },
  },
  required: [
    'namespace',
    'name',
    'version',
    'description',
    'galaxy_yml',
    'directories',
    'files',
    'plugins',
    'roles',
  ],
  additionalProperties: false,
} as const;
