import chalk from 'chalk';
import type { GeneratedFile } from '../role/parser.js';
import {
  validateYamlSyntax,
  type YamlValidationError,
} from './yaml-validator.js';
import { checkFqcnCompliance, type FqcnWarning } from './fqcn-checker.js';
import {
  checkIdempotencyPatterns,
  type IdempotencyWarning,
} from './idempotency-checker.js';

export type ValidationIssue =
  | YamlValidationError
  | FqcnWarning
  | IdempotencyWarning;

export interface ValidationReport {
  /** Blocking errors (YAML syntax) */
  errors: YamlValidationError[];
  /** Non-blocking warnings (FQCN, idempotency) */
  warnings: (FqcnWarning | IdempotencyWarning)[];
  /** Whether all files are valid (no errors) */
  valid: boolean;
}

/**
 * Run all validations on generated files.
 *
 * @param files - Generated files to validate
 * @returns Validation report
 */
export function validateGeneratedFiles(files: GeneratedFile[]): ValidationReport {
  const errors: YamlValidationError[] = [];
  const warnings: (FqcnWarning | IdempotencyWarning)[] = [];

  for (const file of files) {
    // Run YAML syntax validation (blocking errors)
    const yamlError = validateYamlSyntax(file);
    if (yamlError) {
      errors.push(yamlError);
      // Skip further checks on files with syntax errors
      continue;
    }

    // Run FQCN compliance check (non-blocking warnings)
    const fqcnWarnings = checkFqcnCompliance(file);
    warnings.push(...fqcnWarnings);

    // Run idempotency check (non-blocking warnings)
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
 * Display validation report to console.
 * Errors in red, warnings in yellow.
 *
 * @param report - Validation report to display
 */
export function displayValidationReport(report: ValidationReport): void {
  if (report.errors.length > 0) {
    console.error(chalk.red('\n Validation Errors:'));
    for (const error of report.errors) {
      const location = error.line ? `:${error.line}` : '';
      const column = error.column ? `:${error.column}` : '';
      console.error(
        chalk.red(`  ${error.path}${location}${column}: ${error.message}`)
      );
    }
  }

  if (report.warnings.length > 0) {
    console.warn(chalk.yellow('\n Validation Warnings:'));
    for (const warning of report.warnings) {
      if (warning.type === 'fqcn') {
        console.warn(
          chalk.yellow(
            `  ${warning.path}:${warning.line}: Use ${warning.suggestion} instead of ${warning.module}`
          )
        );
      } else {
        console.warn(
          chalk.yellow(`  ${warning.path}:${warning.line}: ${warning.issue}`)
        );
      }
    }
  }

  if (report.valid && report.warnings.length === 0) {
    console.log(chalk.green('\n All validations passed'));
  }
}

// Re-export all types and functions from sub-modules
export * from './yaml-validator.js';
export * from './fqcn-checker.js';
export * from './idempotency-checker.js';
