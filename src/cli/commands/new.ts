/**
 * New command for ansible-craft CLI.
 *
 * Provides the `new role` and `new playbook` subcommands.
 * Uses specialized agents for parallel validation/linting and file writing.
 */

import { ExitPromptError } from '@inquirer/core';
import { confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import { Command } from 'commander';
import { runPlaybookWizard } from '../../wizard/playbook-wizard.js';
import { runRoleWizard } from '../../wizard/role-wizard.js';
import {
  formatPlaybookContextForPrompt,
  formatRoleContextForPrompt,
  type PlaybookWizardContext,
  type RoleWizardContext,
} from '../../wizard/types.js';
import { FixerAgent, WriterAgent, validateAndLint } from '../../agents/index.js';
import type { WriterOutput } from '../../agents/types.js';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig, saveConfig } from '../../config/index.js';
import type { Config } from '../../config/schema.js';
import {
  displayDefaultsPreview,
  getQuickModeDefaults,
  hasChangedFromDefaults,
  WIZARD_DEFAULTS_VERSION,
} from '../../wizard/defaults.js';
import {
  type GeneratedFile,
  type LintViolation,
  type PlanPreview,
  type PlaybookPlanPreview,
  type WritePlaybookResult,
  type WriteResult,
  displayPlaybookTree,
  displayRoleTree,
  displayValidationReport,
  formatInstallInstructions,
  generatePlaybookCode,
  generatePlaybookPlan,
  generateRoleCode,
  generateRolePlan,
  inferPlaybookName,
  inferRoleName,
  sanitizeRoleName,
} from '../../generation/index.js';
import { createAgentContext, displayAgentWarnings, handleAgentFailure } from '../helpers/index.js';
import {
  formatJsonError,
  formatJsonSuccess,
  lintViolationsToWarnings,
  outputJson,
} from '../json-output.js';
import { createPhaseTracker } from '../output.js';
import { displayLintResults, previewAndConfirm } from '../preview.js';

/**
 * New command - create new Ansible resources.
 */
export const newCommand = new Command('new').description('Generate new Ansible resources');

/**
 * Convert WriterOutput to WriteResult format for displayRoleTree.
 */
function toWriteResult(output: WriterOutput, dryRun: boolean): WriteResult {
  return {
    roleDir: output.targetDir,
    filesWritten: output.written,
    dirsCreated: [],
    dryRun,
  };
}

/**
 * Convert WriterOutput to WritePlaybookResult format for displayPlaybookTree.
 */
function toWritePlaybookResult(output: WriterOutput, dryRun: boolean): WritePlaybookResult {
  return {
    playbookDir: output.targetDir,
    filesWritten: output.written,
    dirsCreated: [],
    dryRun,
  };
}

/**
 * Prompt user to save wizard defaults immediately after wizard completion.
 * Only prompts when choices differ from existing defaults.
 *
 * IMPORTANT: This is called right after the wizard returns, BEFORE generation starts.
 * This ensures the user is always prompted even if generation fails later.
 *
 * Error handling: If saveConfig fails, we log a warning but don't crash.
 * The generation can still proceed even if defaults couldn't be saved.
 */
