/**
 * Project directory structure creation.
 *
 * Creates Ansible project directory structures following official best practices.
 * Supports both single-environment and multi-environment layouts.
 */

import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ProjectWizardContext } from '../../wizard/types.js';
import { generateTemplateContent, type GeneratedProjectFile } from './templates.js';

/**
 * Result of project structure creation.
 */
export interface ProjectStructureResult {
  /** Root project directory path */
  projectDir: string;
  /** Files that were written or would be written */
  filesWritten: string[];
  /** Directories that were created or would be created */
  dirsCreated: string[];
  /** Whether this was a dry run */
  dryRun: boolean;
}

/**
 * Options for project structure creation.
 */
export interface CreateProjectOptions {
  /** Output directory (default: cwd) */
  outputDir?: string;
  /** Project name */
  name: string;
  /** Force overwrite existing directory */
  force?: boolean;
  /** Preview without writing files */
  dryRun?: boolean;
}

/**
 * Get directory structure for single-environment layout.
 */
function getSingleLayoutDirs(context: ProjectWizardContext): string[] {
  const dirs: string[] = ['group_vars', 'host_vars', 'roles'];

  // Add optional directories
  for (const optDir of context.optionalDirs) {
    dirs.push(optDir);
  }

  return dirs;
}

/**
 * Get directory structure for multi-environment layout.
 */
function getMultiLayoutDirs(context: ProjectWizardContext): string[] {
  const dirs: string[] = ['playbooks', 'roles'];

  // Add inventory directories for each environment
  for (const env of context.environments) {
    dirs.push(`inventories/${env}`);
    dirs.push(`inventories/${env}/group_vars`);
    dirs.push(`inventories/${env}/host_vars`);
  }

  // Add optional directories
  for (const optDir of context.optionalDirs) {
    dirs.push(optDir);
  }

  return dirs;
}

/**
 * Get files for single-environment layout.
 */
function getSingleLayoutFiles(
  context: ProjectWizardContext,
  projectName: string,
): GeneratedProjectFile[] {
  const files: GeneratedProjectFile[] = [];

  // Inventory files for each environment
  for (const env of context.environments) {
    files.push({
      path: env,
      type: 'inventory',
      templateData: { environment: env, groups: context.groups },
    });
  }

  // group_vars files
  files.push({
    path: 'group_vars/all.yml',
    type: 'group_vars_all',
    templateData: {},
  });

  if (context.includeSampleFiles) {
    for (const group of context.groups) {
      files.push({
        path: `group_vars/${group}.yml`,
        type: 'group_vars_group',
        templateData: { group },
      });
    }
  }

  // site.yml
  files.push({
    path: 'site.yml',
    type: 'site_yml',
    templateData: { groups: context.groups, layout: 'single' },
  });

  // ansible.cfg
  if (context.includeAnsibleCfg) {
    files.push({
      path: 'ansible.cfg',
      type: 'ansible_cfg',
      templateData: { defaultInventory: context.environments[0] || 'production' },
    });
  }

  // .gitignore
  files.push({
    path: '.gitignore',
    type: 'gitignore',
    templateData: {},
  });

  // README.md
  files.push({
    path: 'README.md',
    type: 'readme',
    templateData: { projectName, layout: 'single', environments: context.environments },
  });

  return files;
}

/**
 * Get files for multi-environment layout.
 */
function getMultiLayoutFiles(
  context: ProjectWizardContext,
  projectName: string,
): GeneratedProjectFile[] {
  const files: GeneratedProjectFile[] = [];

  // Inventory files for each environment
  for (const env of context.environments) {
    files.push({
      path: `inventories/${env}/hosts`,
      type: 'inventory',
      templateData: { environment: env, groups: context.groups },
    });

    // group_vars for each environment
    files.push({
      path: `inventories/${env}/group_vars/all.yml`,
      type: 'group_vars_all',
      templateData: { environment: env },
    });

    if (context.includeSampleFiles) {
      for (const group of context.groups) {
        files.push({
          path: `inventories/${env}/group_vars/${group}.yml`,
          type: 'group_vars_group',
          templateData: { group, environment: env },
        });
      }
    }
  }

  // site.yml
  files.push({
    path: 'site.yml',
    type: 'site_yml',
    templateData: { groups: context.groups, layout: 'multi' },
  });

  // ansible.cfg
  if (context.includeAnsibleCfg) {
    const defaultInventory = `inventories/${context.environments[0] || 'production'}`;
    files.push({
      path: 'ansible.cfg',
      type: 'ansible_cfg',
      templateData: { defaultInventory },
    });
  }

  // .gitignore
  files.push({
    path: '.gitignore',
    type: 'gitignore',
    templateData: {},
  });

  // README.md
  files.push({
    path: 'README.md',
    type: 'readme',
    templateData: { projectName, layout: 'multi', environments: context.environments },
  });

  return files;
}

/**
 * Generate project files based on wizard context.
 *
 * Returns array of file objects with path and content, ready for writing.
 *
 * @param context - Project wizard context
 * @param projectName - Name of the project
 * @returns Array of generated files with path and content
 */
export function generateProjectFiles(
  context: ProjectWizardContext,
  projectName: string,
): Array<{ path: string; content: string }> {
  const templateFiles =
    context.layout === 'single'
      ? getSingleLayoutFiles(context, projectName)
      : getMultiLayoutFiles(context, projectName);

  return templateFiles.map((file) => ({
    path: file.path,
    content: generateTemplateContent(file.type, file.templateData),
  }));
}

/**
 * Get directories that need to be created.
 *
 * @param context - Project wizard context
 * @returns Array of relative directory paths
 */
export function getProjectDirectories(context: ProjectWizardContext): string[] {
  return context.layout === 'single' ? getSingleLayoutDirs(context) : getMultiLayoutDirs(context);
}

/**
 * Create project directory structure.
 *
 * @param context - Project wizard context
 * @param options - Creation options
 * @returns Result with created files and directories
 */
export async function createProjectStructure(
  context: ProjectWizardContext,
  options: CreateProjectOptions,
): Promise<ProjectStructureResult> {
  const outputDir = options.outputDir ?? process.cwd();
  const projectDir = join(outputDir, options.name);

  const dirs = getProjectDirectories(context);
  const files = generateProjectFiles(context, options.name);

  if (options.dryRun) {
    return {
      projectDir,
      filesWritten: files.map((f) => f.path),
      dirsCreated: dirs,
      dryRun: true,
    };
  }

  // Create project root
  await mkdir(projectDir, { recursive: true });

  // Create directories
  const dirsCreated: string[] = [];
  for (const dir of dirs) {
    const fullPath = join(projectDir, dir);
    await mkdir(fullPath, { recursive: true });
    dirsCreated.push(dir);
  }

  // Write files
  const filesWritten: string[] = [];
  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    await Bun.write(fullPath, file.content);
    filesWritten.push(file.path);
  }

  return {
    projectDir,
    filesWritten,
    dirsCreated,
    dryRun: false,
  };
}

/**
 * Check if a project directory already exists.
 *
 * @param outputDir - Output directory path
 * @param projectName - Project name
 * @returns true if project exists
 */
export async function projectExists(outputDir: string, projectName: string): Promise<boolean> {
  const projectDir = join(outputDir, projectName);
  const file = Bun.file(projectDir);
  return await file.exists();
}
