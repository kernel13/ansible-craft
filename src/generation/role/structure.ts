import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Galaxy-standard role directories */
export const ROLE_DIRECTORIES = [
  'tasks',
  'handlers',
  'defaults',
  'vars',
  'templates',
  'files',
  'meta',
  'molecule/default',
] as const;

/** Required files that must exist in a valid role */
export const REQUIRED_FILES = [
  'tasks/main.yml',
  'defaults/main.yml',
  'meta/main.yml',
  'README.md',
] as const;

/** Directories that should get .gitkeep when empty */
const GITKEEP_DIRECTORIES = ['templates', 'files'] as const;

export interface RoleStructureOptions {
  roleName: string;
  outputDir: string;
  dryRun?: boolean;
}

export interface RoleStructureResult {
  roleDir: string;
  createdDirs: string[];
  createdGitkeeps: string[];
}

/**
 * Create the role directory structure.
 * Creates all directories with .gitkeep files for empty ones.
 */
export async function createRoleStructure(
  options: RoleStructureOptions,
): Promise<RoleStructureResult> {
  const { roleName, outputDir, dryRun = false } = options;
  const roleDir = join(outputDir, roleName);
  const createdDirs: string[] = [];
  const createdGitkeeps: string[] = [];

  // Create role root directory
  if (!dryRun) {
    await mkdir(roleDir, { recursive: true });
  }
  createdDirs.push(roleDir);

  // Create all role directories
  for (const dir of ROLE_DIRECTORIES) {
    const dirPath = join(roleDir, dir);
    if (!dryRun) {
      await mkdir(dirPath, { recursive: true });
    }
    createdDirs.push(dirPath);
  }

  // Add .gitkeep to directories that are typically empty
  for (const dir of GITKEEP_DIRECTORIES) {
    const gitkeepPath = join(roleDir, dir, '.gitkeep');
    if (!dryRun) {
      await writeFile(gitkeepPath, '');
    }
    createdGitkeeps.push(gitkeepPath);
  }

  return {
    roleDir,
    createdDirs,
    createdGitkeeps,
  };
}

/**
 * Check if a role directory already exists.
 */
export function roleExists(outputDir: string, roleName: string): boolean {
  const roleDir = join(outputDir, roleName);
  return existsSync(roleDir);
}
