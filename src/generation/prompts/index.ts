/**
 * Prompt templates for Ansible role generation.
 *
 * Provides system prompt and builder functions for the two-phase
 * generation architecture: plan preview followed by code generation.
 *
 * @example
 * ```typescript
 * import {
 *   ANSIBLE_EXPERT_SYSTEM_PROMPT,
 *   buildClarifyPrompt,
 *   buildPlanPrompt,
 *   buildGeneratePrompt,
 * } from './generation/prompts/index.ts';
 *
 * // Phase 1: Clarify and plan
 * const clarifyPrompt = buildClarifyPrompt(userInput);
 * const planPrompt = buildPlanPrompt(userInput, answers);
 *
 * // Phase 2: Generate code
 * const generatePrompt = buildGeneratePrompt(approvedPlan, userInput);
 * ```
 */
// Role generation prompts
export { ANSIBLE_EXPERT_SYSTEM_PROMPT } from './system.ts';
export { buildClarifyPrompt } from './clarify.ts';
export { buildPlanPrompt } from './plan.ts';
export { buildGeneratePrompt, type GenerateOptions as PromptGenerateOptions } from './generate.ts';

// Playbook generation prompts
export { ANSIBLE_PLAYBOOK_SYSTEM_PROMPT } from './playbook-system.ts';
export { buildPlaybookPlanPrompt } from './playbook-plan.ts';
export {
  buildPlaybookGeneratePrompt,
  type PlaybookPlanPreview,
} from './playbook-generate.ts';
