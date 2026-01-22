/**
 * Interactive role wizard for collecting user preferences.
 *
 * Provides a 4-step guided experience for customizing role generation
 * before AI generation begins.
 */

import chalk from 'chalk';
import { promptDirectories, promptHandlers, promptPlatforms, showStepHeader } from './prompts.js';
import type { RoleWizardContext } from './types.js';
import { roleWizardSchema } from './types.js';

/**
 * Run the interactive role wizard to collect user preferences.
 *
 * Guides the user through a 4-step process:
 * 1. Select role directories (tasks required, others optional)
 * 2. Select target platforms (Ubuntu, RHEL, etc. or Generic)
 * 3. Select handlers needed (restart, reload, enable, custom)
 * 4. Complete - show summary
 *
 * @returns Validated RoleWizardContext ready for AI generation
 * @throws {ExitPromptError} If user cancels with Ctrl+C
 *
 * @example
 * ```typescript
 * import { ExitPromptError } from '@inquirer/prompts';
 * import { runRoleWizard } from './role-wizard.js';
 *
 * try {
 *   const context = await runRoleWizard();
 *   // Use context for generation
 * } catch (error) {
 *   if (error instanceof ExitPromptError) {
 *     console.log('Wizard cancelled');
 *   }
 * }
 * ```
 */
export async function runRoleWizard(): Promise<RoleWizardContext> {
  // Display wizard intro
  console.log(chalk.cyan.bold('\nRole Generation Wizard'));
  console.log('Customize your role structure, platforms, and handlers.');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.'));

  // Step 1: Role Structure
  showStepHeader(1, 4, 'Role Structure');
  const structure = await promptDirectories();

  // Step 2: Target Platforms
  showStepHeader(2, 4, 'Target Platforms');
  const platforms = await promptPlatforms();

  // Step 3: Service Handlers
  showStepHeader(3, 4, 'Service Handlers');
  const handlers = await promptHandlers();

  // Step 4: Completion
  showStepHeader(4, 4, 'Configuration Complete');
  console.log(chalk.green('✓ Wizard complete! Starting role generation...\n'));

  // Build context object
  const context: RoleWizardContext = {
    structure,
    platforms,
    handlers,
    custom: {},
  };

  // Validate with Zod schema before returning
  return roleWizardSchema.parse(context);
}
