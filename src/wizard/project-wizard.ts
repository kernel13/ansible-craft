/**
 * Interactive project wizard for collecting user preferences.
 *
 * Provides a 6-step guided experience for customizing Ansible project
 * structure generation.
 */

import chalk from 'chalk';
import {
  promptAnsibleCfg,
  promptEnvironments,
  promptGroups,
  promptLayout,
  promptOptionalDirs,
  promptSampleFiles,
} from './project-prompts.js';
import { showStepHeader } from './prompts.js';
import type { ProjectWizardContext } from './types.js';
import { projectWizardSchema } from './types.js';

/** Total number of wizard steps */
const TOTAL_STEPS = 6;

/**
 * Run the interactive project wizard to collect user preferences.
 *
 * Guides the user through a 6-step process:
 * 1. Layout type - single or multi-environment
 * 2. Environments - production, staging, etc.
 * 3. Initial groups - inventory groups to create
 * 4. Optional directories - library, module_utils, filter_plugins
 * 5. ansible.cfg - include configuration file
 * 6. Sample files - include placeholder content
 *
 * @returns Validated ProjectWizardContext ready for structure generation
 * @throws {ExitPromptError} If user cancels with Ctrl+C
 *
 * @example
 * ```typescript
 * import { ExitPromptError } from '@inquirer/core';
 * import { runProjectWizard } from './project-wizard.js';
 *
 * try {
 *   const context = await runProjectWizard();
 *   // Use context for structure generation
 * } catch (error) {
 *   if (error instanceof ExitPromptError) {
 *     console.log('Wizard cancelled');
 *   }
 * }
 * ```
 */
export async function runProjectWizard(): Promise<ProjectWizardContext> {
  // Display wizard intro
  console.log(chalk.cyan.bold('\nProject Structure Wizard'));
  console.log('Configure your Ansible project directory structure.');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.\n'));

  // Step 1: Layout Type
  showStepHeader(1, TOTAL_STEPS, 'Layout Type');
  const layout = await promptLayout();

  // Step 2: Environments
  showStepHeader(2, TOTAL_STEPS, 'Environments');
  const environments = await promptEnvironments();

  // Step 3: Initial Groups
  showStepHeader(3, TOTAL_STEPS, 'Inventory Groups');
  const groups = await promptGroups();

  // Step 4: Optional Directories
  showStepHeader(4, TOTAL_STEPS, 'Optional Directories');
  const optionalDirs = await promptOptionalDirs();

  // Step 5: ansible.cfg
  showStepHeader(5, TOTAL_STEPS, 'Configuration');
  const includeAnsibleCfg = await promptAnsibleCfg();

  // Step 6: Sample Files
  showStepHeader(6, TOTAL_STEPS, 'Sample Content');
  const includeSampleFiles = await promptSampleFiles();

  // Display completion message
  console.log(chalk.green('\n  Wizard complete! Creating project structure...\n'));

  // Build context object
  const context: ProjectWizardContext = {
    layout,
    environments,
    groups,
    optionalDirs,
    includeAnsibleCfg,
    includeSampleFiles,
    custom: {},
  };

  // Validate with Zod schema before returning
  return projectWizardSchema.parse(context);
}
