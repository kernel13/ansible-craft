/**
 * Project structure generation module.
 *
 * Provides utilities for creating Ansible project directory structures
 * following official best practices.
 *
 * @example
 * ```typescript
 * import { createProjectStructure, generateProjectFiles } from './project/index.js';
 *
 * // Generate project files
 * const files = generateProjectFiles(context, 'my-project');
 *
 * // Create project structure
 * const result = await createProjectStructure(context, { name: 'my-project' });
 * ```
 */

export {
  createProjectStructure,
  generateProjectFiles,
  getProjectDirectories,
  projectExists,
  type CreateProjectOptions,
  type ProjectStructureResult,
} from './structure.js';

export {
  generateTemplateContent,
  type GeneratedProjectFile,
  type ProjectTemplateData,
  type ProjectTemplateType,
} from './templates.js';
