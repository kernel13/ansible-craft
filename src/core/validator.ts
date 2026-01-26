/**
 * Ansible Validator Agent.
 *
 * Validates generated Ansible files against multiple quality standards:
 * - YAML syntax validation (blocking)
 * - FQCN compliance checking (warnings)
 * - Idempotency pattern detection (warnings)
 *
 * Supports parallel file validation for performance.
 */

import type { GeneratedFile } from '../generation/role/parser.js';
import {
  type FqcnWarning,
  type IdempotencyWarning,
  type ValidationReport,
  type YamlValidationError,
  checkFqcnCompliance,
  checkIdempotencyPatterns,
  validateYamlSyntax,
} from '../generation/validation/index.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import { executeParallel } from './orchestrator.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type FileValidationResult,
  type ValidatorInput,
  type ValidatorOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Validate a single file and return detailed results.
 */
function validateSingleFile(file: GeneratedFile): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Run YAML syntax validation (blocking)
  const yamlError = validateYamlSyntax(file);
  if (yamlError) {
    const location = yamlError.line ? `:${yamlError.line}` : '';
    const column = yamlError.column ? `:${yamlError.column}` : '';
    errors.push(`${yamlError.path}${location}${column}: ${yamlError.message}`);
    // Skip further checks on files with syntax errors
    return {
      path: file.path,
      valid: false,
      errors,
      warnings,
    };
  }

  // Run FQCN compliance check (non-blocking)
  const fqcnWarnings = checkFqcnCompliance(file);
  for (const warning of fqcnWarnings) {
    warnings.push(
      `${warning.path}:${warning.line}: Use ${warning.suggestion} instead of ${warning.module}`,
    );
  }

  // Run idempotency check (non-blocking)
  const idempotencyWarnings = checkIdempotencyPatterns(file);
  for (const warning of idempotencyWarnings) {
    warnings.push(`${warning.path}:${warning.line}: ${warning.issue}`);
  }

  return {
    path: file.path,
    valid: true,
    errors,
    warnings,
  };
}

/**
 * Aggregate per-file results into a validation report.
 */
function aggregateResults(
  files: GeneratedFile[],
  perFileResults: Map<string, FileValidationResult>,
): ValidationReport {
  const errors: YamlValidationError[] = [];
  const warnings: (FqcnWarning | IdempotencyWarning)[] = [];

  for (const file of files) {
    const result = perFileResults.get(file.path);
    if (!result) continue;

    // Re-run validation to get typed results for the report
    const yamlError = validateYamlSyntax(file);
    if (yamlError) {
      errors.push(yamlError);
      continue;
    }

    const fqcnWarnings = checkFqcnCompliance(file);
    warnings.push(...fqcnWarnings);

    const idempotencyWarnings = checkIdempotencyPatterns(file);
    warnings.push(...idempotencyWarnings);
  }

  return {
    errors,
    warnings,
    valid: errors.length === 0,
  };
}

/**
 * Ansible Validator Agent implementation.
 *
 * Validates generated files using multiple quality checkers.
 * Supports parallel validation for improved performance on large roles.
 */
export class ValidatorAgent implements Agent<ValidatorInput, ValidatorOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.validator.name;
  readonly description = DEFAULT_AGENT_CONFIGS.validator.description;

  private maxConcurrency: number;

  constructor(options?: { maxConcurrency?: number }) {
    this.maxConcurrency = options?.maxConcurrency ?? DEFAULT_AGENT_CONFIGS.validator.maxConcurrency;
  }

  /**
   * Execute validation on all provided files.
   */
  async execute(
    input: ValidatorInput,
    context: AgentContext,
  ): Promise<AgentResult<ValidatorOutput>> {
    const startTime = Date.now();

    // Publish start message
    await globalMessageBus.publish(
      MessageTypes.VALIDATION_START,
      { fileCount: input.files.length },
      this.name,
    );

    try {
      // Validate files in parallel
      const perFileResults = await this.validateFilesParallel(input.files, context);

      // Aggregate results
      const report = aggregateResults(input.files, perFileResults);

      const duration = Date.now() - startTime;

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.VALIDATION_COMPLETE,
        {
          valid: report.valid,
          errorCount: report.errors.length,
          warningCount: report.warnings.length,
          duration,
        },
        this.name,
      );

      // Return result based on validation status
      const output: ValidatorOutput = {
        report,
        perFileResults,
      };

      // Collect warnings as strings for the agent result
      const warningStrings: string[] = [];
      for (const [, result] of perFileResults) {
        warningStrings.push(...result.warnings);
      }

      if (report.valid) {
        return successResult(output, duration, warningStrings);
      }

      // Validation failed (blocking errors found)
      const errorMessages: string[] = [];
      for (const [, result] of perFileResults) {
        errorMessages.push(...result.errors);
      }

      return {
        success: false,
        data: output,
        errors: [
          createAgentError(this.name, 'VALIDATION_FAILED', errorMessages.join('\n'), {
            recoverable: false,
          }),
        ],
        warnings: warningStrings,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(
        MessageTypes.VALIDATION_ERROR,
        { error: String(error) },
        this.name,
      );

      return failureResult(
        [
          createAgentError(this.name, 'VALIDATION_ERROR', String(error), {
            cause: error instanceof Error ? error : undefined,
            recoverable: false,
          }),
        ],
        duration,
      );
    }
  }

  /**
   * Validate files in parallel with concurrency limits.
   */
  private async validateFilesParallel(
    files: GeneratedFile[],
    context: AgentContext,
  ): Promise<Map<string, FileValidationResult>> {
    const perFileResults = new Map<string, FileValidationResult>();

    // For small file counts, process sequentially
    if (files.length <= 2) {
      for (const file of files) {
        const result = validateSingleFile(file);
        perFileResults.set(file.path, result);
      }
      return perFileResults;
    }

    // Process in parallel
    const operations = files.map((file) => async () => {
      const result = validateSingleFile(file);
      return successResult(result, 0);
    });

    const parallelResult = await executeParallel(operations, {
      maxConcurrency: this.maxConcurrency,
      onProgress: (completed, total) => {
        if (!context.quiet) {
          globalMessageBus.publish(
            MessageTypes.PROGRESS,
            { completed, total, phase: 'validation' },
            this.name,
          );
        }
      },
    });

    // Extract results
    for (const result of parallelResult.results) {
      if (result.success && result.data) {
        perFileResults.set(result.data.path, result.data);
      }
    }

    return perFileResults;
  }
}

/**
 * Create a validator agent with optional configuration.
 */
export function createValidatorAgent(options?: { maxConcurrency?: number }): ValidatorAgent {
  return new ValidatorAgent(options);
}

/**
 * Validate files using the validator agent (convenience function).
 */
export async function validateFiles(
  files: GeneratedFile[],
  context: AgentContext,
  options?: { maxConcurrency?: number },
): Promise<AgentResult<ValidatorOutput>> {
  const agent = createValidatorAgent(options);
  return agent.execute({ files }, context);
}
