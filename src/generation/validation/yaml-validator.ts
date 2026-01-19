import { parse, YAMLParseError } from 'yaml';
import type { GeneratedFile } from '../role/parser.js';

export interface YamlValidationError {
  type: 'yaml-syntax';
  path: string;
  line?: number;
  column?: number;
  message: string;
}

/**
 * Check if a file is a YAML file based on extension.
 */
function isYamlFile(path: string): boolean {
  return path.endsWith('.yml') || path.endsWith('.yaml');
}

/**
 * Validate YAML syntax for a single file.
 *
 * @param file - Generated file to validate
 * @returns Validation error or null if valid
 */
export function validateYamlSyntax(
  file: GeneratedFile
): YamlValidationError | null {
  // Skip non-YAML files
  if (!isYamlFile(file.path)) {
    return null;
  }

  try {
    parse(file.content);
    return null;
  } catch (error) {
    if (error instanceof YAMLParseError) {
      return {
        type: 'yaml-syntax',
        path: file.path,
        line: error.linePos?.[0]?.line,
        column: error.linePos?.[0]?.col,
        message: error.message,
      };
    }
    // Unknown error - still report it
    return {
      type: 'yaml-syntax',
      path: file.path,
      message: String(error),
    };
  }
}
