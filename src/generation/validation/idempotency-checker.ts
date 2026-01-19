import { parse } from 'yaml';
import type { GeneratedFile } from '../role/parser.js';

export interface IdempotencyWarning {
  type: 'idempotency';
  path: string;
  line: number;
  module: string;
  issue: string;
}

/** Modules that should have explicit state parameter */
const STATE_REQUIRED_MODULES = new Set([
  'ansible.builtin.apt',
  'ansible.builtin.dnf',
  'ansible.builtin.yum',
  'ansible.builtin.package',
  'ansible.builtin.pip',
  'ansible.builtin.file',
  'ansible.builtin.service',
  'ansible.builtin.systemd_service',
  'ansible.builtin.user',
  'ansible.builtin.group',
]);

/** Modules that need creates/removes/changed_when for idempotency */
const COMMAND_MODULES = new Set([
  'ansible.builtin.command',
  'ansible.builtin.shell',
]);

/**
 * Check if a file is a YAML file in the tasks directory.
 */
function isTaskFile(path: string): boolean {
  const isYaml = path.endsWith('.yml') || path.endsWith('.yaml');
  const inTasks = path.includes('tasks/');
  return isYaml && inTasks;
}

/**
 * Find line number for a task in the content.
 * Searches for the task name to get approximate line.
 */
function findTaskLine(content: string, taskName: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(`name: ${taskName}`) || lines[i].includes(`name: "${taskName}"`)) {
      return i + 1;
    }
  }
  return 1; // Default to line 1 if not found
}

/**
 * Check a single task for idempotency issues.
 */
function checkTask(
  task: Record<string, unknown>,
  file: GeneratedFile,
  warnings: IdempotencyWarning[]
): void {
  const taskName = typeof task.name === 'string' ? task.name : 'unnamed task';
  const line = findTaskLine(file.content, taskName);

  // Check each known module
  for (const module of STATE_REQUIRED_MODULES) {
    if (task[module] && typeof task[module] === 'object') {
      const moduleArgs = task[module] as Record<string, unknown>;

      if (!('state' in moduleArgs)) {
        warnings.push({
          type: 'idempotency',
          path: file.path,
          line,
          module,
          issue: `${module} used without state: parameter`,
        });
      }
    }
  }

  // Check command/shell modules
  for (const module of COMMAND_MODULES) {
    if (task[module] !== undefined) {
      // Module args can be inline or in separate 'args:' key
      const moduleArgs = typeof task[module] === 'object'
        ? (task[module] as Record<string, unknown>)
        : {};
      const argsKey = typeof task.args === 'object'
        ? (task.args as Record<string, unknown>)
        : {};

      const hasIdempotencyControl =
        'creates' in moduleArgs ||
        'removes' in moduleArgs ||
        'creates' in argsKey ||
        'removes' in argsKey ||
        'changed_when' in task;

      if (!hasIdempotencyControl) {
        warnings.push({
          type: 'idempotency',
          path: file.path,
          line,
          module,
          issue: `${module} used without creates:, removes:, or changed_when:`,
        });
      }
    }
  }
}

/**
 * Check for common idempotency issues.
 *
 * Detects:
 * - Stateful modules (apt, service, etc.) without state: parameter
 * - command/shell without creates:, removes:, or changed_when:
 *
 * @param file - Generated file to check
 * @returns Array of warnings
 */
export function checkIdempotencyPatterns(
  file: GeneratedFile
): IdempotencyWarning[] {
  // Only check task files
  if (!isTaskFile(file.path)) {
    return [];
  }

  const warnings: IdempotencyWarning[] = [];

  // Parse YAML to analyze task structure
  let parsed: unknown;
  try {
    parsed = parse(file.content);
  } catch {
    // If YAML is invalid, skip idempotency check
    return warnings;
  }

  // Handle array of tasks (typical tasks/main.yml format)
  if (Array.isArray(parsed)) {
    for (const task of parsed) {
      if (typeof task !== 'object' || task === null) {
        continue;
      }
      checkTask(task as Record<string, unknown>, file, warnings);
    }
  }

  return warnings;
}
