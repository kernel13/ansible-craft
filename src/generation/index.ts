/**
 * Generation module for ansible-craft.
 *
 * Provides role plan preview, code generation, prompt builders,
 * schemas, and role structure utilities.
 *
 * @example
 * ```typescript
 * import {
 *   generateRolePlan,
 *   generateRoleCode,
 *   type PlanPreview,
 *   type GeneratedFile,
 * } from './generation/index.js';
 *
 * const plan = await generateRolePlan(client, 'nginx with SSL');
 * const files = await generateRoleCode(client, plan, 'nginx with SSL');
 * ```
 */

// Prompt builders and system prompt
export * from './prompts/index.js';

// Plan preview schema for structured outputs
export * from './schemas/plan-preview.js';

// Role structure utilities
export * from './role/index.js';

// Role generation orchestration
export * from './generate-role.js';
