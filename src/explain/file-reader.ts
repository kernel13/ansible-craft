import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export interface RoleFile {
  path: string; // Relative path within role (e.g., "tasks/main.yml")
  content: string;
  type: 'tasks' | 'handlers' | 'defaults' | 'vars' | 'meta' | 'templates' | 'files' | 'playbook';
}

/**
 * Read an Ansible path (file or directory).
 * If file: returns single RoleFile
 * If directory: calls readRoleDirectory()
 */
export async function readAnsiblePath(path: string): Promise<RoleFile[]> {
  try {
    const stats = await stat(path);

    if (stats.isFile()) {
      const content = await readFile(path, 'utf-8');
      const type = inferFileType(path);
      return [
        {
          path,
          content,
          type,
        },
      ];
    }

    if (stats.isDirectory()) {
      return await readRoleDirectory(path);
    }

    return [];
  } catch (error) {
    // File/directory doesn't exist
    return [];
  }
}

/**
 * Read all files in a role directory structure.
 * Reads from standard subdirs: tasks, handlers, defaults, vars, meta, templates, files
 */
export async function readRoleDirectory(roleDir: string): Promise<RoleFile[]> {
  const files: RoleFile[] = [];
  const roleSubdirs = ['tasks', 'handlers', 'defaults', 'vars', 'meta', 'templates', 'files'];

  for (const subdir of roleSubdirs) {
    const subdirPath = join(roleDir, subdir);

    try {
      const subdirStat = await stat(subdirPath);
      if (!subdirStat.isDirectory()) continue;

      const entries = await readdir(subdirPath);

      for (const entry of entries) {
        // Only read .yml, .yaml, .j2 files
        if (!entry.match(/\.(yml|yaml|j2)$/)) continue;

        const filePath = join(subdirPath, entry);
        const content = await readFile(filePath, 'utf-8');

        files.push({
          path: `${subdir}/${entry}`,
          content,
          type: subdir as RoleFile['type'],
        });
      }
    } catch (error) {
      // Subdirectory doesn't exist - skip
      continue;
    }
  }

  // Also check for README.md in root
  try {
    const readmePath = join(roleDir, 'README.md');
    const readmeContent = await readFile(readmePath, 'utf-8');
    files.push({
      path: 'README.md',
      content: readmeContent,
      type: 'meta',
    });
  } catch (error) {
    // README doesn't exist - skip
  }

  return files;
}

/**
 * Infer file type from path.
 * Checks for known subdirs (tasks/, handlers/, etc.)
 * Defaults to 'playbook' for standalone .yml files
 */
function inferFileType(filePath: string): RoleFile['type'] {
  if (filePath.includes('tasks/')) return 'tasks';
  if (filePath.includes('handlers/')) return 'handlers';
  if (filePath.includes('defaults/')) return 'defaults';
  if (filePath.includes('vars/')) return 'vars';
  if (filePath.includes('meta/')) return 'meta';
  if (filePath.includes('templates/')) return 'templates';
  if (filePath.includes('files/')) return 'files';
  return 'playbook';
}
