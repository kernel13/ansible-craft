/**
 * Ansible Linter Agent.
 *
 * Integrates with external ansible-lint tool for comprehensive linting.
 * Can run concurrently with internal validators for improved performance.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { GeneratedFile } from '../generation/role/parser.js';
import {
  type AnsibleLintResult,
  type LintViolation,
  formatInstallInstructions,
  isAnsibleLintAvailable,
  runAnsibleLint,
} from '../generation/validation/ansible-lint.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type LinterInput,
  type LinterOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Create a temporary directory for linting.
 */
async function createTempDir(prefix: string): Promise<string> {
  const tempBase = tmpdir();
  const tempDir = path.join(
    tempBase,
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(tempDir, { recursive: true });
  return tempDir;
}

/**
 * Write files to a temporary directory for linting.
 */
async function writeFilesToTemp(files: GeneratedFile[], tempDir: string): Promise<void> {
  for (const file of files) {
    const filePath = path.join(tempDir, file.path);
    const fileDir = path.dirname(filePath);
    await mkdir(fileDir, { recursive: true });
    await writeFile(filePath, file.content, 'utf-8');
  }
}

/**
 * Clean up temporary directory.
 */
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await rm(tempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Normalize a path for comparison by resolving macOS symlinks.
 * On macOS, /var is a symlink to /private/var, which can cause path mismatches.
 */
function normalizePath(filePath: string): string {
  let normalized = filePath;

  // Remove file:// prefix if present
  if (normalized.startsWith('file://')) {
    normalized = normalized.slice(7);
  }

  // On macOS, /private/var and /var are the same (symlink)
  // Normalize to /var for consistent comparison
  if (normalized.startsWith('/private/var/')) {
    normalized = normalized.slice(8); // Remove '/private' prefix
  }

  return normalized;
}

/**
 * Map file paths back to their original names after linting.
 * ansible-lint returns absolute paths; we need relative paths.
 */
function normalizeViolationPaths(violations: LintViolation[], tempDir: string): LintViolation[] {
  const normalizedTempDir = normalizePath(tempDir);

  return violations.map((v) => {
    let normalizedFile = normalizePath(v.file);

    // Remove temp directory prefix
    if (normalizedFile.startsWith(normalizedTempDir)) {
      normalizedFile = normalizedFile.slice(normalizedTempDir.length + 1);
    }

    // Remove leading slash if present (for relative paths)
    if (normalizedFile.startsWith('/')) {
      normalizedFile = normalizedFile.slice(1);
    }

    return {
      ...v,
      file: normalizedFile,
    };
  });
}

/**
 * Ansible Linter Agent implementation.
 *
 * Runs ansible-lint on generated files and returns violations.
 * Creates a temporary directory to write files for linting.
 */
export class LinterAgent implements Agent<LinterInput, LinterOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.linter.name;
  readonly description = DEFAULT_AGENT_CONFIGS.linter.description;

  /**
   * Execute linting on provided files.
   */
  async execute(input: LinterInput, context: AgentContext): Promise<AgentResult<LinterOutput>> {
    const startTime = Date.now();
    const { files, tempDir: providedTempDir } = input;

    // Publish start message
    await globalMessageBus.publish(MessageTypes.LINT_START, { fileCount: files.length }, this.name);

    try {
      // Check if ansible-lint is available
      const available = await isAnsibleLintAvailable();
      if (!available) {
        const duration = Date.now() - startTime;

        // Publish completion with unavailable status
        await globalMessageBus.publish(
          MessageTypes.LINT_COMPLETE,
          { available: false, violationCount: 0, duration },
          this.name,
        );

        // Return success with unavailable flag - this is not an error
        const output: LinterOutput = {
          violations: [],
          available: false,
          exitCode: 1,
        };

        return successResult(output, duration, [formatInstallInstructions()]);
      }

      // Create temp directory if not provided
      const tempDir = providedTempDir ?? (await createTempDir('ansible-craft-lint'));
      const shouldCleanup = !providedTempDir;

      try {
        // Write files to temp directory
        await writeFilesToTemp(files, tempDir);

        // Run ansible-lint
        const lintResult = await runAnsibleLint(tempDir);

        // Normalize violation paths
        const violations = normalizeViolationPaths(lintResult.violations, tempDir);

        const duration = Date.now() - startTime;

        // Publish completion message
        await globalMessageBus.publish(
          MessageTypes.LINT_COMPLETE,
          {
            available: true,
            violationCount: violations.length,
            exitCode: lintResult.exitCode,
            duration,
          },
          this.name,
        );

        const output: LinterOutput = {
          violations,
          available: true,
          exitCode: lintResult.exitCode,
        };

        // Return result - violations are informational, not errors
        return successResult(output, duration);
      } finally {
        // Clean up temp directory if we created it
        if (shouldCleanup) {
          await cleanupTempDir(tempDir);
        }
      }
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(MessageTypes.LINT_ERROR, { error: String(error) }, this.name);

      return failureResult(
        [
          createAgentError(this.name, 'LINT_ERROR', String(error), {
            cause: error instanceof Error ? error : undefined,
            recoverable: true,
          }),
        ],
        duration,
      );
    }
  }
}

/**
 * Create a linter agent.
 */
export function createLinterAgent(): LinterAgent {
  return new LinterAgent();
}

/**
 * Lint files using the linter agent (convenience function).
 */
export async function lintFiles(
  files: GeneratedFile[],
  context: AgentContext,
  options?: { tempDir?: string },
): Promise<AgentResult<LinterOutput>> {
  const agent = createLinterAgent();
  return agent.execute({ files, tempDir: options?.tempDir }, context);
}

/**
 * Check if ansible-lint is available (convenience function).
 */
export { isAnsibleLintAvailable } from '../generation/validation/ansible-lint.js';
