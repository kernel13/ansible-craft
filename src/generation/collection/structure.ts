/**
 * Ansible collection directory structure creation.
 *
 * Creates the standard Galaxy collection layout with optional plugin directories.
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Standard collection directories (always created) */
export const COLLECTION_DIRECTORIES = [
  'plugins/modules',
  'plugins/module_utils',
  'roles',
  'playbooks',
  'docs',
  'tests/integration/targets',
  'meta',
] as const;

/** Optional plugin directories (created based on user choice) */
export const OPTIONAL_PLUGIN_DIRS = [
  'plugins/filter',
  'plugins/inventory',
  'plugins/lookup',
  'plugins/test',
  'plugins/callback',
  'plugins/connection',
  'plugins/cache',
] as const;

/** Files that must exist in a valid collection */
export const REQUIRED_FILES = ['galaxy.yml', 'README.md'] as const;

/** Directories that should get .gitkeep when empty */
const GITKEEP_DIRECTORIES = [
  'roles',
  'playbooks',
  'plugins/module_utils',
  'tests/integration/targets',
] as const;

export interface CollectionStructureOptions {
  /** Collection namespace (e.g., 'mycompany') */
  namespace: string;
  /** Collection name (e.g., 'web_utils') */
  name: string;
  /** Output directory (collection will be created at outputDir/namespace/name) */
  outputDir: string;
  /** Optional plugin directories to include */
  pluginDirs?: string[];
  /** Dry run mode (don't create files) */
  dryRun?: boolean;
}

export interface CollectionStructureResult {
  /** Full path to collection directory */
  collectionDir: string;
  /** List of created directories */
  createdDirs: string[];
  /** List of created .gitkeep files */
  createdGitkeeps: string[];
}

/**
 * Create the collection directory structure.
 * Creates namespace/name directory with standard Galaxy layout.
 *
 * @example
 * ```typescript
 * const result = await createCollectionStructure({
 *   namespace: 'mycompany',
 *   name: 'web_utils',
 *   outputDir: './collections',
 *   pluginDirs: ['plugins/filter', 'plugins/lookup']
 * });
 * // Creates: collections/mycompany/web_utils/
 * ```
 */
export async function createCollectionStructure(
  options: CollectionStructureOptions,
): Promise<CollectionStructureResult> {
  const { namespace, name, outputDir, pluginDirs = [], dryRun = false } = options;

  // Collection root: outputDir/namespace/name
  const collectionDir = join(outputDir, namespace, name);
  const createdDirs: string[] = [];
  const createdGitkeeps: string[] = [];

  // Create collection root directory
  if (!dryRun) {
    await mkdir(collectionDir, { recursive: true });
  }
  createdDirs.push(collectionDir);

  // Create standard directories
  for (const dir of COLLECTION_DIRECTORIES) {
    const dirPath = join(collectionDir, dir);
    if (!dryRun) {
      await mkdir(dirPath, { recursive: true });
    }
    createdDirs.push(dirPath);
  }

  // Create optional plugin directories
  for (const dir of pluginDirs) {
    const dirPath = join(collectionDir, dir);
    if (!dryRun) {
      await mkdir(dirPath, { recursive: true });
    }
    createdDirs.push(dirPath);
  }

  // Add .gitkeep to empty directories
  for (const dir of GITKEEP_DIRECTORIES) {
    const gitkeepPath = join(collectionDir, dir, '.gitkeep');
    if (!dryRun) {
      await writeFile(gitkeepPath, '');
    }
    createdGitkeeps.push(gitkeepPath);
  }

  return {
    collectionDir,
    createdDirs,
    createdGitkeeps,
  };
}

/**
 * Check if a collection directory already exists.
 */
export function collectionExists(outputDir: string, namespace: string, name: string): boolean {
  const collectionDir = join(outputDir, namespace, name);
  return existsSync(collectionDir);
}

/**
 * Get the full path to a collection directory.
 */
export function getCollectionDir(outputDir: string, namespace: string, name: string): string {
  return join(outputDir, namespace, name);
}