async function promptToSaveDefaults(
  type: 'role' | 'playbook',
  context: RoleWizardContext | PlaybookWizardContext,
  existingDefaults: RoleWizardContext | PlaybookWizardContext | undefined,
  jsonMode: boolean,
): Promise<void> {
  // Skip in JSON mode or if no changes
  if (jsonMode) return;
  if (!hasChangedFromDefaults(context, existingDefaults)) return;

  displayDefaultsPreview(type, context);

  const save = await confirm({
    message: 'Save these choices as defaults for future sessions?',
    default: true,
  });

  if (save) {
    try {
      const wizardDefaults = {
        defaults_version: WIZARD_DEFAULTS_VERSION,
        [type]: context,
      };

      await saveConfig({
        defaults: {
          wizard: wizardDefaults,
        },
      } as Partial<Config>);

      console.log(chalk.green(`\n${type} defaults saved successfully`));
    } catch (error) {
      // Log warning but don't fail - generation can still proceed
      console.warn(
        chalk.yellow(
          `\nWarning: Failed to save defaults: ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
      console.warn(chalk.dim('Generation will continue, but your defaults were not saved.'));
    }
  }
}

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
  .option('--fix', 'Auto-fix lint violations without prompting')
  .option('--no-interactive', 'Skip clarifying questions')
  .option('-Q, --quick', 'Skip wizard and use defaults')
  .option('-q, --quiet', 'Suppress progress output')
  .option('--json', 'Output results in JSON format')
  .action(
    async (
      description: string,
      options: {
        output?: string;
        name?: string;
        dryRun?: boolean;
        force?: boolean;
        fix?: boolean;
        interactive?: boolean;
        quick?: boolean;
        quiet?: boolean;
        json?: boolean;
      },
    ) => {
      const startTime = Date.now();
      const jsonMode = options.json ?? false;

      // In JSON mode: quiet=true for all operations, no interactive prompts
      if (jsonMode) {
        options.quiet = true;
        options.force = true; // Don't prompt for overwrite in JSON mode
        options.fix = true; // Auto-fix without prompting in JSON mode
      }

      try {
        // 1. Load config and create client
        const config = await loadConfig();
        if (!config.api.key) {
          if (jsonMode) {
            outputJson(formatJsonError('CONFIG_ERROR', 'API key not configured'));
            process.exit(1);
          }
          console.error(chalk.red('Error: API key not configured'));
          console.error(chalk.dim('Run: ansible-craft config save'));
          process.exit(1);
        }

        const client = createClient({ apiKey: config.api.key });

        // 2. Determine role name
        const roleName = options.name ? sanitizeRoleName(options.name) : inferRoleName(description);

        if (!jsonMode) {
          console.log(chalk.cyan(`\nGenerating role: ${chalk.bold(roleName)}`));
          console.log(chalk.dim(`From: "${description}"\n`));
        }

        // Determine wizard skip conditions:
        // - --quick flag explicitly skips
        // - --no-interactive skips (options.interactive === false)
        // - --json mode implies skip (machine output)
        // - Non-TTY stdin silently skips (pipe/CI)
        const skipWizard =
          options.quick || options.interactive === false || jsonMode || !process.stdin.isTTY;

        // Load existing defaults for comparison and --quick mode
        const existingDefaults = config.defaults?.wizard?.role;

        let wizardContext: RoleWizardContext | undefined;
        let clarifications: Record<string, string> | undefined;

        if (!skipWizard) {
          try {
            const context = await runRoleWizard();
            wizardContext = context;
            clarifications = formatRoleContextForPrompt(context);

            // CRITICAL: Prompt to save defaults IMMEDIATELY after wizard completes
            // This happens BEFORE generation starts, ensuring user is always prompted
            // even if generation fails later (DFLT-01 requirement)
            await promptToSaveDefaults('role', wizardContext, existingDefaults, jsonMode);
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\nWizard cancelled.'));
              return;
            }
            throw error;
          }
        } else if (options.quick) {
          // Use saved defaults or fall back to quick mode defaults
          const defaults = existingDefaults ?? getQuickModeDefaults('role');
          wizardContext = defaults;
          clarifications = formatRoleContextForPrompt(defaults);

          if (!jsonMode && !options.quiet) {
            if (existingDefaults) {
              console.log(chalk.dim('Using saved defaults (--quick)'));
            } else {
              console.log(chalk.dim('Using default settings (no saved defaults found)'));
            }
          }
        }

        // Create phase tracker for progress display
        const tracker = createPhaseTracker(options.quiet ?? false);

        // 3. Generate plan preview
        tracker.start('Planning role structure...');
        const plan = await generateRolePlan(client, description, clarifications, {
          quiet: true, // Suppress inner spinner - tracker handles progress
        });
        tracker.succeed('Planning complete');

        // 4. Display plan preview and confirm (skip in JSON mode)
        let currentPlan = plan;

        if (!jsonMode) {
          displayPlanPreview(plan);

          // 5. Confirm or modify plan
          let confirmed = false;

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
              tracker.start('Regenerating plan...');
              currentPlan = await generateRolePlan(
                client,
                `${description}\n\nUser feedback: ${feedback}`,
                clarifications,
                { quiet: true },
              );
              tracker.succeed('Plan updated');
              displayPlanPreview(currentPlan);
            } else {
              confirmed = true;
            }
          }
        }

        // 6. Generate code
        tracker.start('Generating role code...');
        let files = await generateRoleCode(client, currentPlan, description, {
          quiet: true, // Suppress inner spinner - tracker handles progress
        });
        tracker.succeed('Code generation complete');

        // Create agent context for parallel operations
        const agentContext = createAgentContext({
          config,
          quiet: options.quiet,
          json: jsonMode,
        });

        // 7. Validate and lint in parallel (using agents)
        tracker.start('Validating and linting...');
        const { validation, lint } = await validateAndLint(files, agentContext);
        tracker.succeed('Quality checks complete');

        // Handle validation failure
        if (!validation.success) {
          handleAgentFailure(validation, {
            jsonMode,
            tracker,
            phaseName: 'Validation failed',
          });
        }

        // Display validation report (if available)
        if (!jsonMode && validation.data) {
          displayValidationReport(validation.data.report);
        }

        // Check validation passed
        if (validation.data && !validation.data.report.valid) {
          if (jsonMode) {
            outputJson(
              formatJsonError('VALIDATION_ERROR', 'Generation failed due to YAML errors', {
                errors: validation.data.report.errors.map((e) => ({
                  file: e.path,
                  message: e.message,
                  line: e.line,
                  column: e.column,
                })),
              }),
            );
            process.exit(1);
          }
          console.error(chalk.red('\nGeneration failed due to YAML errors.'));
          process.exit(1);
        }

        // 8. Process lint results
        let lintViolations: LintViolation[] = lint.data?.violations ?? [];
        const lintAvailable = lint.data?.available ?? false;

        if (!lintAvailable && !jsonMode) {
          console.log(chalk.dim(`\nNote: ansible-lint not found. ${formatInstallInstructions()}`));
        }

        // 9. Auto-fix if violations exist (using FixerAgent)
        if (lintViolations.length > 0) {
          const fixerAgent = new FixerAgent();
          const fixableCount = lintViolations.filter((v) => fixerAgent.name && v.ruleId).length;

          if (fixableCount > 0) {
            if (!jsonMode) {
              displayLintResults(lintViolations);
            }

            // In JSON mode, options.fix is already true
            const shouldFix =
              options.fix ||
              (await confirm({
                message: `Auto-fix ${fixableCount} issue(s)?`,
                default: true,
              }));

            if (shouldFix) {
              const fixResult = await fixerAgent.execute(
                { files, violations: lintViolations, autoFix: true },
                agentContext,
              );

              if (fixResult.success && fixResult.data) {
                files = fixResult.data.modifiedFiles;
                displayAgentWarnings(fixResult.warnings, options.quiet ?? false);
                if (!jsonMode) {
                  console.log(chalk.green(`\n  Fixed ${fixResult.data.fixed.length} issue(s)`));
                }
              }
            }
          } else if (!jsonMode) {
            // Show lint results even if none are fixable
            displayLintResults(lintViolations);
          }
        }

        // 10. Dry-run preview or write files (skip in JSON mode)
        if (options.dryRun && !jsonMode) {
          const proceed = await previewAndConfirm(files, lintViolations);
          if (!proceed) {
            console.log(chalk.yellow('\nGeneration cancelled.'));
            return;
          }
        }

        // 11. Write files (using WriterAgent for parallel I/O)
        const writerAgent = new WriterAgent();
        const writeResult = await writerAgent.execute(
          {
            files,
            outputDir: options.output ?? process.cwd(),
            name: roleName,
            type: 'role',
            force: options.force ?? false,
            dryRun: options.dryRun ?? false,
          },
          agentContext,
        );

        if (!writeResult.success) {
          handleAgentFailure(writeResult, { jsonMode });
        }

        const result = toWriteResult(writeResult.data!, options.dryRun ?? false);

        // 12. Display result or output JSON
        if (jsonMode) {
          const warnings = lintViolationsToWarnings(lintViolations);
          const jsonResult = formatJsonSuccess(
            'role',
            roleName,
            result.roleDir,
            files,
            warnings,
            `ansible-craft new role "${description}"`,
            startTime,
          );
          outputJson(jsonResult);
          return;
        }

        displayRoleTree(result);

        console.log(chalk.green(`\nRole created successfully at: ${result.roleDir}`));
        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim(`  cd ${result.roleDir}`));
        console.log(chalk.dim('  ansible-lint .'));
        console.log(chalk.dim('  molecule test'));
      } catch (error) {
        // Handle JSON mode errors
        if (jsonMode) {
          const code =
            error instanceof Error && 'code' in error
              ? (error as Error & { code: string }).code
              : 'UNKNOWN_ERROR';
          outputJson(
            formatJsonError(code, error instanceof Error ? error.message : 'Unknown error'),
          );
          process.exit(1);
        }

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
  .option('--fix', 'Auto-fix lint violations without prompting')
  .option('--no-interactive', 'Skip clarifying questions')
  .option('-Q, --quick', 'Skip wizard and use defaults')
  .option('-q, --quiet', 'Suppress progress output')
  .option('--json', 'Output results in JSON format')
  .action(
    async (
      description: string,
      options: {
        output?: string;
        name?: string;
        dryRun?: boolean;
        force?: boolean;
        fix?: boolean;
        interactive?: boolean;
        quick?: boolean;
        quiet?: boolean;
        json?: boolean;
      },
    ) => {
      const startTime = Date.now();
      const jsonMode = options.json ?? false;

      // In JSON mode: quiet=true for all operations, no interactive prompts
      if (jsonMode) {
        options.quiet = true;
        options.force = true; // Don't prompt for overwrite in JSON mode
        options.fix = true; // Auto-fix without prompting in JSON mode
      }

      try {
        // 1. Load config and create client
        const config = await loadConfig();
        if (!config.api.key) {
          if (jsonMode) {
            outputJson(formatJsonError('CONFIG_ERROR', 'API key not configured'));
            process.exit(1);
          }
          console.error(chalk.red('Error: API key not configured'));
          console.error(chalk.dim('Run: ansible-craft config save'));
          process.exit(1);
        }

        const client = createClient({ apiKey: config.api.key });

        // 2. Determine playbook name
        const playbookName = options.name
          ? sanitizeRoleName(options.name) // Reuse sanitize for playbooks
          : inferPlaybookName(description);

        if (!jsonMode) {
          console.log(chalk.cyan(`\nGenerating playbook: ${chalk.bold(playbookName)}`));
          console.log(chalk.dim(`From: "${description}"\n`));
        }

        // Determine wizard skip conditions:
        // - --quick flag explicitly skips
        // - --no-interactive skips (options.interactive === false)
        // - --json mode implies skip (machine output)
        // - Non-TTY stdin silently skips (pipe/CI)
        const skipWizard =
          options.quick || options.interactive === false || jsonMode || !process.stdin.isTTY;

        let clarifications: Record<string, string> | undefined;

        if (!skipWizard) {
          try {
            const context = await runPlaybookWizard();
            clarifications = formatPlaybookContextForPrompt(context);
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\nWizard cancelled.'));
              return;
            }
            throw error;
          }
        }

        // Create phase tracker for progress display
        const tracker = createPhaseTracker(options.quiet ?? false);

        // 3. Generate plan preview
        tracker.start('Planning playbook structure...');
        const plan = await generatePlaybookPlan(client, description, clarifications, {
          quiet: true, // Suppress inner spinner - tracker handles progress
        });
        tracker.succeed('Planning complete');

        // 4. Display plan preview and confirm (skip in JSON mode)
        let currentPlan = plan;

        if (!jsonMode) {
          displayPlaybookPlanPreview(plan);

          // 5. Confirm or modify plan
          let confirmed = false;

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
              tracker.start('Regenerating plan...');
              currentPlan = await generatePlaybookPlan(
                client,
                `${description}\n\nUser feedback: ${feedback}`,
                clarifications,
                { quiet: true },
              );
              tracker.succeed('Plan updated');
              displayPlaybookPlanPreview(currentPlan);
            } else {
              confirmed = true;
            }
          }
        }

        // 6. Generate code
        tracker.start('Generating playbook code...');
        let files = await generatePlaybookCode(client, currentPlan, description, {
          quiet: true, // Suppress inner spinner - tracker handles progress
        });
        tracker.succeed('Code generation complete');

        // Create agent context for parallel operations
        const agentContext = createAgentContext({
          config,
          quiet: options.quiet,
          json: jsonMode,
        });

        // 7. Validate and lint in parallel (using agents)
        tracker.start('Validating and linting...');
        const { validation, lint } = await validateAndLint(files, agentContext);
        tracker.succeed('Quality checks complete');

        // Handle validation failure
        if (!validation.success) {
          handleAgentFailure(validation, {
            jsonMode,
            tracker,
            phaseName: 'Validation failed',
          });
        }

        // Display validation report (if available)
        if (!jsonMode && validation.data) {
          displayValidationReport(validation.data.report);
        }

        // Check validation passed
        if (validation.data && !validation.data.report.valid) {
          if (jsonMode) {
            outputJson(
              formatJsonError('VALIDATION_ERROR', 'Generation failed due to YAML errors', {
                errors: validation.data.report.errors.map((e) => ({
                  file: e.path,
                  message: e.message,
                  line: e.line,
                  column: e.column,
                })),
              }),
            );
            process.exit(1);
          }
          console.error(chalk.red('\nGeneration failed due to YAML errors.'));
          process.exit(1);
        }

        // 8. Process lint results
        let lintViolations: LintViolation[] = lint.data?.violations ?? [];
        const lintAvailable = lint.data?.available ?? false;

        if (!lintAvailable && !jsonMode) {
          console.log(chalk.dim(`\nNote: ansible-lint not found. ${formatInstallInstructions()}`));
        }

        // 9. Auto-fix if violations exist (using FixerAgent)
        if (lintViolations.length > 0) {
          const fixerAgent = new FixerAgent();
          const fixableCount = lintViolations.filter((v) => fixerAgent.name && v.ruleId).length;

          if (fixableCount > 0) {
            if (!jsonMode) {
              displayLintResults(lintViolations);
            }

            // In JSON mode, options.fix is already true
            const shouldFix =
              options.fix ||
              (await confirm({
                message: `Auto-fix ${fixableCount} issue(s)?`,
                default: true,
              }));

            if (shouldFix) {
              const fixResult = await fixerAgent.execute(
                { files, violations: lintViolations, autoFix: true },
                agentContext,
              );

              if (fixResult.success && fixResult.data) {
                files = fixResult.data.modifiedFiles;
                displayAgentWarnings(fixResult.warnings, options.quiet ?? false);
                if (!jsonMode) {
                  console.log(chalk.green(`\n  Fixed ${fixResult.data.fixed.length} issue(s)`));
                }
              }
            }
          } else if (!jsonMode) {
            // Show lint results even if none are fixable
            displayLintResults(lintViolations);
          }
        }

        // 10. Dry-run preview or write files (skip in JSON mode)
        if (options.dryRun && !jsonMode) {
          const proceed = await previewAndConfirm(files, lintViolations);
          if (!proceed) {
            console.log(chalk.yellow('\nGeneration cancelled.'));
            return;
          }
        }

        // 11. Write files (using WriterAgent for parallel I/O)
        const writerAgent = new WriterAgent();
        const writeResult = await writerAgent.execute(
          {
            files,
            outputDir: options.output ?? process.cwd(),
            name: playbookName,
            type: 'playbook',
            force: options.force ?? false,
            dryRun: options.dryRun ?? false,
          },
          agentContext,
        );

        if (!writeResult.success) {
          handleAgentFailure(writeResult, { jsonMode });
        }

        const result = toWritePlaybookResult(writeResult.data!, options.dryRun ?? false);

        // 12. Display result or output JSON
        if (jsonMode) {
          const warnings = lintViolationsToWarnings(lintViolations);
          const jsonResult = formatJsonSuccess(
            'playbook',
            playbookName,
            result.playbookDir,
            files,
            warnings,
            `ansible-craft new playbook "${description}"`,
            startTime,
          );
          outputJson(jsonResult);
          return;
        }

        displayPlaybookTree(result);

        console.log(chalk.green(`\nPlaybook created successfully at: ${result.playbookDir}`));
        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim(`  cd ${result.playbookDir}`));
        console.log(chalk.dim('  ansible-lint playbook.yml'));
        console.log(chalk.dim('  ansible-playbook -i inventory.example playbook.yml --check'));
      } catch (error) {
        // Handle JSON mode errors
        if (jsonMode) {
          const code =
            error instanceof Error && 'code' in error
              ? (error as Error & { code: string }).code
              : 'UNKNOWN_ERROR';
          outputJson(
            formatJsonError(code, error instanceof Error ? error.message : 'Unknown error'),
          );
          process.exit(1);
        }

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
