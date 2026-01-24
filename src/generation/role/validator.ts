import { parse } from 'yaml';
import type { GeneratedFile } from './parser.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  path?: string;
}

export interface FqcnWarning {
  module: string;
  suggested: string;
  line?: number;
}

export interface IdempotencyWarning {
  module: string;
  message: string;
  line?: number;
}

/** Common short module names that should use FQCN */
const SHORT_MODULE_PATTERNS: Array<{ short: string; fqcn: string }> = [
  // Package management
  { short: 'apt', fqcn: 'ansible.builtin.apt' },
  { short: 'yum', fqcn: 'ansible.builtin.yum' },
  { short: 'dnf', fqcn: 'ansible.builtin.dnf' },
  { short: 'package', fqcn: 'ansible.builtin.package' },
  { short: 'pip', fqcn: 'ansible.builtin.pip' },
  // File operations
  { short: 'file', fqcn: 'ansible.builtin.file' },
  { short: 'copy', fqcn: 'ansible.builtin.copy' },
  { short: 'template', fqcn: 'ansible.builtin.template' },
  { short: 'lineinfile', fqcn: 'ansible.builtin.lineinfile' },
  { short: 'blockinfile', fqcn: 'ansible.builtin.blockinfile' },
  { short: 'stat', fqcn: 'ansible.builtin.stat' },
  { short: 'unarchive', fqcn: 'ansible.builtin.unarchive' },
  { short: 'get_url', fqcn: 'ansible.builtin.get_url' },
  // Service management
  { short: 'service', fqcn: 'ansible.builtin.service' },
  { short: 'systemd', fqcn: 'ansible.builtin.systemd_service' },
  { short: 'systemd_service', fqcn: 'ansible.builtin.systemd_service' },
  // User/group
  { short: 'user', fqcn: 'ansible.builtin.user' },
  { short: 'group', fqcn: 'ansible.builtin.group' },
  // Command execution
  { short: 'command', fqcn: 'ansible.builtin.command' },
  { short: 'shell', fqcn: 'ansible.builtin.shell' },
  // Control flow
  { short: 'include_tasks', fqcn: 'ansible.builtin.include_tasks' },
  { short: 'import_tasks', fqcn: 'ansible.builtin.import_tasks' },
  { short: 'include_vars', fqcn: 'ansible.builtin.include_vars' },
  { short: 'set_fact', fqcn: 'ansible.builtin.set_fact' },
  { short: 'debug', fqcn: 'ansible.builtin.debug' },
  { short: 'fail', fqcn: 'ansible.builtin.fail' },
  { short: 'assert', fqcn: 'ansible.builtin.assert' },
];

/** Modules that should have explicit state parameter */
const STATE_REQUIRED_MODULES: Array<{
  pattern: string;
  states: string[];
}> = [
  {
    pattern: 'ansible.builtin.apt',
    states: ['present', 'absent', 'latest', 'build-dep', 'fixed'],
  },
  {
    pattern: 'ansible.builtin.dnf',
    states: ['present', 'absent', 'latest', 'installed', 'removed'],
  },
  {
    pattern: 'ansible.builtin.yum',
    states: ['present', 'absent', 'latest', 'installed', 'removed'],
  },
  {
    pattern: 'ansible.builtin.package',
    states: ['present', 'absent', 'latest'],
  },
  {
    pattern: 'ansible.builtin.service',
    states: ['started', 'stopped', 'restarted', 'reloaded'],
  },
  {
    pattern: 'ansible.builtin.systemd_service',
    states: ['started', 'stopped', 'restarted', 'reloaded'],
  },
  {
    pattern: 'ansible.builtin.file',
    states: ['file', 'directory', 'link', 'hard', 'touch', 'absent'],
  },
];

/**
 * Validate a single YAML string.
 * @param content - YAML content to validate
 * @param path - File path for error messages
 */
export function validateYaml(content: string, path: string): ValidationResult {
  try {
    parse(content);
    return { valid: true, path };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown YAML error';
    return {
      valid: false,
      error: message,
      path,
    };
  }
}

