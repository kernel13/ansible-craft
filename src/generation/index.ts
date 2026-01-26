/**
 * Generation module for ansible-craft.
 *
 * Provides role and playbook plan preview, code generation, prompt builders,
 * schemas, structure utilities, and file writing.
 *
 * @example
 * ```typescript
 * import {
 *   generateRolePlan,
 *   generateRoleCode,
 *   writeGeneratedRole,
 *   generatePlaybookPlan,
 *   generatePlaybookCode,
 *   writeGeneratedPlaybook,
 * } from './generation/index.js';
 *
 * // Role generation
 * const rolePlan = await generateRolePlan(client, 'nginx with SSL');
 * const roleFiles = await generateRoleCode(client, rolePlan, 'nginx with SSL');
 * await writeGeneratedRole(roleFiles, { roleName: 'nginx' });
 *
 * // Playbook generation
 * const playbookPlan = await generatePlaybookPlan(client, 'deploy LAMP stack');
 * const playbookFiles = await generatePlaybookCode(client, playbookPlan, 'deploy LAMP stack');
 * await writeGeneratedPlaybook(playbookFiles, { playbookName: 'deploy-lamp' });
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

// File writing (role and playbook writers)
export * from './writer.js';

// Validation (exports validateGeneratedFiles, displayValidationReport, and types)
export {
  validateGeneratedFiles,
  displayValidationReport,
  type ValidationReport,
  type ValidationIssue,
  type YamlValidationError,
} from './validation/index.js';

// Ansible-lint integration
export {
  runAnsibleLint,
  isAnsibleLintAvailable,
  formatInstallInstructions,
  parseSarifResults,
  type LintViolation,
  type AnsibleLintResult,
} from './validation/ansible-lint.js';

// Auto-fix for lint violations
export {
  applyAutoFixes,
  canAutoFix,
  type AutoFixResult,
  type FixedViolation,
  type UnfixableViolation,
} from './validation/auto-fix.js';

// Preview functions for dry-run mode
export {
  displayFilePreview,
  displayFilesPreview,
  displayLintResults,
  previewAndConfirm,
} from '../cli/preview.js';

// Project structure generation
export {
  createProjectStructure,
  generateProjectFiles,
  getProjectDirectories,
  projectExists,
  type CreateProjectOptions,
  type ProjectStructureResult,
} from './project/index.js';
