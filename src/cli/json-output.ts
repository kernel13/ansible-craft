/**
 * JSON output types and formatters for machine-readable output.
 *
 * JSON output follows these principles:
 * - All JSON goes to stdout (for piping)
 * - All progress/spinners go to stderr
 * - Stable format_version for backward compatibility
 * - Errors have consistent structure
 */

/**
 * File entry in generation result.
 */
export interface FileEntry {
  /** Relative path within the generated directory */
  path: string;
  /** File or directory */
  type: 'file' | 'directory';
  /** Size in bytes */
  bytes: number;
}

/**
 * Warning from lint or validation.
 */
export interface Warning {
  /** Rule or validation code */
  code: string;
  /** Human-readable message */
  message: string;
  /** File path (if applicable) */
  file?: string;
  /** Line number (if applicable) */
  line?: number;
}

/**
 * Successful generation result.
 */
export interface GenerationResult {
  /** Format version for backward compatibility */
  format_version: '1.0';
  /** Success status */
  success: true;
  /** Type of generated content */
  type: 'role' | 'playbook';
  /** Name of generated resource */
  name: string;
  /** Output directory path */
  output_path: string;
  /** List of created files */
  files: FileEntry[];
  /** Warnings from lint/validation */
  warnings: Warning[];
  /** Execution metadata */
  metadata: {
    /** Command that was run */
    command: string;
    /** ISO timestamp */
    timestamp: string;
    /** Duration in milliseconds */
    duration_ms: number;
  };
}

/**
 * Error result.
 */
export interface ErrorResult {
  /** Format version for backward compatibility */
  format_version: '1.0';
  /** Success status */
  success: false;
  /** Error details */
  error: {
    /** Error code (e.g., 'API_ERROR', 'VALIDATION_ERROR') */
    code: string;
    /** Human-readable message */
    message: string;
    /** Additional details */
    details?: Record<string, unknown>;
  };
}

/**
 * Format successful generation as JSON.
 */
export function formatJsonSuccess(
  type: 'role' | 'playbook',
  name: string,
  outputPath: string,
  files: Array<{ path: string; content: string }>,
  warnings: Warning[],
  command: string,
  startTime: number,
): GenerationResult {
  const fileEntries: FileEntry[] = files.map((f) => ({
    path: f.path,
    type: 'file' as const,
    bytes: Buffer.byteLength(f.content, 'utf-8'),
  }));

  return {
    format_version: '1.0',
    success: true,
    type,
    name,
    output_path: outputPath,
    files: fileEntries,
    warnings,
    metadata: {
      command,
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
    },
  };
}

/**
 * Format error as JSON.
 */
export function formatJsonError(
  code: string,
  message: string,
  details?: Record<string, unknown>,
): ErrorResult {
  return {
    format_version: '1.0',
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

/**
 * Output JSON to stdout.
 */
export function outputJson(data: GenerationResult | ErrorResult): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Map lint violations to warnings.
 */
export function lintViolationsToWarnings(
  violations: Array<{ ruleId: string; message: string; file?: string; line?: number }>,
): Warning[] {
  return violations.map((v) => ({
    code: v.ruleId,
    message: v.message,
    file: v.file,
    line: v.line,
  }));
}
