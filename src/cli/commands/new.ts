/**
 * New command for ansible-craft CLI.
 *
 * Provides the `new role` and `new playbook` subcommands.
 */

import { input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig } from '../../config/index.js';
import {
  type PlanPreview,
  type PlaybookPlanPreview,
  displayPlaybookTree,
  displayRoleTree,
  displayValidationReport,
  generatePlaybookCode,
  generatePlaybookPlan,
  generateRoleCode,
  generateRolePlan,
  inferPlaybookName,
  inferRoleName,
  sanitizeRoleName,
  validateGeneratedFiles,
  writeGeneratedPlaybook,
  writeGeneratedRole,
} from '../../generation/index.js';

/**
 * New command - create new Ansible resources.
 */
export const newCommand = new Command('new').description('Generate new Ansible resources');

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
  .action(
    async (
      description: string,
      options: {
        output?: string;
        name?: string;
        dryRun?: boolean;
        force?: boolean;
        interactive?: boolean;
      },
    ) => {
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
        const roleName = options.name ? sanitizeRoleName(options.name) : inferRoleName(description);

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
            currentPlan = await generateRolePlan(
              client,
              `${description}\n\nUser feedback: ${feedback}`,
            );
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

        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        process.exit(1);
      }
    },
  );

/**
 * Display playbook plan preview to console.
 */
function displayPlaybookPlanPreview(plan: PlaybookPlanPreview): void {
  console.log(chalk.cyan('\n=== Playbook Plan Preview ===\n'));

  console.log(chalk.bold('Playbook:'), plan.playbook_name);
  console.log(chalk.bold('Description:'), plan.description);
  console.log(chalk.bold('Inventory Groups:'), plan.inventory_groups.join(', '));

  console.log(chalk.bold('\nPlays:'));
  for (const play of plan.plays) {
    console.log(`\n  ${chalk.yellow(play.name)} (hosts: ${play.hosts})`);
    console.log(chalk.dim(`    Purpose: ${play.purpose}`));

    if (play.has_pre_tasks) {
      console.log(chalk.dim('    Pre-tasks: Yes'));
    }

    console.log(chalk.dim('    Tasks:'));
    for (const task of play.tasks) {
      console.log(chalk.dim(`      - ${task.name} (${task.module})`));
      if (task.role_extraction_hint) {
        console.log(chalk.dim(`        Hint: ${task.role_extraction_hint}`));
      }
    }

    if (play.handlers.length > 0) {
      console.log(chalk.dim(`    Handlers: ${play.handlers.join(', ')}`));
    }

    if (play.has_post_tasks) {
      console.log(chalk.dim('    Post-tasks: Yes'));
    }
  }

  if (plan.group_vars.length > 0) {
    console.log(chalk.bold('\nGroup Variables:'));
    for (const group of plan.group_vars) {
      console.log(`  ${chalk.yellow(`group_vars/${group.group}.yml`)}`);
      for (const v of group.variables) {
        const defaultVal = v.default ? ` (default: ${v.default})` : '';
        console.log(chalk.dim(`    - ${v.name}${defaultVal}: ${v.description}`));
      }
    }
  }

  console.log('');
}

/**
 * New playbook subcommand.
 */
newCommand
  .command('playbook <description>')
  .description('Generate a new Ansible playbook from description')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('-n, --name <name>', 'Playbook name (default: inferred from description)')
  .option('--dry-run', 'Preview without writing files')
  .option('--force', 'Overwrite existing directory without prompting')
  .option('--no-interactive', 'Skip clarifying questions')
  .action(
    async (
      description: string,
      options: {
        output?: string;
        name?: string;
        dryRun?: boolean;
        force?: boolean;
        interactive?: boolean;
      },
    ) => {
      try {
        // 1. Load config and create client
        const config = await loadConfig();
        if (!config.api.key) {
          console.error(chalk.red('Error: API key not configured'));
          console.error(chalk.dim('Run: ansible-craft config save'));
          process.exit(1);
        }

        const client = createClient({ apiKey: config.api.key });

        // 2. Determine playbook name
        const playbookName = options.name
          ? sanitizeRoleName(options.name) // Reuse sanitize for playbooks
          : inferPlaybookName(description);

        console.log(chalk.cyan(`\nGenerating playbook: ${chalk.bold(playbookName)}`));
        console.log(chalk.dim(`From: "${description}"\n`));

        // 3. Generate plan preview
        console.log(chalk.dim('Phase 1: Planning...\n'));
        const plan = await generatePlaybookPlan(client, description);

        // 4. Display plan preview
        displayPlaybookPlanPreview(plan);

        // 5. Confirm or modify plan
        let confirmed = false;
        let currentPlan = plan;

        while (!confirmed) {
          const action = await select({
            message: 'How would you like to proceed?',
            choices: [
              { value: 'accept', name: 'Accept - Generate the playbook' },
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
            currentPlan = await generatePlaybookPlan(
              client,
              `${description}\n\nUser feedback: ${feedback}`,
            );
            displayPlaybookPlanPreview(currentPlan);
          } else {
            confirmed = true;
          }
        }

        // 6. Generate code
        console.log(chalk.dim('\nPhase 2: Generating code...\n'));
        const files = await generatePlaybookCode(client, currentPlan, description);

        // 7. Validate
        console.log(chalk.dim('\nValidating generated code...\n'));
        const report = validateGeneratedFiles(files);
        displayValidationReport(report);

        if (!report.valid) {
          console.error(chalk.red('\nGeneration failed due to YAML errors.'));
          process.exit(1);
        }

        // 8. Write files
        const result = await writeGeneratedPlaybook(files, {
          playbookName,
          outputDir: options.output,
          dryRun: options.dryRun,
          force: options.force,
        });

        // 9. Display result
        displayPlaybookTree(result);

        if (result.dryRun) {
          console.log(chalk.yellow('\nDry run complete. No files were written.'));
        } else {
          console.log(chalk.green(`\nPlaybook created successfully at: ${result.playbookDir}`));
          console.log(chalk.dim('\nNext steps:'));
          console.log(chalk.dim(`  cd ${result.playbookDir}`));
          console.log(chalk.dim('  ansible-lint playbook.yml'));
          console.log(chalk.dim('  ansible-playbook -i inventory.example playbook.yml --check'));
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

        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        process.exit(1);
      }
    },
  );
