/**
 * Interactive playbook wizard for collecting user preferences.
 *
 * Provides a 3-step guided experience for customizing playbook generation
 * before AI generation begins.
 */

import chalk from 'chalk';
import { promptBecome, promptHandlersDescription, promptHosts } from './playbook-prompts.js';
import { showStepHeader } from './prompts.js';
import type { PlaybookWizardContext } from './types.js';
import { playbookWizardSchema } from './types.js';

/**
 * Run the interactive playbook wizard to collect user preferences.
 *
 * Guides the user through a 3-step process:
 * 1. Target hosts - inventory pattern (required)
 * 2. Privilege escalation - become settings (yes/no + optional user)
 * 3. Handlers - optional natural language description
 *
 * @returns Validated PlaybookWizardContext ready for AI generation
 * @throws {ExitPromptError} If user cancels with Ctrl+C
 *
 * @example
 * ```typescript
 * import { ExitPromptError } from '@inquirer/core';
 * import { runPlaybookWizard } from './playbook-wizard.js';
 *
 * try {
 *   const context = await runPlaybookWizard();
 *   // Use context for generation
 * } catch (error) {
 *   if (error instanceof ExitPromptError) {
 *     console.log('Wizard cancelled');
 *   }
 * }
 * ```
 */
export async function runPlaybookWizard(): Promise<PlaybookWizardContext> {
  // Display wizard intro
  console.log(chalk.cyan.bold('\nPlaybook Generation Wizard'));
  console.log('Configure target hosts, privilege escalation, and handlers.');
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.'));

  // Step 1: Target Hosts (33% complete)
  showStepHeader(1, 3, 'Target Hosts');
  const hostPattern = await promptHosts();

  // Step 2: Privilege Escalation (67% complete)
  showStepHeader(2, 3, 'Privilege Escalation');
  const becomeResult = await promptBecome();

  // Step 3: Handlers (100%)
  showStepHeader(3, 3, 'Handlers');
  const handlersDescription = await promptHandlersDescription();

  // Display completion message
  console.log(chalk.green('\n✓ Wizard complete! Starting playbook generation...\n'));

  // Build custom object with optional fields
  const custom: Record<string, string> = {};
  if (becomeResult.becomeUser) {
    custom.becomeUser = becomeResult.becomeUser;
  }
  if (handlersDescription) {
    custom.handlersDescription = handlersDescription;
  }

  // Build context object
  const context: PlaybookWizardContext = {
    hosts: [hostPattern], // Single-element array containing the user's pattern
    become: becomeResult.become,
    includeHandlers: handlersDescription !== undefined,
    custom,
  };

  // Validate with Zod schema before returning
  return playbookWizardSchema.parse(context);
}
