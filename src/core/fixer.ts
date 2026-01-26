/**
 * Ansible Fixer Agent.
 *
 * Automatically fixes common lint violations and code issues.
 * Supports parallel fix application for improved performance.
 */

import type { GeneratedFile } from '../generation/role/parser.js';
import type { LintViolation } from '../generation/validation/ansible-lint.js';
import {
  type AutoFixResult,
  type FixedViolation,
  type UnfixableViolation,
  applyAutoFixes,
  canAutoFix,
} from '../generation/validation/auto-fix.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import { executeParallel } from './orchestrator.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type FixerInput,
  type FixerOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Group violations by file for efficient processing.
 */
function groupViolationsByFile(violations: LintViolation[]): Map<string, LintViolation[]> {
  const byFile = new Map<string, LintViolation[]>();
  for (const violation of violations) {
    const existing = byFile.get(violation.file) ?? [];
    existing.push(violation);
    byFile.set(violation.file, existing);
  }
  return byFile;
}

/**
 * Convert a violation to a comparable format.
 */
function violationKey(v: LintViolation): string {
  return `${v.file}:${v.line}:${v.ruleId}`;
}

/**
 * Ansible Fixer Agent implementation.
 *
 * Applies auto-fixes to lint violations with parallel file processing.
 */
export class FixerAgent implements Agent<FixerInput, FixerOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.fixer.name;
  readonly description = DEFAULT_AGENT_CONFIGS.fixer.description;

  private maxConcurrency: number;

  constructor(options?: { maxConcurrency?: number }) {
    this.maxConcurrency = options?.maxConcurrency ?? DEFAULT_AGENT_CONFIGS.fixer.maxConcurrency;
  }

  /**
   * Execute auto-fix on provided files and violations.
   */
  async execute(input: FixerInput, context: AgentContext): Promise<AgentResult<FixerOutput>> {
    const startTime = Date.now();
    const { files, violations, autoFix } = input;

    // Publish start message
    await globalMessageBus.publish(
      MessageTypes.FIX_START,
      { violationCount: violations.length, autoFix },
      this.name,
    );

    try {
      // If auto-fix is disabled, return violations as-is
      if (!autoFix) {
        const duration = Date.now() - startTime;

        // Separate fixable from unfixable
        const fixed: LintViolation[] = [];
        const unfixable = violations.filter((v) => !canAutoFix(v.ruleId));

        const output: FixerOutput = {
          fixed,
          unfixable,
          modifiedFiles: files,
        };

        await globalMessageBus.publish(
          MessageTypes.FIX_COMPLETE,
          { fixedCount: 0, unfixableCount: unfixable.length, duration },
          this.name,
        );

        return successResult(output, duration);
      }

      // Apply auto-fixes
      const result = await this.applyFixesParallel(files, violations, context);
      const duration = Date.now() - startTime;

      // Convert modified content back to GeneratedFile array
      const modifiedFiles: GeneratedFile[] = files.map((file) => {
        const modifiedContent = result.modifiedContent.get(file.path);
        return modifiedContent !== undefined ? { path: file.path, content: modifiedContent } : file;
      });

      // Convert fixed violations back to LintViolation format
      const fixedViolations: LintViolation[] = result.fixed.map((f) => ({
        ruleId: f.ruleId,
        level: 'warning' as const,
        message: `Fixed: ${f.original} → ${f.replacement}`,
        file: f.file,
        line: f.line,
      }));

      // Convert unfixable to LintViolation format
      const unfixableViolations: LintViolation[] = result.unfixable.map((u) => ({
        ruleId: u.ruleId,
        level: 'warning' as const,
        message: u.message,
        file: u.file,
        line: u.line,
      }));

      const output: FixerOutput = {
        fixed: fixedViolations,
        unfixable: unfixableViolations,
        modifiedFiles,
      };

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.FIX_COMPLETE,
        {
          fixedCount: result.fixed.length,
          unfixableCount: result.unfixable.length,
          duration,
        },
        this.name,
      );

      // Generate warnings for unfixable violations
      const warnings = result.unfixable.map(
        (u) => `${u.file}:${u.line}: ${u.ruleId} - ${u.suggestion}`,
      );

      return successResult(output, duration, warnings);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(MessageTypes.FIX_ERROR, { error: String(error) }, this.name);

      return failureResult(
        [
          createAgentError(this.name, 'FIX_ERROR', String(error), {
            cause: error instanceof Error ? error : undefined,
            recoverable: true,
          }),
        ],
        duration,
      );
    }
  }

  /**
   * Apply fixes in parallel with concurrency limits.
   */
  private async applyFixesParallel(
    files: GeneratedFile[],
    violations: LintViolation[],
    context: AgentContext,
  ): Promise<AutoFixResult> {
    // For small file counts or few violations, process sequentially
    if (files.length <= 3 || violations.length <= 5) {
      return applyAutoFixes(files, violations);
    }

    // Group violations by file
    const violationsByFile = groupViolationsByFile(violations);

    // Process files in parallel
    const operations = files.map((file) => async () => {
      const fileViolations = violationsByFile.get(file.path) ?? [];
      if (fileViolations.length === 0) {
        return successResult(
          {
            fixed: [] as FixedViolation[],
            unfixable: [] as UnfixableViolation[],
            modifiedContent: new Map([[file.path, file.content]]),
          } as AutoFixResult,
          0,
        );
      }

      // Apply fixes to this file
      const result = applyAutoFixes([file], fileViolations);
      return successResult(result, 0);
    });

    const parallelResult = await executeParallel(operations, {
      maxConcurrency: this.maxConcurrency,
      onProgress: (completed, total) => {
        if (!context.quiet) {
          globalMessageBus.publish(
            MessageTypes.PROGRESS,
            { completed, total, phase: 'fixing' },
            this.name,
          );
        }
      },
    });

    // Merge results
    const fixed: FixedViolation[] = [];
    const unfixable: UnfixableViolation[] = [];
    const modifiedContent = new Map<string, string>();

    for (const result of parallelResult.results) {
      if (result.success && result.data) {
        fixed.push(...result.data.fixed);
        unfixable.push(...result.data.unfixable);
        for (const [path, content] of result.data.modifiedContent) {
          modifiedContent.set(path, content);
        }
      }
    }

    return { fixed, unfixable, modifiedContent };
  }
}

/**
 * Create a fixer agent with optional configuration.
 */
export function createFixerAgent(options?: { maxConcurrency?: number }): FixerAgent {
  return new FixerAgent(options);
}

/**
 * Apply auto-fixes using the fixer agent (convenience function).
 */
export async function applyFixes(
  files: GeneratedFile[],
  violations: LintViolation[],
  context: AgentContext,
  options?: { autoFix?: boolean; maxConcurrency?: number },
): Promise<AgentResult<FixerOutput>> {
  const agent = createFixerAgent({ maxConcurrency: options?.maxConcurrency });
  return agent.execute(
    {
      files,
      violations,
      autoFix: options?.autoFix ?? true,
    },
    context,
  );
}

/**
 * Check if a rule can be auto-fixed (re-export for convenience).
 */
export { canAutoFix } from '../generation/validation/auto-fix.js';
