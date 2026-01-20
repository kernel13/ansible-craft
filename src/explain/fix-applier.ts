/**
 * Fix application logic with safety checks.
 *
 * Validates YAML syntax, displays fixes with highlighting,
 * confirms with user, and creates backups before applying changes.
 */

import { copyFile, writeFile } from 'node:fs/promises';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { highlight } from 'cli-highlight';
import { parse } from 'yaml';

/**
 * Extract YAML code block from Claude's response.
 * Looks for ```yaml ... ``` blocks in the Corrected Code section.
 */
export function extractYamlFromResponse(response: string): string | null {
  // Match yaml code blocks (with or without 'yaml' language specifier)
  const yamlMatch = response.match(/```(?:yaml)?\n([\s\S]*?)\n```/);
  if (yamlMatch) {
    return yamlMatch[1].trim();
  }
  return null;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate that the fix has valid YAML syntax.
 */
export function validateFixSyntax(yamlContent: string): ValidationResult {
  try {
    parse(yamlContent);
    return { valid: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid YAML';
    return { valid: false, error: message };
  }
}

/**
 * Display the proposed fix with syntax highlighting.
 */
export function displayFix(yamlContent: string): void {
  console.log(chalk.cyan('\n=== Proposed Fix ===\n'));
  const highlighted = highlight(yamlContent, { language: 'yaml' });
  console.log(highlighted);
  console.log('');
}

interface ApplyResult {
  applied: boolean;
  backupPath?: string;
}

/**
 * Apply the fix to a file with safety checks.
 * Creates a backup before modifying.
 */
export async function applyFix(
  targetFile: string,
  fixedYaml: string,
  options: { skipConfirm?: boolean } = {},
): Promise<ApplyResult> {
  // 1. Validate YAML syntax first
  const validation = validateFixSyntax(fixedYaml);
  if (!validation.valid) {
    console.log(chalk.red(`\nCannot apply fix: ${validation.error}`));
    return { applied: false };
  }

  // 2. Display the fix
  displayFix(fixedYaml);

  // 3. Confirm with user (default: false for safety)
  if (!options.skipConfirm) {
    const shouldApply = await confirm({
      message: `Apply this fix to ${targetFile}?`,
      default: false,
    });

    if (!shouldApply) {
      console.log(chalk.dim('Fix not applied.'));
      return { applied: false };
    }
  }

  // 4. Create backup
  const backupPath = `${targetFile}.backup`;
  await copyFile(targetFile, backupPath);

  // 5. Write the fix
  await writeFile(targetFile, fixedYaml, 'utf-8');

  console.log(chalk.green(`\nFix applied to ${targetFile}`));
  console.log(chalk.dim(`Backup saved to ${backupPath}`));

  return { applied: true, backupPath };
}

/**
 * Try to locate the target file from error message.
 * Returns undefined if cannot determine.
 */
export function locateTargetFile(errorMessage: string): string | undefined {
  // Common patterns in Ansible errors:
  // - "The error appears to be in '/path/to/file.yml': line X"
  // - "ERROR! the playbook: /path/to/file.yml could not be found"
  // - "in /path/to/file.yml, line X"

  const patterns = [
    /in ['"]?([^'":\n]+\.ya?ml)['"]?/i,
    /playbook:\s+(['"]?)([^'":\n]+\.ya?ml)\1/i,
    /file\s+(['"]?)([^'":\n]+\.ya?ml)\1/i,
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match) {
      // Return the captured group that contains the path
      return match[2] ?? match[1];
    }
  }

  return undefined;
}
