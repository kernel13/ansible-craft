/**
 * Existing role reader.
 *
 * Reads and parses existing role directory structures to provide
 * context for AI-driven improvements and enhancements.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Existing role content structure.
 */
export interface ExistingRoleContent {
  /** Whether the role directory exists */
  exists: boolean;
  /** Map of relative file paths to their content */
  files: Map<string, string>;
  /** Structural information about the role */
  structure: {
    /** Directories that exist in the role */
    directories: string[];
    /** Whether the role has test files */
    hasTests: boolean;
    /** Whether the role has Molecule tests */
    hasMolecule: boolean;
  };
}

/**
 * File extensions to read from existing roles.
 */
const READABLE_EXTENSIONS = ['.yml', '.yaml', '.j2', '.md', '.txt', '.cfg', '.ini'];

/**
 * Maximum file size to read (1MB).
 * Prevents reading very large files that might exceed token limits.
 */
const MAX_FILE_SIZE = 1024 * 1024;

/**
 * Read an existing role directory and return its content.
 *
 * @param outputDir - Base directory containing the role
 * @param roleName - Name of the role to read
 * @returns Existing role content with files and structure info
 *
 * @example
 * ```typescript
 * const existing = await readExistingRole('/path/to/roles', 'nginx');
 * if (existing.exists) {
 *   console.log(`Found ${existing.files.size} files`);
 *   console.log(`Has Molecule tests: ${existing.structure.hasMolecule}`);
 * }
 * ```
 */
export async function readExistingRole(
  outputDir: string,
  roleName: string,
): Promise<ExistingRoleContent> {
  const roleDir = join(outputDir, roleName);

  // Check if role directory exists
  if (!existsSync(roleDir)) {
    return {
      exists: false,
      files: new Map(),
      structure: {
        directories: [],
        hasTests: false,
        hasMolecule: false,
      },
    };
  }

  const files = new Map<string, string>();
  const directories: string[] = [];
  let hasTests = false;
  let hasMolecule = false;

  try {
    // Recursively read all files
    await readDirectoryRecursive(roleDir, roleDir, files, directories);

    // Analyze structure
    hasMolecule = directories.some((dir) => dir.includes('molecule'));
    hasTests = hasMolecule || directories.some((dir) => dir.includes('test'));

    return {
      exists: true,
      files,
      structure: {
        directories,
        hasTests,
        hasMolecule,
      },
    };
  } catch (error) {
    // If we encounter a permission error or any other issue,
    // return what we have so far rather than failing completely
    return {
      exists: true,
      files,
      structure: {
        directories,
        hasTests,
        hasMolecule,
      },
    };
  }
}

/**
 * Recursively read directory contents.
 *
 * @param basePath - Base role directory
 * @param currentPath - Current directory being read
 * @param files - Map to store file contents
 * @param directories - Array to store directory names
 */
async function readDirectoryRecursive(
  basePath: string,
  currentPath: string,
  files: Map<string, string>,
  directories: string[],
): Promise<void> {
  try {
    const entries = await readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(basePath, fullPath);

      // Skip hidden files and common exclude patterns
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === '__pycache__' ||
        entry.name === 'venv'
      ) {
        continue;
      }

      if (entry.isDirectory()) {
        directories.push(relativePath);
        // Recursively read subdirectories
        await readDirectoryRecursive(basePath, fullPath, files, directories);
      } else if (entry.isFile()) {
        // Check if file has readable extension
        const hasReadableExtension = READABLE_EXTENSIONS.some((ext) => entry.name.endsWith(ext));

        if (hasReadableExtension) {
          try {
            // Check file size before reading
            const stats = await stat(fullPath);
            if (stats.size > MAX_FILE_SIZE) {
              // Store a placeholder for large files
              files.set(relativePath, `[File too large to read: ${stats.size} bytes]`);
              continue;
            }

            // Read file content
            const content = await readFile(fullPath, 'utf-8');
            files.set(relativePath, content);
          } catch (readError) {
            // If we can't read a specific file, store an error message
            files.set(relativePath, `[Error reading file: ${readError instanceof Error ? readError.message : 'Unknown error'}]`);
          }
        }
      }
    }
  } catch (error) {
    // If we can't read a directory, log but don't fail
    // This allows partial reads to succeed
    return;
  }
}

/**
 * Format existing role content for inclusion in AI prompts.
 *
 * Organizes files by directory and formats them in a readable way.
 *
 * @param content - Existing role content
 * @returns Formatted string for AI prompt
 */
export function formatExistingRoleForPrompt(content: ExistingRoleContent): string {
  if (!content.exists || content.files.size === 0) {
    return '';
  }

  const sections: string[] = [];

  sections.push('## Existing Role Implementation\n');
  sections.push('The following role already exists at this location:\n');

  // Group files by directory
  const filesByDir = new Map<string, Map<string, string>>();

  for (const [path, fileContent] of content.files) {
    const parts = path.split('/');
    const dirName = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    const fileName = parts[parts.length - 1];

    if (!filesByDir.has(dirName)) {
      filesByDir.set(dirName, new Map());
    }
    filesByDir.get(dirName)!.set(fileName, fileContent);
  }

  // Sort directories for consistent output
  const sortedDirs = Array.from(filesByDir.keys()).sort();

  // Format each directory
  for (const dir of sortedDirs) {
    const dirFiles = filesByDir.get(dir)!;
    sections.push(`\n### Directory: ${dir}\n`);

    // Sort files within directory
    const sortedFiles = Array.from(dirFiles.keys()).sort();

    for (const fileName of sortedFiles) {
      const fileContent = dirFiles.get(fileName)!;
      sections.push(`**File: ${fileName}**\n`);
      sections.push('```yaml');
      sections.push(fileContent);
      sections.push('```\n');
    }
  }

  sections.push('\n**Your task is to generate an IMPROVED version that:**');
  sections.push('- Preserves working functionality');
  sections.push('- Applies best practices to existing code');
  sections.push('- Adds requested new features');
  sections.push('- Fixes identified issues');
  sections.push('- Maintains backward compatibility where possible\n');

  return sections.join('\n');
}
