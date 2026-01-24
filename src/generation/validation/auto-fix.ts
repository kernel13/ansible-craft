/**
 * Auto-fix module for common ansible-lint violations.
 *
 * Provides programmatic fixes for FQCN, formatting, and other
 * common lint issues. Supports both auto-fix mode and suggestions
 * for unfixable violations.
 */

import type { GeneratedFile } from '../role/parser.js';
import type { LintViolation } from './ansible-lint.js';

/**
 * Result of applying auto-fixes to generated files.
 */
export interface AutoFixResult {
  /** Violations that were successfully fixed */
  fixed: FixedViolation[];
  /** Violations that cannot be auto-fixed */
  unfixable: UnfixableViolation[];
  /** Map of file paths to their corrected content */
  modifiedContent: Map<string, string>;
}

/**
 * A violation that was successfully fixed.
 */
export interface FixedViolation {
  /** The rule ID of the violation */
  ruleId: string;
  /** File path where the fix was applied */
  file: string;
  /** Line number of the fix */
  line: number;
  /** Original content before fix */
  original: string;
  /** Replacement content after fix */
  replacement: string;
}

/**
 * A violation that cannot be auto-fixed.
 */
export interface UnfixableViolation {
  /** The rule ID of the violation */
  ruleId: string;
  /** File path where the violation occurred */
  file: string;
  /** Line number of the violation */
  line: number;
  /** Human-readable description of the issue */
  message: string;
  /** Code example suggestion for manual fix */
  suggestion: string;
}

/**
 * Map of short module names to their FQCN equivalents.
 * Matches the mapping in fqcn-checker.ts for consistency.
 */
const FQCN_MAP: Record<string, string> = {
  // Package management
  apt: 'ansible.builtin.apt',
  yum: 'ansible.builtin.yum',
  dnf: 'ansible.builtin.dnf',
  package: 'ansible.builtin.package',
  pip: 'ansible.builtin.pip',
  // File operations
  file: 'ansible.builtin.file',
  copy: 'ansible.builtin.copy',
  template: 'ansible.builtin.template',
  lineinfile: 'ansible.builtin.lineinfile',
  blockinfile: 'ansible.builtin.blockinfile',
  stat: 'ansible.builtin.stat',
  unarchive: 'ansible.builtin.unarchive',
  get_url: 'ansible.builtin.get_url',
  // Service management
  service: 'ansible.builtin.service',
  systemd: 'ansible.builtin.systemd_service',
  systemd_service: 'ansible.builtin.systemd_service',
  // User/group
  user: 'ansible.builtin.user',
  group: 'ansible.builtin.group',
  // Command execution
  command: 'ansible.builtin.command',
  shell: 'ansible.builtin.shell',
  // Control flow
  include_tasks: 'ansible.builtin.include_tasks',
  import_tasks: 'ansible.builtin.import_tasks',
  include_vars: 'ansible.builtin.include_vars',
  set_fact: 'ansible.builtin.set_fact',
  debug: 'ansible.builtin.debug',
  fail: 'ansible.builtin.fail',
  assert: 'ansible.builtin.assert',
};

/**
 * Rule IDs (or prefixes) that can be auto-fixed.
 */
const FIXABLE_RULES = [
  'fqcn',
  'fqcn[action-core]',
  'fqcn[action]',
  'yaml[trailing-spaces]',
  'yaml[new-line-at-end-of-file]',
  'name[casing]',
];

/**
 * Check if a rule ID can be auto-fixed.
 *
 * @param ruleId - The rule ID to check (e.g., 'fqcn[action-core]')
 * @returns true if the rule can be auto-fixed
 */
export function canAutoFix(ruleId: string): boolean {
  // Direct match
  if (FIXABLE_RULES.includes(ruleId)) {
    return true;
  }
  // Check if any fixable rule is a prefix of the ruleId
  return FIXABLE_RULES.some((rule) => ruleId.startsWith(rule + '[') || ruleId === rule);
}

/**
 * Apply auto-fixes to generated files based on lint violations.
 *
 * @param files - The generated files to fix
 * @param violations - Lint violations from ansible-lint
 * @returns Result containing fixed and unfixable violations with modified content
 */
