/**
 * New command for ansible-craft CLI.
 *
 * Provides the `new role` subcommand for generating Ansible roles.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { input, select } from '@inquirer/prompts';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig } from '../../config/index.js';
import {
  generateRolePlan,
  generateRoleCode,
  validateGeneratedFiles,
  displayValidationReport,
  writeGeneratedRole,
  displayRoleTree,
  sanitizeRoleName,
  inferRoleName,
  type PlanPreview,
} from '../../generation/index.js';

/**
 * New command - create new Ansible resources.
 */
export const newCommand = new Command('new')
  .description('Generate new Ansible resources');

/**
 * Display plan preview to console.
 */
function displayPlanPreview(plan: PlanPreview): void {
  console.log(chalk.cyan('\n=== Role Plan Preview ===\n'));

  console.log(chalk.bold('Role:'), plan.role_name);
  console.log(chalk.bold('Description:'), plan.description);

  console.log(chalk.bold('\nTasks:'));
  for (const task of plan.tasks) {
    console.log(`  - ${task.name}`);
    console.log(chalk.dim(`    Module: ${task.module}`));
    console.log(chalk.dim(`    Purpose: ${task.purpose}`));
  }

  if (plan.variables.length > 0) {
    console.log(chalk.bold('\nVariables:'));
    for (const v of plan.variables) {
      const defaultVal = v.default ? ` (default: ${v.default})` : '';
      console.log(`  - ${v.name}${chalk.dim(defaultVal)}`);
      console.log(chalk.dim(`    ${v.description}`));
    }
  }

  if (plan.handlers.length > 0) {
    console.log(chalk.bold('\nHandlers:'));
    for (const h of plan.handlers) {
      console.log(`  - ${h}`);
    }
  }

  if (plan.templates.length > 0) {
    console.log(chalk.bold('\nTemplates:'));
    for (const t of plan.templates) {
      console.log(`  - ${t}`);
    }
  }

  if (plan.platforms.length > 0) {
    console.log(chalk.bold('\nPlatforms:'), plan.platforms.join(', '));
  }

  console.log('');
}

/**
 * New role subcommand.
 */
newCommand
  .command('role <description>')
  .description('Generate a new Ansible role from description')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('-n, --name <name>', 'Role name (default: inferred from description)')
  .option('--dry-run', 'Preview without writing files')
  .option('--force', 'Overwrite existing directory without prompting')
  .option('--no-interactive', 'Skip clarifying questions')
  .action(async (description: string, options: {
    output?: string;
    name?: string;
    dryRun?: boolean;
    force?: boolean;
    interactive?: boolean;
  }) => {
    try {
      // 1. Load config and create client
      const config = await loadConfig();
      if (!config.api.key) {
        console.error(chalk.red('Error: API key not configured'));
        console.error(chalk.dim('Run: ansible-craft config save'));
        process.exit(1);
      }

      const client = createClient({ apiKey: config.api.key });

      // 2. Determine role name
      const roleName = options.name
        ? sanitizeRoleName(options.name)
        : inferRoleName(description);

      console.log(chalk.cyan(`\nGenerating role: ${chalk.bold(roleName)}`));
      console.log(chalk.dim(`From: "${description}"\n`));

      // 3. Generate plan preview
      console.log(chalk.dim('Phase 1: Planning...\n'));
      const plan = await generateRolePlan(client, description);

      // 4. Display plan preview
      displayPlanPreview(plan);

      // 5. Confirm or modify plan
      let confirmed = false;
      let currentPlan = plan;

      while (!confirmed) {
        const action = await select({
          message: 'How would you like to proceed?',
          choices: [
            { value: 'accept', name: 'Accept - Generate the role' },
            { value: 'modify', name: 'Modify - Provide feedback to adjust the plan' },
            { value: 'reject', name: 'Reject - Cancel generation' },
          ],
        });

        if (action === 'reject') {
          console.log(chalk.yellow('\nGeneration cancelled.'));
          return;
        }

        if (action === 'modify') {
          const feedback = await input({
            message: 'What changes would you like?',
          });
          console.log(chalk.dim('\nRegenerating plan...\n'));
          currentPlan = await generateRolePlan(client, `${description}\n\nUser feedback: ${feedback}`);
          displayPlanPreview(currentPlan);
        } else {
          confirmed = true;
        }
      }

      // 6. Generate code
      console.log(chalk.dim('\nPhase 2: Generating code...\n'));
      const files = await generateRoleCode(client, currentPlan, description);

      // 7. Validate
      console.log(chalk.dim('\nValidating generated code...\n'));
      const report = validateGeneratedFiles(files);
      displayValidationReport(report);

      if (!report.valid) {
        console.error(chalk.red('\nGeneration failed due to YAML errors.'));
        process.exit(1);
      }

      // 8. Write files
      const result = await writeGeneratedRole(files, {
        roleName,
        outputDir: options.output,
        dryRun: options.dryRun,
        force: options.force,
      });

      // 9. Display result
      displayRoleTree(result);

      if (result.dryRun) {
        console.log(chalk.yellow('\nDry run complete. No files were written.'));
      } else {
        console.log(chalk.green(`\nRole created successfully at: ${result.roleDir}`));
        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim(`  cd ${result.roleDir}`));
        console.log(chalk.dim('  ansible-lint .'));
        console.log(chalk.dim('  molecule test'));
      }

    } catch (error) {
      if (error instanceof Error && error.message === 'Operation cancelled by user') {
        console.log(chalk.yellow('\nOperation cancelled.'));
        return;
      }

      const apiError = transformApiError(error);
      if (apiError) {
        displayApiError(apiError);
        process.exit(1);
      }

      console.error(chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`));
      process.exit(1);
    }
  });
