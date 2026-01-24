/**
 * Preview module for dry-run display functionality.
 *
 * Provides syntax-highlighted file previews, lint result display,
 * and confirmation prompts for the dry-run mode.
 */

import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { highlight } from 'cli-highlight';

import type { GeneratedFile } from '../generation/role/parser.js';
import type { LintViolation } from '../generation/validation/ansible-lint.js';

/**
 * Detect the language for syntax highlighting based on file extension.
 *
 * @param path - File path to detect language from
 * @returns Language name for cli-highlight
 */
function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'yml':
    case 'yaml':
      return 'yaml';
    case 'md':
      return 'markdown';
    case 'json':
      return 'json';
    case 'sh':
    case 'bash':
      return 'bash';
    case 'py':
      return 'python';
    default:
      return 'yaml'; // Default to yaml for Ansible files
  }
}

/**
 * Display a single file with syntax highlighting.
 *
 * @param path - File path (used as header)
 * @param content - File content to display
 */
export function displayFilePreview(path: string, content: string): void {
  const language = detectLanguage(path);

  console.log(chalk.cyan(`\n=== ${path} ===\n`));
  console.log(highlight(content, { language, ignoreIllegals: true }));
}

/**
 * Display all generated files with syntax highlighting.
 *
 * @param files - Array of generated files to display
 */
export function displayFilesPreview(files: GeneratedFile[]): void {
  console.log(chalk.bold(`\nGenerated files (${files.length}):\n`));

  for (const file of files) {
    displayFilePreview(file.path, file.content);
  }
}

/**
 * Display lint validation results.
 *
 * Groups violations by file and shows colored output based on severity.
 *
 * @param violations - Array of lint violations to display
 */
export function displayLintResults(violations: LintViolation[]): void {
  console.log(chalk.bold('\nLint validation:\n'));

  if (violations.length === 0) {
    console.log(chalk.green('  ✓ ansible-lint passed'));
    return;
  }

  // Group violations by file
  const byFile = new Map<string, LintViolation[]>();
  for (const v of violations) {
    const existing = byFile.get(v.file) ?? [];
    existing.push(v);
    byFile.set(v.file, existing);
  }

  // Count errors vs warnings
  let errorCount = 0;
  let warningCount = 0;

  for (const [file, fileViolations] of byFile) {
    console.log(chalk.dim(`  ${file}:`));

    for (const v of fileViolations) {
      if (v.level === 'error') {
        errorCount++;
      } else {
        warningCount++;
      }

      const lineInfo = v.line ? `:${v.line}` : '';
      const color = v.level === 'error' ? chalk.red : chalk.yellow;
      const icon = v.level === 'error' ? '✗' : '⚠';

      console.log(color(`    ${icon} ${file}${lineInfo}: [${v.ruleId}] ${v.message}`));
    }
  }

  // Print summary
  console.log();
  const parts: string[] = [];
  if (errorCount > 0) {
    parts.push(chalk.red(`${errorCount} error${errorCount !== 1 ? 's' : ''}`));
  }
  if (warningCount > 0) {
    parts.push(chalk.yellow(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`));
  }
  console.log(`  ${parts.join(', ')}`);
}

/**
 * Display preview and prompt for confirmation.
 *
 * Shows all generated files with syntax highlighting, displays lint results
 * if provided, and prompts the user to confirm writing the files.
 *
 * @param files - Generated files to preview
 * @param lintViolations - Optional lint violations to display
 * @returns true if user confirms, false otherwise
 */
export async function previewAndConfirm(
  files: GeneratedFile[],
  lintViolations?: LintViolation[],
): Promise<boolean> {
  displayFilesPreview(files);

  if (lintViolations) {
    displayLintResults(lintViolations);
  }

  console.log(); // Add spacing before prompt

  return confirm({
    message: 'Write these files?',
    default: false,
  });
}
