import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURES_DIR = join(import.meta.dir, 'fixtures');

/**
 * Load a fixture file as string.
 * @param relativePath - Path relative to fixtures directory (e.g., "yaml/valid-task.yaml")
 */
export function loadFixture(relativePath: string): string {
  const fullPath = join(FIXTURES_DIR, relativePath);
  return readFileSync(fullPath, 'utf-8');
}

/**
 * Get the full path to a fixture file.
 */
export function getFixturePath(relativePath: string): string {
  return join(FIXTURES_DIR, relativePath);
}
