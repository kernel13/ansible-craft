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

// Playbook generation orchestration
export {
  generatePlaybookPlan,
  generatePlaybookCode,
  type PlaybookGenerateOptions,
} from './generate-playbook.js';

// Playbook schemas
export {
  PLAYBOOK_PLAN_SCHEMA,
  type PlaybookPlanPreview,
  type PlaybookPlanPlay,
  type PlaybookPlanTask,
  type PlaybookPlanVariable,
  type PlaybookPlanGroupVar,
} from './schemas/playbook-plan.js';

// Playbook structure
export {
  createPlaybookStructure,
  playbookExists,
  PLAYBOOK_DIRECTORIES,
  REQUIRED_PLAYBOOK_FILES,
  type PlaybookStructureOptions,
  type PlaybookStructureResult,
} from './playbook/index.js';

// Playbook name inference
export { inferPlaybookName } from './role/sanitize.js';

// File writing
export * from './writer.js';

// Validation (exports validateGeneratedFiles, displayValidationReport, and types)
export {
  validateGeneratedFiles,
  displayValidationReport,
  type ValidationReport,
  type ValidationIssue,
  type YamlValidationError,
} from './validation/index.js';
