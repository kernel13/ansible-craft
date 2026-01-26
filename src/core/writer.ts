/**
 * Ansible Writer Agent.
 *
 * Writes generated files to disk with:
 * - Parallel file I/O for performance
 * - Directory structure creation
 * - Conflict detection and resolution
 * - Dry-run support
 */

import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confirm } from '@inquirer/prompts';
import { createPlaybookStructure } from '../generation/playbook/structure.js';
import type { GeneratedFile } from '../generation/role/parser.js';
import { createRoleStructure } from '../generation/role/structure.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import { batch, executeParallel } from './orchestrator.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type WriterInput,
  type WriterOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Check if a directory exists.
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write a single file to disk.
 */
async function writeSingleFile(
  filePath: string,
  content: string,
  dryRun: boolean,
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!dryRun) {
      const fileDir = path.dirname(filePath);
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, content, 'utf-8');
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Ansible Writer Agent implementation.
 *
 * Handles writing generated files to disk with parallel I/O
 * and proper directory structure creation.
 */
export class WriterAgent implements Agent<WriterInput, WriterOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.writer.name;
  readonly description = DEFAULT_AGENT_CONFIGS.writer.description;

  private maxConcurrency: number;

  constructor(options?: { maxConcurrency?: number }) {
    this.maxConcurrency = options?.maxConcurrency ?? DEFAULT_AGENT_CONFIGS.writer.maxConcurrency;
  }

  /**
   * Execute the write operation.
   */
  async execute(input: WriterInput, context: AgentContext): Promise<AgentResult<WriterOutput>> {
    const startTime = Date.now();
    const { files, outputDir, name, type, force, dryRun } = input;

    // Publish start message
    await globalMessageBus.publish(
      MessageTypes.WRITE_START,
      { fileCount: files.length, type, name, dryRun },
      this.name,
    );

    try {
      const targetDir = path.join(outputDir, name);

      // Check for existing directory
      const conflicts = await this.checkConflicts(targetDir, force, dryRun, context);
      if (conflicts.cancelled) {
        return failureResult(
          [createAgentError(this.name, 'OPERATION_CANCELLED', 'Operation cancelled by user')],
          Date.now() - startTime,
        );
      }

      // Create directory structure
      await this.createStructure(targetDir, type, name, outputDir, dryRun);

      // Write files in parallel
      const writeResult = await this.writeFilesParallel(files, targetDir, dryRun, context);

      const duration = Date.now() - startTime;

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.WRITE_COMPLETE,
        {
          written: writeResult.written.length,
          skipped: writeResult.skipped.length,
          duration,
        },
        this.name,
      );

      const output: WriterOutput = {
        written: writeResult.written,
        skipped: writeResult.skipped,
        conflicts: conflicts.existed ? [targetDir] : [],
        targetDir,
      };

      if (writeResult.errors.length > 0) {
        return {
          success: false,
          data: output,
          errors: writeResult.errors.map((err) =>
            createAgentError(this.name, 'WRITE_ERROR', err, { recoverable: false }),
          ),
          duration,
        };
      }

      return successResult(output, duration);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(MessageTypes.WRITE_ERROR, { error: String(error) }, this.name);

      return failureResult(
        [
          createAgentError(this.name, 'WRITE_ERROR', String(error), {
            cause: error instanceof Error ? error : undefined,
            recoverable: false,
          }),
        ],
        duration,
      );
    }
  }

  /**
   * Check for directory conflicts.
   */
  private async checkConflicts(
    targetDir: string,
    force: boolean,
    dryRun: boolean,
    context: AgentContext,
  ): Promise<{ existed: boolean; cancelled: boolean }> {
    const exists = await directoryExists(targetDir);

    if (!exists) {
      return { existed: false, cancelled: false };
    }

    // Directory exists
    if (!force && !context.quiet) {
      try {
        const overwrite = await confirm({
          message: `Directory ${targetDir} already exists. Overwrite?`,
          default: false,
        });
        if (!overwrite) {
          return { existed: true, cancelled: true };
        }
      } catch {
        // If confirm fails (e.g., non-interactive), treat as cancelled
        return { existed: true, cancelled: true };
      }
    }

    // Remove existing directory
    if (!dryRun) {
      await rm(targetDir, { recursive: true });
    }

    return { existed: true, cancelled: false };
  }

  /**
   * Create the directory structure for role or playbook.
   */
  private async createStructure(
    targetDir: string,
    type: 'role' | 'playbook',
    name: string,
    outputDir: string,
    dryRun: boolean,
  ): Promise<void> {
    if (type === 'role') {
      await createRoleStructure({
        roleName: name,
        outputDir,
        dryRun,
      });
    } else {
      await createPlaybookStructure({
        playbookName: name,
        outputDir,
        dryRun,
      });
    }
  }

  /**
   * Write files in parallel with concurrency limits.
   */
  private async writeFilesParallel(
    files: GeneratedFile[],
    targetDir: string,
    dryRun: boolean,
    context: AgentContext,
  ): Promise<{ written: string[]; skipped: string[]; errors: string[] }> {
    const written: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    // For very few files, write sequentially
    if (files.length <= 3) {
      for (const file of files) {
        const filePath = path.join(targetDir, file.path);
        const result = await writeSingleFile(filePath, file.content, dryRun);
        if (result.success) {
          written.push(file.path);
        } else {
          errors.push(`${file.path}: ${result.error}`);
        }
      }
      return { written, skipped, errors };
    }

    // Process in parallel batches
    const operations = files.map((file) => async () => {
      const filePath = path.join(targetDir, file.path);
      const result = await writeSingleFile(filePath, file.content, dryRun);
      return successResult({ path: file.path, success: result.success, error: result.error }, 0);
    });

    const parallelResult = await executeParallel(operations, {
      maxConcurrency: this.maxConcurrency,
      onProgress: (completed, total) => {
        if (!context.quiet) {
          globalMessageBus.publish(
            MessageTypes.PROGRESS,
            { completed, total, phase: 'writing' },
            this.name,
          );
        }
      },
    });

    // Extract results
    for (const result of parallelResult.results) {
      if (result.success && result.data) {
        if (result.data.success) {
          written.push(result.data.path);
        } else {
          errors.push(`${result.data.path}: ${result.data.error}`);
        }
      }
    }

    return { written, skipped, errors };
  }
}

/**
 * Create a writer agent with optional configuration.
 */
export function createWriterAgent(options?: { maxConcurrency?: number }): WriterAgent {
  return new WriterAgent(options);
}

/**
 * Write files using the writer agent (convenience function).
 */
export async function writeFiles(
  files: GeneratedFile[],
  outputDir: string,
  name: string,
  type: 'role' | 'playbook',
  context: AgentContext,
  options?: { force?: boolean; dryRun?: boolean; maxConcurrency?: number },
): Promise<AgentResult<WriterOutput>> {
  const agent = createWriterAgent({ maxConcurrency: options?.maxConcurrency });
  return agent.execute(
    {
      files,
      outputDir,
      name,
      type,
      force: options?.force ?? false,
      dryRun: options?.dryRun ?? false,
    },
    context,
  );
}
