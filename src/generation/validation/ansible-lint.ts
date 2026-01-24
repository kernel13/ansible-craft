/**
 * Ansible-lint integration module.
 *
 * Provides subprocess wrapper to call ansible-lint CLI and parse its SARIF output
 * into structured validation results.
 */

/**
 * A single lint violation from ansible-lint.
 */
export interface LintViolation {
  /** Rule identifier (e.g., 'yaml[line-length]', 'fqcn[action-core]') */
  ruleId: string;
  /** Severity level */
  level: 'error' | 'warning';
  /** Human-readable description of the issue */
  message: string;
  /** File path where the violation occurred */
  file: string;
  /** Line number (if available) */
  line?: number;
  /** Column number (if available) */
  column?: number;
}

/**
 * Result from running ansible-lint.
 */
export interface AnsibleLintResult {
  /** List of lint violations found */
  violations: LintViolation[];
  /** Exit code from ansible-lint process */
  exitCode: number;
  /** Whether ansible-lint is available on the system */
  available: boolean;
}

/**
 * SARIF (Static Analysis Results Interchange Format) types.
 * Based on OASIS SARIF v2.1.0 specification.
 */
interface SarifLog {
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: { name: string; rules?: SarifRule[] } };
  results: SarifResult[];
}

interface SarifRule {
  id: string;
  name?: string;
  shortDescription?: { text: string };
}

interface SarifResult {
  ruleId: string;
  level?: 'error' | 'warning' | 'note' | 'none';
  message: { text: string };
  locations?: SarifLocation[];
}

interface SarifLocation {
  physicalLocation?: {
    artifactLocation?: { uri: string };
    region?: { startLine?: number; startColumn?: number };
  };
}

/**
 * Check if ansible-lint is installed and available.
 *
 * @returns true if ansible-lint is available, false otherwise
 */
export async function isAnsibleLintAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['ansible-lint', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    // ENOENT or other spawn error means ansible-lint is not available
    return false;
  }
}

/**
 * Run ansible-lint on a target path and parse results.
 *
 * @param targetPath - Path to file or directory to lint
 * @returns Lint result with violations, exit code, and availability status
 */
export async function runAnsibleLint(targetPath: string): Promise<AnsibleLintResult> {
  // First check if ansible-lint is available
  const available = await isAnsibleLintAvailable();
  if (!available) {
    return {
      violations: [],
      exitCode: 1,
      available: false,
    };
  }

  try {
    const proc = Bun.spawn(['ansible-lint', '--format', 'sarif', '--nocolor', targetPath], {
      stdout: 'pipe',
      stderr: 'pipe',
    });

    const stdout = await new Response(proc.stdout).text();
    await proc.exited;

    // Parse SARIF output from stdout
    const violations = parseSarifResults(stdout);

    return {
      violations,
      exitCode: proc.exitCode ?? 1,
      available: true,
    };
  } catch {
    // If spawn fails unexpectedly, return empty result
    return {
      violations: [],
      exitCode: 1,
      available: true,
    };
  }
}

/**
 * Parse SARIF JSON output from ansible-lint into structured violations.
 *
 * Handles empty output, invalid JSON, and missing optional fields gracefully.
 *
 * @param sarifJson - Raw SARIF JSON string from ansible-lint stdout
 * @returns Array of lint violations
 */
export function parseSarifResults(sarifJson: string): LintViolation[] {
  // Handle empty or whitespace-only input
  if (!sarifJson || sarifJson.trim() === '') {
    return [];
  }

  let sarif: SarifLog;
  try {
    sarif = JSON.parse(sarifJson);
  } catch {
    // Invalid JSON - return empty array
    return [];
  }

  // Validate basic SARIF structure
  if (!sarif.runs || sarif.runs.length === 0) {
    return [];
  }

  const violations: LintViolation[] = [];
  const run = sarif.runs[0];

  if (!run.results) {
    return [];
  }

  for (const result of run.results) {
    // Map SARIF level to our level type (default to 'warning')
    let level: 'error' | 'warning' = 'warning';
    if (result.level === 'error') {
      level = 'error';
    }

    // Extract location information (defensive - all fields optional)
    const location = result.locations?.[0]?.physicalLocation;
    const file = location?.artifactLocation?.uri ?? 'unknown';
    const line = location?.region?.startLine;
    const column = location?.region?.startColumn;

    violations.push({
      ruleId: result.ruleId ?? 'unknown',
      level,
      message: result.message?.text ?? 'Unknown issue',
      file,
      line,
      column,
    });
  }

  return violations;
}

/**
 * Get installation instructions for ansible-lint.
 *
 * @returns Formatted string with installation instructions
 */
export function formatInstallInstructions(): string {
  return `ansible-lint is not installed or not found in PATH.

To install ansible-lint:
  pip install ansible-lint

Note: ansible-lint 6.0+ is recommended for SARIF output support.

For more information, see:
  https://ansible.readthedocs.io/projects/lint/installing/`;
}