export function applyAutoFixes(files: GeneratedFile[], violations: LintViolation[]): AutoFixResult {
  // Create deep copy of file contents
  const modifiedContent = new Map<string, string>();
  for (const file of files) {
    modifiedContent.set(file.path, file.content);
  }

  const fixed: FixedViolation[] = [];
  const unfixable: UnfixableViolation[] = [];

  // Group violations by file for efficient processing
  const violationsByFile = new Map<string, LintViolation[]>();
  for (const violation of violations) {
    const existing = violationsByFile.get(violation.file) ?? [];
    existing.push(violation);
    violationsByFile.set(violation.file, existing);
  }

  // Process violations for each file
  for (const [filePath, fileViolations] of violationsByFile) {
    let content = modifiedContent.get(filePath);
    if (!content) {
      // File not in our set, add to unfixable
      for (const v of fileViolations) {
        unfixable.push({
          ruleId: v.ruleId,
          file: v.file,
          line: v.line ?? 0,
          message: v.message,
          suggestion: getSuggestion(v.ruleId, v.message),
        });
      }
      continue;
    }

    // Sort violations by line number descending to avoid offset issues
    const sortedViolations = [...fileViolations].sort((a, b) => (b.line ?? 0) - (a.line ?? 0));

    for (const violation of sortedViolations) {
      if (!canAutoFix(violation.ruleId)) {
        unfixable.push({
          ruleId: violation.ruleId,
          file: violation.file,
          line: violation.line ?? 0,
          message: violation.message,
          suggestion: getSuggestion(violation.ruleId, violation.message),
        });
        continue;
      }

      // Apply the appropriate fix
      const fixResult = applyFix(content, violation);
      if (fixResult.success) {
        content = fixResult.content;
        fixed.push({
          ruleId: violation.ruleId,
          file: violation.file,
          line: violation.line ?? 0,
          original: fixResult.original,
          replacement: fixResult.replacement,
        });
      } else {
        // Fix failed, add to unfixable
        unfixable.push({
          ruleId: violation.ruleId,
          file: violation.file,
          line: violation.line ?? 0,
          message: violation.message,
          suggestion: getSuggestion(violation.ruleId, violation.message),
        });
      }
    }

    modifiedContent.set(filePath, content);
  }

  return { fixed, unfixable, modifiedContent };
}

interface FixAttemptResult {
  success: boolean;
  content: string;
  original: string;
  replacement: string;
}

/**
 * Apply a fix for a specific violation.
 */
function applyFix(content: string, violation: LintViolation): FixAttemptResult {
  const ruleId = violation.ruleId;

  // FQCN fixes
  if (ruleId.startsWith('fqcn')) {
    return fixFqcn(content, violation.line ?? 0, violation.message);
  }

  // Trailing spaces fix
  if (ruleId === 'yaml[trailing-spaces]') {
    return fixTrailingSpaces(content, violation.line ?? 0);
  }

  // Newline at end of file fix
  if (ruleId === 'yaml[new-line-at-end-of-file]') {
    return fixNewlineAtEnd(content);
  }

  // Task name casing fix
  if (ruleId === 'name[casing]') {
    return fixTaskNameCasing(content, violation.line ?? 0);
  }

  return {
    success: false,
    content,
    original: '',
    replacement: '',
  };
}

/**
 * Fix FQCN violations by replacing short module names with fully qualified names.
 */
function fixFqcn(content: string, line: number, message: string): FixAttemptResult {
  const lines = content.split('\n');
  if (line < 1 || line > lines.length) {
    return { success: false, content, original: '', replacement: '' };
  }

  const lineIndex = line - 1;
  const originalLine = lines[lineIndex];

  // Try to extract module name from message or line content
  let moduleName: string | null = null;

  // Try to find from message (e.g., "Use FQCN for module - `ansible.builtin.apt`")
  const messageMatch = message.match(/`(\w+)`/);
  if (messageMatch) {
    const potentialModule = messageMatch[1];
    if (FQCN_MAP[potentialModule]) {
      moduleName = potentialModule;
    }
  }

  // If not found in message, try to find from line content
  if (!moduleName) {
    for (const [shortName] of Object.entries(FQCN_MAP)) {
      // Match module at task key position
      const regex = new RegExp(`^(\\s*-?\\s*)${shortName}:(\\s*)`, 'm');
      if (regex.test(originalLine)) {
        moduleName = shortName;
        break;
      }
    }
  }

  if (!moduleName || !FQCN_MAP[moduleName]) {
    return { success: false, content, original: '', replacement: '' };
  }

  const fqcn = FQCN_MAP[moduleName];

  // Replace the short module name with FQCN
  const regex = new RegExp(`^(\\s*-?\\s*)${moduleName}:(\\s*)`, 'm');
  const newLine = originalLine.replace(regex, `$1${fqcn}:$2`);

  if (newLine === originalLine) {
    return { success: false, content, original: '', replacement: '' };
  }

  lines[lineIndex] = newLine;
  return {
    success: true,
    content: lines.join('\n'),
    original: originalLine.trim(),
    replacement: newLine.trim(),
  };
}

