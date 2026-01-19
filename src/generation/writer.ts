/**
 * File writer for generated Ansible roles and playbooks.
 *
 * Handles directory creation, conflict resolution, and dry-run mode.
 */
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { type PlaybookStructureOptions, createPlaybookStructure } from './playbook/index.js';
import type { GeneratedFile } from './role/parser.js';
import { createRoleStructure } from './role/structure.js';

export interface WriteOptions {
  /** Role name (used for directory) */
  roleName: string;
  /** Output directory (default: cwd) */
  outputDir?: string;
  /** Preview without writing */
  dryRun?: boolean;
  /** Overwrite without prompting */
  force?: boolean;
  /** Suppress output */
  quiet?: boolean;
}

export interface WriteResult {
  /** Full path to role directory */
  roleDir: string;
  /** Files written */
  filesWritten: string[];
  /** Directories created */
  dirsCreated: string[];
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Write generated role files to disk.
 *
 * @param files - Generated files to write
 * @param options - Write options
 * @returns Write result with paths
 */
export async function writeGeneratedRole(
  files: GeneratedFile[],
  options: WriteOptions,
): Promise<WriteResult> {
  const outputDir = options.outputDir || process.cwd();
  const roleDir = path.join(outputDir, options.roleName);
  const dirsCreated: string[] = [];

  // Check for existing directory
  try {
    await access(roleDir);
    // Directory exists
    if (!options.force) {
      const overwrite = await confirm({
        message: `Directory ${roleDir} already exists. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        throw new Error('Operation cancelled by user');
      }
    }
    // Remove existing directory
    if (!options.dryRun) {
      await rm(roleDir, { recursive: true });
    }
  } catch (error) {
    // Directory doesn't exist - good
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Re-throw if it's not a "not found" error and not our cancellation
      if (error instanceof Error && error.message !== 'Operation cancelled by user') {
        throw error;
      }
      throw error;
    }
  }

  // Create directory structure
  const structureResult = await createRoleStructure({
    roleName: options.roleName,
    outputDir,
    dryRun: options.dryRun,
  });
  dirsCreated.push(...structureResult.createdDirs);

  // Write files
  const filesWritten: string[] = [];
  for (const file of files) {
    const filePath = path.join(roleDir, file.path);
    const fileDir = path.dirname(filePath);

    if (!options.dryRun) {
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }

    filesWritten.push(file.path);

    if (!options.quiet) {
      const prefix = options.dryRun ? chalk.dim('[dry-run] ') : '';
      console.log(`${prefix}${chalk.green('+')} ${file.path}`);
    }
  }

  return {
    roleDir,
    filesWritten,
    dirsCreated,
    dryRun: options.dryRun ?? false,
  };
}

/**
 * Display a tree view of the generated role structure.
 */
export function displayRoleTree(result: WriteResult): void {
  console.log(chalk.cyan(`\n${result.roleDir}/`));
  for (const file of result.filesWritten.sort()) {
    const depth = file.split('/').length;
    const indent = '  '.repeat(depth);
    const name = path.basename(file);
    console.log(chalk.dim(`${indent}${name}`));
  }
}

// ============================================================
// Playbook writer functions
// ============================================================

export interface WritePlaybookOptions {
  /** Playbook name (used for directory) */
  playbookName: string;
  /** Output directory (default: cwd) */
  outputDir?: string;
  /** Preview without writing */
  dryRun?: boolean;
  /** Overwrite without prompting */
  force?: boolean;
  /** Suppress output */
  quiet?: boolean;
}

export interface WritePlaybookResult {
  /** Full path to playbook directory */
  playbookDir: string;
  /** Files written */
  filesWritten: string[];
  /** Directories created */
  dirsCreated: string[];
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Write generated playbook files to disk.
 *
 * @param files - Generated files to write
 * @param options - Write options
 * @returns Write result with paths
 */
export async function writeGeneratedPlaybook(
  files: GeneratedFile[],
  options: WritePlaybookOptions,
): Promise<WritePlaybookResult> {
  const outputDir = options.outputDir || process.cwd();
  const playbookDir = path.join(outputDir, options.playbookName);
  const dirsCreated: string[] = [];

  // Check for existing directory
  try {
    await access(playbookDir);
    // Directory exists
    if (!options.force) {
      const overwrite = await confirm({
        message: `Directory ${playbookDir} already exists. Overwrite?`,
        default: false,
      });
      if (!overwrite) {
        throw new Error('Operation cancelled by user');
      }
    }
    // Remove existing directory
    if (!options.dryRun) {
      await rm(playbookDir, { recursive: true });
    }
  } catch (error) {
    // Directory doesn't exist - good
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Re-throw if it's not a "not found" error and not our cancellation
      if (error instanceof Error && error.message !== 'Operation cancelled by user') {
        throw error;
      }
      throw error;
    }
  }

  // Create directory structure
  const structureResult = await createPlaybookStructure({
    playbookName: options.playbookName,
    outputDir,
    dryRun: options.dryRun,
  });
  dirsCreated.push(...structureResult.createdDirs);

  // Write files
  const filesWritten: string[] = [];
  for (const file of files) {
    const filePath = path.join(playbookDir, file.path);
    const fileDir = path.dirname(filePath);

    if (!options.dryRun) {
      // Ensure parent directory exists (for group_vars/webservers.yml etc)
      await mkdir(fileDir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }

    filesWritten.push(file.path);

    if (!options.quiet) {
      const prefix = options.dryRun ? chalk.dim('[dry-run] ') : '';
      console.log(`${prefix}${chalk.green('+')} ${file.path}`);
    }
  }

  return {
    playbookDir,
    filesWritten,
    dirsCreated,
    dryRun: options.dryRun ?? false,
  };
}

/**
 * Display a tree view of the generated playbook structure.
 */
export function displayPlaybookTree(result: WritePlaybookResult): void {
  console.log(chalk.cyan(`\n${result.playbookDir}/`));
  for (const file of result.filesWritten.sort()) {
    const depth = file.split('/').length;
    const indent = '  '.repeat(depth);
    const name = path.basename(file);
    console.log(chalk.dim(`${indent}${name}`));
  }
}
