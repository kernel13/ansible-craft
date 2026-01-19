import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Playbook project directories */
export const PLAYBOOK_DIRECTORIES = ['group_vars'] as const;

/** Required files that must exist in a valid playbook project */
export const REQUIRED_PLAYBOOK_FILES = [
  'playbook.yml',
  'inventory.example',
  'group_vars/all.yml',
  'README.md',
] as const;

export interface PlaybookStructureOptions {
  playbookName: string;
  outputDir: string;
  dryRun?: boolean;
}

export interface PlaybookStructureResult {
  playbookDir: string;
  createdDirs: string[];
}

/**
 * Create the playbook project directory structure.
 * Creates the playbook root and group_vars directory.
 */
export async function createPlaybookStructure(
  options: PlaybookStructureOptions
): Promise<PlaybookStructureResult> {
  const { playbookName, outputDir, dryRun = false } = options;
  const playbookDir = join(outputDir, playbookName);
  const createdDirs: string[] = [];

  // Create playbook root directory
  if (!dryRun) {
    await mkdir(playbookDir, { recursive: true });
  }
  createdDirs.push(playbookDir);

  // Create all playbook directories
  for (const dir of PLAYBOOK_DIRECTORIES) {
    const dirPath = join(playbookDir, dir);
    if (!dryRun) {
      await mkdir(dirPath, { recursive: true });
    }
    createdDirs.push(dirPath);
  }

  return {
    playbookDir,
    createdDirs,
  };
}

/**
 * Check if a playbook directory already exists.
 */
export function playbookExists(outputDir: string, playbookName: string): boolean {
  const playbookDir = join(outputDir, playbookName);
  return existsSync(playbookDir);
}
