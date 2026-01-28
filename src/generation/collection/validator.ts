/**
 * Collection validation logic.
 *
 * Validates generated collection files for YAML syntax and schema compliance.
 */

import YAML from 'yaml';
import type { GeneratedFile } from '../role/parser.js';
import { validateGalaxyYml } from './galaxy-schema.js';

export interface ValidationError {
  file: string;
  line?: number;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  file: string;
  message: string;
  severity: 'warning';
}

export interface CollectionValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Validate YAML syntax for a file.
 */
function validateYamlSyntax(file: GeneratedFile): ValidationError[] {
  const errors: ValidationError[] = [];

  // Skip non-YAML files
  if (!file.path.endsWith('.yml') && !file.path.endsWith('.yaml')) {
    return errors;
  }

  try {
    YAML.parse(file.content);
  } catch (error) {
    const yamlError = error as Error & { linePos?: { line: number } };
    errors.push({
      file: file.path,
      line: yamlError.linePos?.line,
      message: `YAML syntax error: ${yamlError.message}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate galaxy.yml against schema.
 */
function validateGalaxyYmlFile(file: GeneratedFile): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    const data = YAML.parse(file.content);
    const result = validateGalaxyYml(data);

    if (!result.valid) {
      for (const error of result.errors) {
        errors.push({
          file: file.path,
          message: error,
          severity: 'error',
        });
      }
    }
  } catch (error) {
    errors.push({
      file: file.path,
      message: `Failed to parse galaxy.yml: ${(error as Error).message}`,
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate all generated collection files.
 *
 * Performs the following checks:
 * 1. YAML syntax validation for all .yml/.yaml files
 * 2. galaxy.yml schema validation
 * 3. Namespace/name format validation
 *
 * @param files - Generated files to validate
 * @returns Validation result with errors and warnings
 */
export async function validateCollectionFiles(
  files: GeneratedFile[],
): Promise<CollectionValidationResult> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const file of files) {
    // YAML syntax validation
    const yamlErrors = validateYamlSyntax(file);
    errors.push(...yamlErrors);

    // galaxy.yml schema validation
    if (file.path === 'galaxy.yml') {
      const galaxyErrors = validateGalaxyYmlFile(file);
      errors.push(...galaxyErrors);
    }
  }

  // Check for required files
  const hasGalaxyYml = files.some((f) => f.path === 'galaxy.yml');
  if (!hasGalaxyYml) {
    errors.push({
      file: 'galaxy.yml',
      message: 'Required file galaxy.yml is missing',
      severity: 'error',
    });
  }

  const hasReadme = files.some((f) => f.path === 'README.md');
  if (!hasReadme) {
    warnings.push({
      file: 'README.md',
      message: 'README.md is recommended but missing',
      severity: 'warning',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Format validation errors for display.
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  if (errors.length === 0) {
    return '';
  }

  return errors
    .map((error) => {
      const location = error.line ? `${error.file}:${error.line}` : error.file;
      return `  - ${location}: ${error.message}`;
    })
    .join('\n');
}

/**
 * Format validation warnings for display.
 */
export function formatValidationWarnings(warnings: ValidationWarning[]): string {
  if (warnings.length === 0) {
    return '';
  }

  return warnings.map((warning) => `  - ${warning.file}: ${warning.message}`).join('\n');
}
