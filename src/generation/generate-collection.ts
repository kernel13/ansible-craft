/**
 * Collection generation orchestration.
 *
 * Provides simplified collection generation using templates.
 * This is a template-based approach rather than full AI generation.
 */

import type { GeneratedFile } from './role/parser.js';
import type { CollectionWizardContext } from '../wizard/types.js';
import {
  generateGalaxyYml,
  generateReadme,
  generateChangelog,
  generateRuntimeYml,
  generateModuleTemplate,
  generateFilterPluginTemplate,
  generateIntegrationTest,
  generateModuleUtilsTemplate,
} from './collection/templates.js';

/**
 * Generate collection files from wizard context.
 *
 * Creates all necessary collection files based on user selections:
 * - galaxy.yml (required)
 * - README.md (required)
 * - CHANGELOG.md (optional)
 * - meta/runtime.yml (optional)
 * - Plugin templates (based on selections)
 * - Integration tests (based on testing level)
 *
 * @param context - Validated collection wizard context
 * @returns Array of generated files ready to write
 */
export async function generateCollectionFiles(
  context: CollectionWizardContext,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  // 1. galaxy.yml (required)
  files.push({
    path: 'galaxy.yml',
    content: generateGalaxyYml(context),
  });

  // 2. README.md (required)
  files.push({
    path: 'README.md',
    content: generateReadme(context),
  });

  // 3. CHANGELOG.md (optional)
  if (context.includeChangelog) {
    files.push({
      path: 'CHANGELOG.md',
      content: generateChangelog(context.version),
    });
  }

  // 4. meta/runtime.yml (optional)
  if (context.includeRuntime) {
    files.push({
      path: 'meta/runtime.yml',
      content: generateRuntimeYml(context.requiresAnsible),
    });
  }

  // 5. Module templates
  if (context.includeModules) {
    // Generate example module
    files.push({
      path: 'plugins/modules/example_module.py',
      content: generateModuleTemplate(context.namespace, context.name, 'example_module'),
    });

    // Generate module_utils helper
    files.push({
      path: 'plugins/module_utils/common.py',
      content: generateModuleUtilsTemplate(context.namespace, context.name, 'Common'),
    });
  }

  // 6. Filter plugin templates
  if (context.includeFilterPlugins) {
    files.push({
      path: 'plugins/filter/example_filter.py',
      content: generateFilterPluginTemplate(context.namespace, context.name, 'example_filter'),
    });
  }

  // 7. Integration tests
  if (context.testingLevel === 'basic' || context.testingLevel === 'molecule') {
    if (context.includeModules) {
      files.push({
        path: 'tests/integration/targets/example_module/tasks/main.yml',
        content: generateIntegrationTest(context.namespace, context.name, 'example_module'),
      });
    }
  }

  // 8. Documentation templates
  if (context.includeDocs) {
    files.push({
      path: 'docs/index.md',
      content: `# ${context.namespace}.${context.name} Collection Documentation\n\n${context.description}\n\n## Table of Contents\n\n- [Installation](#installation)\n- [Modules](#modules)\n- [Roles](#roles)\n- [Examples](#examples)\n`,
    });
  }

  // 9. Role scaffolding (empty .gitkeep files)
  if (context.includeRoles && context.roleNames.length > 0) {
    for (const roleName of context.roleNames) {
      files.push({
        path: `roles/${roleName}/.gitkeep`,
        content: '',
      });
    }
  }

  return files;
}

/**
 * Simple plan generation for collections (returns basic metadata).
 * This is a simplified version that doesn't use AI.
 */
export async function generateCollectionPlan(context: CollectionWizardContext): Promise<{
  namespace: string;
  name: string;
  version: string;
  description: string;
  fileCount: number;
  directories: string[];
}> {
  const files = await generateCollectionFiles(context);

  // Derive unique directories from file paths
  const directories = Array.from(
    new Set(
      files
        .map((f) => {
          const parts = f.path.split('/');
          parts.pop(); // Remove filename
          return parts.join('/');
        })
        .filter((d) => d.length > 0),
    ),
  ).sort();

  return {
    namespace: context.namespace,
    name: context.name,
    version: context.version,
    description: context.description,
    fileCount: files.length,
    directories,
  };
}