/**
 * Validate all generated files.
 * Only validates .yml/.yaml files.
 * @param files - Generated files to validate
 * @returns Array of validation results (only failures)
 */
export function validateAllFiles(files: GeneratedFile[]): ValidationResult[] {
  const failures: ValidationResult[] = [];

  for (const file of files) {
    // Only validate YAML files
    if (!file.path.endsWith('.yml') && !file.path.endsWith('.yaml')) {
      continue;
    }

    const result = validateYaml(file.content, file.path);
    if (!result.valid) {
      failures.push(result);
    }
  }

  return failures;
}

/**
 * Check for FQCN usage in tasks.
 * Warns if short module names detected (apt instead of ansible.builtin.apt).
 * @param content - YAML content
 * @returns Array of warnings (non-blocking)
 */
export function checkFqcn(content: string): FqcnWarning[] {
  const warnings: FqcnWarning[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    for (const { short, fqcn } of SHORT_MODULE_PATTERNS) {
      // Match module at start of line or after space (task key position)
      // Pattern: "  apt:" or "- apt:" but not "ansible.builtin.apt:"
      const regex = new RegExp(`^(\\s*-?\\s*)${short}:`, 'm');
      if (regex.test(line)) {
        // Make sure it's not already FQCN
        if (!line.includes('ansible.') && !line.includes('community.')) {
          warnings.push({
            module: short,
            suggested: fqcn,
            line: lineNumber,
          });
        }
      }
    }
  }

  return warnings;
}

/**
 * Check for basic idempotency patterns.
 * Warns if state: parameter missing from stateful modules.
 * @param content - YAML content
 * @returns Array of warnings (non-blocking)
 */
export function checkIdempotency(content: string): IdempotencyWarning[] {
  const warnings: IdempotencyWarning[] = [];

  // Parse YAML to analyze task structure
  let parsed: unknown;
  try {
    parsed = parse(content);
  } catch {
    // If YAML is invalid, skip idempotency check
    return warnings;
  }

  // Handle array of tasks (typical tasks/main.yml format)
  if (Array.isArray(parsed)) {
    for (const task of parsed) {
      if (typeof task !== 'object' || task === null) continue;

      const taskObj = task as Record<string, unknown>;
      checkTaskIdempotency(taskObj, warnings);
    }
  }

  return warnings;
}

/**
 * Check a single task for idempotency issues.
 */
function checkTaskIdempotency(task: Record<string, unknown>, warnings: IdempotencyWarning[]): void {
  for (const { pattern, states } of STATE_REQUIRED_MODULES) {
    // Check if task uses this module
    if (task[pattern] && typeof task[pattern] === 'object') {
      const moduleArgs = task[pattern] as Record<string, unknown>;

      // Check if state is specified
      if (!('state' in moduleArgs)) {
        const taskName = typeof task.name === 'string' ? task.name : 'unnamed task';
        warnings.push({
          module: pattern,
          message: `Task "${taskName}" uses ${pattern} without explicit state parameter. Consider adding state: ${states.slice(0, 2).join(' or ')}`,
        });
      }
    }
  }
}

/**
 * Run all validation checks on generated files.
 * Returns a summary of all issues found.
 */
export interface ValidationSummary {
  yamlErrors: ValidationResult[];
  fqcnWarnings: FqcnWarning[];
  idempotencyWarnings: IdempotencyWarning[];
  isValid: boolean;
}

export function validateGeneratedRole(files: GeneratedFile[]): ValidationSummary {
  const yamlErrors = validateAllFiles(files);
  const fqcnWarnings: FqcnWarning[] = [];
  const idempotencyWarnings: IdempotencyWarning[] = [];

  // Run quality checks on YAML files
  for (const file of files) {
    if (file.path.endsWith('.yml') || file.path.endsWith('.yaml')) {
      fqcnWarnings.push(...checkFqcn(file.content));
      idempotencyWarnings.push(...checkIdempotency(file.content));
    }
  }

  return {
    yamlErrors,
    fqcnWarnings,
    idempotencyWarnings,
    isValid: yamlErrors.length === 0,
  };
}