/**
 * Fix trailing whitespace on a specific line.
 */
function fixTrailingSpaces(content: string, line: number): FixAttemptResult {
  const lines = content.split('\n');
  if (line < 1 || line > lines.length) {
    // If no specific line, fix all trailing spaces
    const newContent = content.replace(/[ \t]+$/gm, '');
    return {
      success: newContent !== content,
      content: newContent,
      original: '(trailing whitespace)',
      replacement: '(removed)',
    };
  }

  const lineIndex = line - 1;
  const originalLine = lines[lineIndex];
  const newLine = originalLine.replace(/[ \t]+$/, '');

  if (newLine === originalLine) {
    return { success: false, content, original: '', replacement: '' };
  }

  lines[lineIndex] = newLine;
  return {
    success: true,
    content: lines.join('\n'),
    original: JSON.stringify(originalLine),
    replacement: JSON.stringify(newLine),
  };
}

/**
 * Ensure file ends with exactly one newline.
 */
function fixNewlineAtEnd(content: string): FixAttemptResult {
  // Remove trailing whitespace and ensure single newline
  const trimmed = content.trimEnd();
  const newContent = trimmed + '\n';

  if (newContent === content) {
    return { success: false, content, original: '', replacement: '' };
  }

  return {
    success: true,
    content: newContent,
    original: '(missing newline)',
    replacement: '(added newline)',
  };
}

/**
 * Fix task name casing (capitalize first letter).
 */
function fixTaskNameCasing(content: string, line: number): FixAttemptResult {
  const lines = content.split('\n');
  if (line < 1 || line > lines.length) {
    return { success: false, content, original: '', replacement: '' };
  }

  const lineIndex = line - 1;
  const originalLine = lines[lineIndex];

  // Match name: value pattern
  const nameMatch = originalLine.match(/^(\s*-?\s*name:\s*)(['"]?)([a-z])/);
  if (!nameMatch) {
    return { success: false, content, original: '', replacement: '' };
  }

  const [, prefix, quote, firstChar] = nameMatch;
  const newLine =
    prefix + quote + firstChar.toUpperCase() + originalLine.slice(prefix.length + quote.length + 1);

  if (newLine === originalLine) {
    return { success: false, content, original: '', replacement: '' };
  }

  lines[lineIndex] = newLine;
  return {
    success: true,
    content: lines.join('\n'),
    original: originalLine.trim(),
    replacement: newLine.trim(),
  };
}

/**
 * Get a helpful suggestion for unfixable violations.
 */
function getSuggestion(ruleId: string, message: string): string {
  // Common rule suggestions
  const suggestions: Record<string, string> = {
    'risky-file-permissions': "Use explicit mode with quotes: mode: '0644' instead of mode: 644",
    'no-changed-when': 'Add changed_when: false for read-only commands or specify a condition',
    'command-instead-of-module':
      'Consider using a built-in module instead of command/shell (e.g., ansible.builtin.copy, ansible.builtin.file)',
    'no-handler': 'Extract repeated task to a handler and use notify: handler_name',
    'yaml[line-length]':
      'Break long lines using YAML multiline syntax (| or >) or split across multiple lines',
    'var-naming': 'Use snake_case for variable names (e.g., my_variable instead of myVariable)',
    'role-name': 'Use lowercase letters, numbers, and underscores for role names',
    'no-jinja-when': 'Remove {{ }} from when conditions - Ansible auto-evaluates when expressions',
    schema: 'Check YAML structure against Ansible schema - verify key names and nesting',
    'key-order': 'Reorder task keys: name should come first, then module, then arguments',
    'empty-string-compare': 'Use `when: my_var | length > 0` instead of `when: my_var != ""`',
  };

  // Check for direct match
  if (suggestions[ruleId]) {
    return suggestions[ruleId];
  }

  // Check for prefix match (e.g., 'yaml[something]')
  for (const [rule, suggestion] of Object.entries(suggestions)) {
    if (ruleId.startsWith(rule)) {
      return suggestion;
    }
  }

  // Extract hint from message if available
  if (message.includes('instead')) {
    return message;
  }

  // Default suggestion
  return `See ansible-lint documentation for rule: ${ruleId}`;
}
