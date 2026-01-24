/**
 * Interactive role wizard for collecting user preferences.
 *
 * Provides a 10-step guided experience for customizing role generation
 * before AI generation begins.
 */

import chalk from 'chalk';
import {
  promptAnsibleVersion,
  promptDependencies,
  promptDirectories,
  promptHandlers,
  promptIdempotency,
  promptMolecule,
  promptPlatforms,
  promptPrivilegeEscalation,
  promptTags,
  promptVariableStrategy,
  showStepHeader,
  showTopicsOverview,
} from './prompts.js';
import type { RoleWizardContext } from './types.js';
import { roleWizardSchema } from './types.js';

/** Total number of wizard steps */
const TOTAL_STEPS = 11;

/**
 * Run the interactive role wizard to collect user preferences.
 *
 * Guides the user through a 10-step process:
 * 1. Select role directories (tasks required, others optional)
 * 2. Select target platforms (Ubuntu, RHEL, etc. or Generic)
 * 3. Configure Ansible version requirements
 * 4. Configure variable strategy
 * 5. Configure privilege escalation
 * 6. Select handlers needed (restart, reload, enable, custom)
 * 7. Configure tags strategy
 * 8. Configure idempotency settings
 * 9. Configure role dependencies
 * 10. Configure Molecule testing
 * 11. Complete - show summary
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
  console.log('Customize your role structure, platforms, and configuration.');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.\n'));

  // Display topics overview
  showTopicsOverview();

  // Step 1: Role Structure
  showStepHeader(1, TOTAL_STEPS, 'Role Structure');
  const structure = await promptDirectories();

  // Step 2: Target Platforms
  showStepHeader(2, TOTAL_STEPS, 'Target Platforms');
  const platforms = await promptPlatforms();

  // Step 3: Ansible Version
  showStepHeader(3, TOTAL_STEPS, 'Ansible Version');
  const ansibleVersion = await promptAnsibleVersion();

  // Step 4: Variable Strategy
  showStepHeader(4, TOTAL_STEPS, 'Variable Strategy');
  const variableStrategy = await promptVariableStrategy();

  // Step 5: Privilege Escalation
  showStepHeader(5, TOTAL_STEPS, 'Privilege Escalation');
  const privilegeEscalation = await promptPrivilegeEscalation();

  // Step 6: Service Handlers
  showStepHeader(6, TOTAL_STEPS, 'Service Handlers');
  const handlers = await promptHandlers();

  // Step 7: Tags Configuration
  showStepHeader(7, TOTAL_STEPS, 'Tags Configuration');
  const tags = await promptTags();

  // Step 8: Idempotency Settings
  showStepHeader(8, TOTAL_STEPS, 'Idempotency Settings');
  const idempotency = await promptIdempotency();

  // Step 9: Role Dependencies
  showStepHeader(9, TOTAL_STEPS, 'Dependencies');
  const dependencies = await promptDependencies();

  // Step 10: Molecule Testing
  showStepHeader(10, TOTAL_STEPS, 'Molecule Testing');
  const molecule = await promptMolecule(platforms);

  // Step 11: Completion
  showStepHeader(11, TOTAL_STEPS, 'Configuration Complete');
  console.log(chalk.green('✓ Wizard complete! Starting role generation...\n'));

  // Build context object
  const context: RoleWizardContext = {
    structure,
    platforms,
    handlers,
    ansibleVersion,
    variableStrategy,
    privilegeEscalation,
    tags,
    idempotency,
    dependencies,
    molecule,
    custom: {},
  };

  // Validate with Zod schema before returning
  return roleWizardSchema.parse(context);
}
