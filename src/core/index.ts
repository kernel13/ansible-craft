/**
 * Specialized agents for ansible-craft.
 *
 * Provides a modular agent architecture for:
 * - Parallel validation and linting
 * - Code generation from plans
 * - Auto-fixing lint violations
 * - Code explanation and debugging
 *
 * @example
 * ```typescript
 * import {
 *   createOrchestrator,
 *   createValidatorAgent,
 *   createLinterAgent,
 *   createWriterAgent,
 * } from './agents/index.js';
 *
 * // Run validation and linting in parallel
 * const [validationResult, lintResult] = await Promise.all([
 *   validatorAgent.execute({ files }, context),
 *   linterAgent.execute({ files }, context),
 * ]);
 * ```
 */

// Core types
export * from './types.js';

// Message bus for agent communication
export {
  MessageBus,
  globalMessageBus,
  MessageTypes,
  type MessageHandler,
  type Subscription,
  type MessageType,
} from './message-bus.js';

// Orchestrator for coordinating agents
export {
  AgentOrchestrator,
  createOrchestrator,
  executeParallel,
  executePipeline,
  executeConcurrent,
  batch,
  withTimeout,
  retryWithBackoff,
  type ParallelOptions,
  type PipelineOptions,
  type ParallelResult,
  type PipelineStage,
} from './orchestrator.js';

// Validator agent
export {
  ValidatorAgent,
  createValidatorAgent,
  validateFiles,
} from './validator.js';

// Writer agent
export {
  WriterAgent,
  createWriterAgent,
  writeFiles,
} from './writer.js';

// Linter agent
export {
  LinterAgent,
  createLinterAgent,
  lintFiles,
  isAnsibleLintAvailable,
} from './linter.js';

// Planner agent
export {
  PlannerAgent,
  createPlannerAgent,
  generateRolePlan,
  generatePlaybookPlan,
} from './planner.js';

// Generator agent
export {
  GeneratorAgent,
  createGeneratorAgent,
  generateRoleCode,
  generatePlaybookCode,
} from './generator.js';

// Fixer agent
export {
  FixerAgent,
  createFixerAgent,
  applyFixes,
  canAutoFix,
} from './fixer.js';

// Explainer agent
export {
  ExplainerAgent,
  createExplainerAgent,
  explainAnsible,
} from './explainer.js';

// Debugger agent
export {
  DebuggerAgent,
  createDebuggerAgent,
  debugAnsibleError,
} from './debugger.js';

// ============================================================
// Agent Registry
// ============================================================

import { DebuggerAgent } from './debugger.js';
import { ExplainerAgent } from './explainer.js';
import { FixerAgent } from './fixer.js';
import { GeneratorAgent } from './generator.js';
import { LinterAgent } from './linter.js';
import { PlannerAgent } from './planner.js';
import type { Agent, AgentContext } from './types.js';
import { ValidatorAgent } from './validator.js';
import { WriterAgent } from './writer.js';

/**
 * Registry of all available agents.
 */
export const AgentRegistry = {
  validator: ValidatorAgent,
  writer: WriterAgent,
  linter: LinterAgent,
  planner: PlannerAgent,
  generator: GeneratorAgent,
  fixer: FixerAgent,
  explainer: ExplainerAgent,
  debugger: DebuggerAgent,
} as const;

export type AgentName = keyof typeof AgentRegistry;

/**
 * Create an agent by name.
 */
export function createAgent<TIn, TOut>(
  name: AgentName,
  options?: Record<string, unknown>,
): Agent<TIn, TOut> {
  const AgentClass = AgentRegistry[name];
  return new AgentClass(options) as Agent<TIn, TOut>;
}

// ============================================================
// Common Agent Workflows
// ============================================================

import type { GeneratedFile } from '../generation/role/parser.js';
import type { FixerOutput, LinterOutput, ValidatorOutput, WriterOutput } from './types.js';

/**
 * Validate and lint files in parallel.
 *
 * This is the most common pattern for quality checking generated files.
 *
 * @example
 * ```typescript
 * const { validation, lint, duration } = await validateAndLint(files, context);
 * if (!validation.success || lint.data?.violations.length > 0) {
 *   // Handle issues
 * }
 * ```
 */
export async function validateAndLint(
  files: GeneratedFile[],
  context: AgentContext,
): Promise<{
  validation: import('./types.js').AgentResult<ValidatorOutput>;
  lint: import('./types.js').AgentResult<LinterOutput>;
  duration: number;
}> {
  const startTime = Date.now();

  const validatorAgent = new ValidatorAgent();
  const linterAgent = new LinterAgent();

  const [validation, lint] = await Promise.all([
    validatorAgent.execute({ files }, context),
    linterAgent.execute({ files }, context),
  ]);

  return {
    validation,
    lint,
    duration: Date.now() - startTime,
  };
}

/**
 * Full quality pipeline: validate → lint → fix → write.
 *
 * @example
 * ```typescript
 * const result = await qualityPipeline(files, {
 *   name: 'my-role',
 *   outputDir: process.cwd(),
 *   type: 'role',
 *   autoFix: true,
 * }, context);
 * ```
 */
export async function qualityPipeline(
  files: GeneratedFile[],
  options: {
    name: string;
    outputDir: string;
    type: 'role' | 'playbook';
    autoFix?: boolean;
    force?: boolean;
    dryRun?: boolean;
  },
  context: AgentContext,
): Promise<{
  validation: import('./types.js').AgentResult<ValidatorOutput>;
  lint: import('./types.js').AgentResult<LinterOutput>;
  fix?: import('./types.js').AgentResult<FixerOutput>;
  write?: import('./types.js').AgentResult<WriterOutput>;
  success: boolean;
  duration: number;
}> {
  const startTime = Date.now();

  // Step 1: Validate and lint in parallel
  const { validation, lint } = await validateAndLint(files, context);

  // If validation failed, don't proceed
  if (!validation.success) {
    return {
      validation,
      lint,
      success: false,
      duration: Date.now() - startTime,
    };
  }

  // Step 2: Apply fixes if there are violations
  let fix: import('./types.js').AgentResult<FixerOutput> | undefined;
  let filesToWrite = files;

  if (lint.success && lint.data && lint.data.violations.length > 0 && options.autoFix) {
    const fixerAgent = new FixerAgent();
    fix = await fixerAgent.execute(
      { files, violations: lint.data.violations, autoFix: true },
      context,
    );

    if (fix.success && fix.data) {
      filesToWrite = fix.data.modifiedFiles;
    }
  }

  // Step 3: Write files
  const writerAgent = new WriterAgent();
  const write = await writerAgent.execute(
    {
      files: filesToWrite,
      outputDir: options.outputDir,
      name: options.name,
      type: options.type,
      force: options.force ?? false,
      dryRun: options.dryRun ?? false,
    },
    context,
  );

  return {
    validation,
    lint,
    fix,
    write,
    success: write.success,
    duration: Date.now() - startTime,
  };
}
