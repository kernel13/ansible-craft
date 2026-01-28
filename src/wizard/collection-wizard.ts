/**
 * Interactive collection wizard for collecting user preferences.
 *
 * Provides a 10-12 step guided experience for customizing collection generation
 * before generation begins.
 */

import chalk from 'chalk';
import { showStepHeader } from './prompts.js';
import {
  promptAuthors,
  promptCollectionName,
  promptDependencies,
  promptDescription,
  promptDocumentation,
  promptLicense,
  promptNamespace,
  promptPlugins,
  promptRoles,
  promptRuntime,
  promptTesting,
  promptVersion,
} from './collection-prompts.js';
import type { CollectionWizardContext } from './types.js';
import { collectionWizardSchema } from './types.js';

/** Total number of wizard steps */
const TOTAL_STEPS = 10;

/**
 * Run the interactive collection wizard to collect user preferences.
 *
 * Guides the user through a 10-step process:
 * 1. Collection namespace (required)
 * 2. Collection name
 * 3. Version (semantic versioning)
 * 4. Description
 * 5. License selection
 * 6. Authors
 * 7. Plugin types to include
 * 8. Role scaffolding
 * 9. Dependencies
 * 10. Testing, runtime, and documentation
 *
 * @param namespace - Pre-provided namespace (from CLI flag)
 * @param name - Pre-provided name (optional, can be inferred)
 * @returns Validated CollectionWizardContext ready for generation
 * @throws {ExitPromptError} If user cancels with Ctrl+C
 *
 * @example
 * ```typescript
 * import { ExitPromptError } from '@inquirer/prompts';
 * import { runCollectionWizard } from './collection-wizard.js';
 *
 * try {
 *   const context = await runCollectionWizard('mycompany', 'web_utils');
 *   // Use context for generation
 * } catch (error) {
 *   if (error instanceof ExitPromptError) {
 *     console.log('Wizard cancelled');
 *   }
 * }
 * ```
 */
export async function runCollectionWizard(
  namespace?: string,
  name?: string,
): Promise<CollectionWizardContext> {
  // Display wizard intro
  console.log(chalk.cyan.bold('\nCollection Generation Wizard'));
  console.log('Customize your collection structure, plugins, and configuration.');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.\n'));

  let currentStep = 1;

  // Step 1: Namespace
  showStepHeader(currentStep++, TOTAL_STEPS, 'Collection Namespace');
  const finalNamespace = namespace || (await promptNamespace());

  // Step 2: Collection Name
  showStepHeader(currentStep++, TOTAL_STEPS, 'Collection Name');
  const finalName = name || (await promptCollectionName());

  // Step 3: Version
  showStepHeader(currentStep++, TOTAL_STEPS, 'Version');
  const version = await promptVersion();

  // Step 4: Description
  showStepHeader(currentStep++, TOTAL_STEPS, 'Description');
  const description = await promptDescription();

  // Step 5: License
  showStepHeader(currentStep++, TOTAL_STEPS, 'License');
  const license = await promptLicense();

  // Step 6: Authors
  showStepHeader(currentStep++, TOTAL_STEPS, 'Authors');
  const authors = await promptAuthors();

  // Step 7: Plugins
  showStepHeader(currentStep++, TOTAL_STEPS, 'Plugin Types');
  const {
    includeModules,
    includeFilterPlugins,
    includeInventoryPlugins,
    includeLookupPlugins,
    includeTestPlugins,
  } = await promptPlugins();

  // Step 8: Roles
  showStepHeader(currentStep++, TOTAL_STEPS, 'Role Scaffolding');
  const { includeRoles, roleNames } = await promptRoles();

  // Step 9: Dependencies
  showStepHeader(currentStep++, TOTAL_STEPS, 'Dependencies');
  const dependencies = await promptDependencies();

  // Step 10: Testing, Runtime, Documentation
  showStepHeader(currentStep++, TOTAL_STEPS, 'Testing & Configuration');
  const testingLevel = await promptTesting();
  const { includeRuntime, requiresAnsible } = await promptRuntime();
  const { includeDocs, includeChangelog } = await promptDocumentation();

  // Final Step: Completion
  console.log(chalk.green('\n✓ Wizard complete! Starting collection generation...\n'));

  // Build context object
  const context: CollectionWizardContext = {
    namespace: finalNamespace,
    name: finalName,
    version,
    description,
    license,
    authors,
    includeRoles,
    roleNames,
    includeModules,
    includeFilterPlugins,
    includeInventoryPlugins,
    includeLookupPlugins,
    includeTestPlugins,
    dependencies,
    testingLevel,
    includeRuntime,
    requiresAnsible,
    includeDocs,
    includeChangelog,
    custom: {},
  };

  // Validate with Zod schema before returning
  return collectionWizardSchema.parse(context);
}
