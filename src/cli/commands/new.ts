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
import { runProjectWizard } from '../../wizard/project-wizard.js';
import { runRoleWizard } from '../../wizard/role-wizard.js';
import { runCollectionWizard } from '../../wizard/collection-wizard.js';
import { confirmDeepDive } from '../../wizard/prompts.js';
import {
  formatPlaybookContextForPrompt,
  formatRoleContextForPrompt,
  formatCollectionContextForPrompt,
  type PlaybookWizardContext,
  type ProjectWizardContext,
  type RoleWizardContext,
  type CollectionWizardContext,
} from '../../wizard/types.js';
import { FixerAgent, WriterAgent, validateAndLint } from '../../core/index.js';
import type { WriterOutput } from '../../core/types.js';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig, saveConfig } from '../../config/index.js';
import type { Config } from '../../config/schema.js';
import {
  runInitialResearch,
  runDeepDive,
  displayResearchSummary,
  mergeFindings,
  type ResearchFindings,
} from '../../research/index.js';
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
  collectionExists,
  createProjectStructure,
  displayPlaybookTree,
  displayRoleTree,
  displayValidationReport,
  formatInstallInstructions,
  generateCollectionFiles,
  generateCollectionPlan,
  generatePlaybookCode,
  generatePlaybookPlan,
  generateProjectFiles,
  generateRoleCode,
  generateRolePlan,
  inferCollectionName,
  inferPlaybookName,
  inferRoleName,
  projectExists,
  readExistingRole,
  sanitizeCollectionName,
  sanitizeRoleName,
  validateCollectionFiles,
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
import type { GenerateOptions as PromptGenerateOptions } from '../../generation/prompts/generate.js';

/**
 * Convert wizard clarifications to prompt generation options.
 *
 * Maps the flat clarifications object (from formatRoleContextForPrompt)
 * to the typed PromptGenerateOptions interface expected by buildGeneratePrompt.
 */
function clarificationsToPromptOptions(
  clarifications?: Record<string, string>,
): PromptGenerateOptions | undefined {
  if (!clarifications) return undefined;

  const options: PromptGenerateOptions = {};

  // Ansible version
  if (clarifications.ansible_min_version) {
    options.ansibleMinVersion = clarifications.ansible_min_version;
  }

  // Version check
  if (clarifications.version_check) {
    options.includeVersionCheck = clarifications.version_check === 'enabled';
  }

  // Variable naming
  if (clarifications.variable_naming) {
    options.variableNaming = clarifications.variable_naming;
  }

  // Tag strategy
  if (clarifications.tag_strategy) {
    options.tagStrategy = clarifications.tag_strategy;
  }
  if (clarifications.tag_groups) {
    options.tagGroups = clarifications.tag_groups;
  }

  // Privilege escalation
  if (clarifications.privilege_escalation) {
    options.privilegeEscalation = clarifications.privilege_escalation;
  }
  if (clarifications.become_user) {
    options.becomeUser = clarifications.become_user;
  }

  // Idempotency
  if (clarifications.idempotency) {
    options.idempotency = clarifications.idempotency;
  }

  // Molecule testing
  if (clarifications.molecule_testing) {
    options.moleculeEnabled = clarifications.molecule_testing === 'enabled';
  }
  if (clarifications.molecule_driver) {
    options.moleculeDriver = clarifications.molecule_driver;
  }
  if (clarifications.molecule_platforms) {
    options.moleculePlatforms = clarifications.molecule_platforms;
  }
  if (clarifications.molecule_scenarios) {
    options.moleculeScenarios = clarifications.molecule_scenarios;
  }

  return Object.keys(options).length > 0 ? options : undefined;
}

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
  type: 'role' | 'playbook' | 'project',
  context: RoleWizardContext | PlaybookWizardContext | ProjectWizardContext,
  existingDefaults: RoleWizardContext | PlaybookWizardContext | ProjectWizardContext | undefined,
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

        // Create phase tracker for progress display (needed by research phase)
        const tracker = createPhaseTracker(options.quiet ?? false);

        // Research phase (before wizard)
        let researchFindings: ResearchFindings | undefined;

        // Skip research in quick/non-interactive mode
        if (!skipWizard) {
          try {
            // Phase 1: Parallel initial research
            tracker.start('Researching best practices and implementations...');

            const agentContext = createAgentContext({
              config,
              quiet: options.quiet,
              json: jsonMode,
            });

            researchFindings = await runInitialResearch(description, roleName, agentContext);
            tracker.succeed('Research complete');

            // Phase 2: Display research summary
            displayResearchSummary(researchFindings);
          } catch (error) {
            // Research failure is non-fatal
            console.warn(
              chalk.yellow(
                `\nWarning: Research failed (${error instanceof Error ? error.message : 'Unknown error'}), continuing without`,
              ),
            );
            researchFindings = undefined;
          }
        }

        let wizardContext: RoleWizardContext | undefined;
        let clarifications: Record<string, string> | undefined;

        if (!skipWizard) {
          try {
            const context = await runRoleWizard(researchFindings);
            wizardContext = context;
            clarifications = formatRoleContextForPrompt(context);

            // CRITICAL: Prompt to save defaults IMMEDIATELY after wizard completes
            // This happens BEFORE generation starts, ensuring user is always prompted
            // even if generation fails later (DFLT-01 requirement)
            await promptToSaveDefaults('role', wizardContext, existingDefaults, jsonMode);

            // Optional deep dive on wizard-selected features
            if (
              researchFindings &&
              wizardContext.selectedFeatures &&
              wizardContext.selectedFeatures.length > 0 &&
              (await confirmDeepDive())
            ) {
              try {
                tracker.start('Deep dive research on selected features...');

                const agentContext = createAgentContext({
                  config,
                  quiet: options.quiet,
                  json: jsonMode,
                });

                const deepdiveFindings = await runDeepDive(
                  description,
                  roleName,
                  wizardContext.selectedFeatures,
                  agentContext,
                );

                tracker.succeed('Deep dive complete');

                // Merge deep dive findings into research
                researchFindings = mergeFindings(researchFindings, deepdiveFindings);
              } catch (error) {
                // Deep dive failure is non-fatal
                console.warn(
                  chalk.yellow(
                    `\nWarning: Deep dive failed (${error instanceof Error ? error.message : 'Unknown error'}), continuing`,
                  ),
                );
              }
            }
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

        // 3. Check for existing role and load content
        const outputDir = options.output ?? process.cwd();
        const existingRole = await readExistingRole(outputDir, roleName);
        if (existingRole.exists && !jsonMode && !options.quiet) {
          console.log(chalk.blue(`\nℹ Found existing role at ${outputDir}/${roleName}`));
          console.log(chalk.blue('  Will generate improvements based on current implementation\n'));
        }

        // 4. Generate plan preview
        tracker.start('Planning role structure...');
        const plan = await generateRolePlan(client, description, clarifications, {
          quiet: true, // Suppress inner spinner - tracker handles progress
          researchFindings,
          existingRole: existingRole.exists ? existingRole : undefined,
        });
        tracker.succeed('Planning complete');

        // 5. Display plan preview and confirm (skip in JSON mode)
        let currentPlan = plan;

        if (!jsonMode) {
          displayPlanPreview(plan);

          // 6. Confirm or modify plan
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

        // 7. Generate code
        tracker.start('Generating role code...');
        const promptOptions = clarificationsToPromptOptions(clarifications);
        let files = await generateRoleCode(client, currentPlan, description, {
          quiet: true, // Suppress inner spinner - tracker handles progress
          existingRole: existingRole.exists ? existingRole : undefined,
          promptOptions,
        });
        tracker.succeed('Code generation complete');

        // Create agent context for parallel operations
        const agentContext = createAgentContext({
          config,
          quiet: options.quiet,
          json: jsonMode,
        });

        // 8. Validate and lint in parallel (using agents)
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

        // 9. Process lint results
        let lintViolations: LintViolation[] = lint.data?.violations ?? [];
        const lintAvailable = lint.data?.available ?? false;

        if (!lintAvailable && !jsonMode) {
          console.log(chalk.dim(`\nNote: ansible-lint not found. ${formatInstallInstructions()}`));
        }

        // 10. Auto-fix if violations exist (using FixerAgent)
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

        // 11. Dry-run preview or write files (skip in JSON mode)
        if (options.dryRun && !jsonMode) {
          const proceed = await previewAndConfirm(files, lintViolations);
          if (!proceed) {
            console.log(chalk.yellow('\nGeneration cancelled.'));
            return;
          }
        }

        // 12. Write files (using WriterAgent for parallel I/O)
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

        // 13. Display result or output JSON
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

        // Load existing defaults for comparison and --quick mode
        const existingPlaybookDefaults = config.defaults?.wizard?.playbook;

        let playbookWizardContext: PlaybookWizardContext | undefined;
        let clarifications: Record<string, string> | undefined;

        if (!skipWizard) {
          try {
            const context = await runPlaybookWizard();
            playbookWizardContext = context;
            clarifications = formatPlaybookContextForPrompt(context);

            // CRITICAL: Prompt to save defaults IMMEDIATELY after wizard completes
            // This happens BEFORE generation starts (DFLT-01 requirement)
            await promptToSaveDefaults(
              'playbook',
              playbookWizardContext,
              existingPlaybookDefaults,
              jsonMode,
            );
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\nWizard cancelled.'));
              return;
            }
            throw error;
          }
        } else if (options.quick) {
          // Use saved defaults or fall back to quick mode defaults
          const defaults = existingPlaybookDefaults ?? getQuickModeDefaults('playbook');
          playbookWizardContext = defaults;
          clarifications = formatPlaybookContextForPrompt(defaults);

          if (!jsonMode && !options.quiet) {
            if (existingPlaybookDefaults) {
              console.log(chalk.dim('Using saved defaults (--quick)'));
            } else {
              console.log(chalk.dim('Using default settings (no saved defaults found)'));
            }
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

        // 9. Process lint results
        let lintViolations: LintViolation[] = lint.data?.violations ?? [];
        const lintAvailable = lint.data?.available ?? false;

        if (!lintAvailable && !jsonMode) {
          console.log(chalk.dim(`\nNote: ansible-lint not found. ${formatInstallInstructions()}`));
        }

        // 10. Auto-fix if violations exist (using FixerAgent)
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

        // 11. Dry-run preview or write files (skip in JSON mode)
        if (options.dryRun && !jsonMode) {
          const proceed = await previewAndConfirm(files, lintViolations);
          if (!proceed) {
            console.log(chalk.yellow('\nGeneration cancelled.'));
            return;
          }
        }

        // 12. Write files (using WriterAgent for parallel I/O)
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

        // 13. Display result or output JSON
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

/**
 * Display project structure tree.
 */
function displayProjectTree(
  projectDir: string,
  filesWritten: string[],
  dirsCreated: string[],
  dryRun: boolean,
): void {
  const prefix = dryRun ? chalk.yellow('[DRY RUN] ') : '';
  console.log(`\n${prefix}${chalk.cyan('Project structure:')}`);
  console.log(chalk.dim(`  ${projectDir}/`));

  // Sort files for consistent display
  const sortedFiles = [...filesWritten].sort();

  for (const file of sortedFiles) {
    const parts = file.split('/');
    const indent = '  '.repeat(parts.length);
    const name = parts[parts.length - 1];
    console.log(chalk.dim(`${indent}${name}`));
  }
}

/**
 * New project subcommand.
 */
newCommand
  .command('project <name>')
  .description('Create a new Ansible project directory structure')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('--dry-run', 'Preview without writing files')
  .option('--force', 'Overwrite existing directory without prompting')
  .option('-Q, --quick', 'Skip wizard and use defaults')
  .option('-q, --quiet', 'Suppress progress output')
  .option('--json', 'Output results in JSON format')
  .action(
    async (
      name: string,
      options: {
        output?: string;
        dryRun?: boolean;
        force?: boolean;
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
      }

      try {
        // Load config (no API key required for project creation)
        const config = await loadConfig();
        const outputDir = options.output ?? process.cwd();

        // Sanitize project name
        const projectName = sanitizeRoleName(name);

        if (!jsonMode) {
          console.log(chalk.cyan(`\nCreating project: ${chalk.bold(projectName)}`));
        }

        // Check if project already exists
        if (!options.force && !options.dryRun) {
          const exists = await projectExists(outputDir, projectName);
          if (exists) {
            if (jsonMode) {
              outputJson(
                formatJsonError('EXISTS_ERROR', `Project directory already exists: ${projectName}`),
              );
              process.exit(1);
            }

            const overwrite = await confirm({
              message: `Project "${projectName}" already exists. Overwrite?`,
              default: false,
            });

            if (!overwrite) {
              console.log(chalk.yellow('\nOperation cancelled.'));
              return;
            }
          }
        }

        // Determine wizard skip conditions
        const skipWizard = options.quick || jsonMode || !process.stdin.isTTY;

        // Load existing defaults for comparison and --quick mode
        const existingDefaults = config.defaults?.wizard?.project;

        let wizardContext: ProjectWizardContext;

        if (!skipWizard) {
          try {
            const context = await runProjectWizard();
            wizardContext = context;

            // Prompt to save defaults after wizard
            await promptToSaveDefaults('project', wizardContext, existingDefaults, jsonMode);
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\nWizard cancelled.'));
              return;
            }
            throw error;
          }
        } else if (options.quick) {
          // Use saved defaults or fall back to quick mode defaults
          const defaults = existingDefaults ?? getQuickModeDefaults('project');
          wizardContext = defaults;

          if (!jsonMode && !options.quiet) {
            if (existingDefaults) {
              console.log(chalk.dim('Using saved defaults (--quick)'));
            } else {
              console.log(chalk.dim('Using default settings (no saved defaults found)'));
            }
          }
        } else {
          // Non-interactive without --quick: use quick mode defaults
          wizardContext = getQuickModeDefaults('project');
        }

        // Create phase tracker for progress display
        const tracker = createPhaseTracker(options.quiet ?? false);

        // Generate project structure
        tracker.start('Creating project structure...');
        const result = await createProjectStructure(wizardContext, {
          outputDir,
          name: projectName,
          force: options.force ?? false,
          dryRun: options.dryRun ?? false,
        });
        tracker.succeed('Project structure created');

        // Generate files list for JSON output
        const files = generateProjectFiles(wizardContext, projectName);

        // Output result
        if (jsonMode) {
          const jsonResult = formatJsonSuccess(
            'project',
            projectName,
            result.projectDir,
            files,
            [], // No warnings for project creation
            `ansible-craft new project "${name}"`,
            startTime,
          );
          outputJson(jsonResult);
          return;
        }

        // Display project tree
        displayProjectTree(
          result.projectDir,
          result.filesWritten,
          result.dirsCreated,
          result.dryRun,
        );

        if (result.dryRun) {
          console.log(chalk.yellow('\n[DRY RUN] No files were written.'));
        } else {
          console.log(chalk.green(`\nProject created successfully at: ${result.projectDir}`));
        }

        console.log(chalk.dim('\nNext steps:'));
        console.log(chalk.dim(`  cd ${result.projectDir}`));
        console.log(chalk.dim('  # Update inventory files with your hosts'));
        console.log(chalk.dim('  # Configure variables in group_vars/'));
        console.log(chalk.dim('  ansible-playbook -i production site.yml --check'));
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

        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        process.exit(1);
      }
    },
  );

/**
 * New collection subcommand.
 */
newCommand
  .command('collection <description>')
  .description('Generate a new Ansible collection from description')
  .requiredOption('--namespace <name>', 'Collection namespace (required)')
  .option('--name <name>', 'Collection name (inferred from description if not provided)')
  .option('-o, --output <dir>', 'Output directory (default: current directory)')
  .option('--dry-run', 'Preview without writing files')
  .option('--force', 'Overwrite existing directory without prompting')
  .option('--no-interactive', 'Skip clarifying questions')
  .option('-Q, --quick', 'Skip wizard and use defaults')
  .option('-q, --quiet', 'Suppress progress output')
  .option('--json', 'Output results in JSON format')
  .action(
    async (
      description: string,
      options: {
        namespace: string;
        name?: string;
        output?: string;
        dryRun?: boolean;
        force?: boolean;
        interactive?: boolean;
        quick?: boolean;
        quiet?: boolean;
        json?: boolean;
      },
    ) => {
      try {
        const jsonMode = options.json ?? false;
        const outputDir = options.output ?? process.cwd();

        // Validate namespace (required)
        const namespace = sanitizeCollectionName(options.namespace);
        if (!namespace || !/^[a-z][a-z0-9_]*$/.test(namespace)) {
          throw new Error(
            'Invalid namespace: must start with a letter and contain only lowercase letters, numbers, and underscores',
          );
        }

        // Infer or validate collection name
        const collectionName = options.name
          ? sanitizeCollectionName(options.name)
          : inferCollectionName(description);

        if (!collectionName || !/^[a-z][a-z0-9_]*$/.test(collectionName)) {
          throw new Error(
            'Invalid collection name: must start with a letter and contain only lowercase letters, numbers, and underscores',
          );
        }

        // Check if collection already exists
        if (collectionExists(outputDir, namespace, collectionName) && !options.force) {
          const shouldContinue = await confirm({
            message: `Collection ${namespace}.${collectionName} already exists. Overwrite?`,
            default: false,
          });

          if (!shouldContinue) {
            console.log(chalk.yellow('\nOperation cancelled.'));
            return;
          }
        }

        // Run wizard or use defaults
        let wizardContext: CollectionWizardContext;

        if (options.interactive !== false && !options.quick && !jsonMode) {
          // Interactive mode: run wizard
          try {
            wizardContext = await runCollectionWizard(namespace, collectionName);
          } catch (error) {
            if (error instanceof ExitPromptError) {
              console.log(chalk.yellow('\nWizard cancelled.'));
              return;
            }
            throw error;
          }
        } else {
          // Non-interactive or quick mode: use defaults
          wizardContext = {
            namespace,
            name: collectionName,
            version: '1.0.0',
            description,
            license: ['MIT'],
            authors: ['Author'],
            includeRoles: false,
            roleNames: [],
            includeModules: true,
            includeFilterPlugins: false,
            includeInventoryPlugins: false,
            includeLookupPlugins: false,
            includeTestPlugins: false,
            dependencies: {},
            testingLevel: 'basic',
            includeRuntime: true,
            requiresAnsible: '>=2.9',
            includeDocs: true,
            includeChangelog: true,
            custom: {},
          };

          if (!jsonMode && !options.quiet) {
            console.log(chalk.dim('Using default settings'));
          }
        }

        // Create phase tracker for progress display
        const tracker = createPhaseTracker(options.quiet ?? false);

        // Generate plan
        tracker.start('Planning collection structure...');
        const plan = await generateCollectionPlan(wizardContext);
        tracker.succeed('Collection plan created');

        // Display plan preview
        if (!jsonMode && !options.quiet) {
          console.log(chalk.cyan.bold('\nCollection Plan:'));
          console.log(chalk.dim(`FQCN: ${plan.namespace}.${plan.name}`));
          console.log(chalk.dim(`Version: ${plan.version}`));
          console.log(chalk.dim(`Description: ${plan.description}`));
          console.log(chalk.dim(`Files: ${plan.fileCount}`));
          console.log(chalk.dim(`Directories: ${plan.directories.length}`));
        }

        // Generate files
        tracker.start('Generating collection files...');
        const files = await generateCollectionFiles(wizardContext);
        tracker.succeed('Collection files generated');

        // Validate files
        tracker.start('Validating collection files...');
        const validationResult = await validateCollectionFiles(files);
        tracker.succeed('Validation complete');

        if (!validationResult.valid) {
          if (jsonMode) {
            outputJson(
              formatJsonError(
                'VALIDATION_ERROR',
                'Collection validation failed',
                validationResult.errors.map((e) => e.message),
              ),
            );
          } else {
            console.error(chalk.red('\n✗ Validation failed:'));
            for (const error of validationResult.errors) {
              console.error(chalk.red(`  - ${error.file}: ${error.message}`));
            }
          }
          process.exit(1);
        }

        // Display validation warnings
        if (validationResult.warnings.length > 0 && !jsonMode && !options.quiet) {
          console.log(chalk.yellow('\nWarnings:'));
          for (const warning of validationResult.warnings) {
            console.log(chalk.yellow(`  - ${warning.file}: ${warning.message}`));
          }
        }

        // Write files (unless dry-run)
        if (!options.dryRun) {
          tracker.start('Writing collection files...');
          const { createCollectionStructure } = await import(
            '../../generation/collection/structure.js'
          );
          const { writeFile, mkdir } = await import('node:fs/promises');
          const { join } = await import('node:path');

          // Create directory structure
          const structureResult = await createCollectionStructure({
            namespace,
            name: collectionName,
            outputDir,
            pluginDirs: [],
            dryRun: false,
          });

          // Write all generated files
          for (const file of files) {
            const filePath = join(structureResult.collectionDir, file.path);
            const fileDir = join(filePath, '..');
            await mkdir(fileDir, { recursive: true });
            await writeFile(filePath, file.content);
          }

          tracker.succeed('Collection files written');

          // Success output
          if (jsonMode) {
            outputJson(
              formatJsonSuccess(
                'collection',
                `${namespace}.${collectionName}`,
                structureResult.collectionDir,
                files,
                validationResult.warnings.map((w) => w.message),
                `ansible-craft new collection "${description}" --namespace ${namespace}`,
              ),
            );
          } else {
            console.log(chalk.green.bold('\n✓ Collection created successfully!'));
            console.log(chalk.dim(`Location: ${structureResult.collectionDir}`));
            console.log(chalk.dim(`FQCN: ${namespace}.${collectionName}`));
            console.log(chalk.dim(`\nNext steps:`));
            console.log(chalk.dim(`  cd ${structureResult.collectionDir}`));
            console.log(chalk.dim(`  # Test locally (no installation needed):`));
            console.log(chalk.dim(`  ansible-playbook playbooks/test.yml`));
            console.log(chalk.dim(`  # Or build for distribution:`));
            console.log(chalk.dim(`  ansible-galaxy collection build`));
            console.log(
              chalk.dim(
                `  ansible-galaxy collection install ${namespace}-${collectionName}-${wizardContext.version}.tar.gz`,
              ),
            );
          }
        } else {
          // Dry-run mode: just display what would be created
          if (jsonMode) {
            outputJson({
              status: 'success',
              dry_run: true,
              collection: {
                namespace,
                name: collectionName,
                version: wizardContext.version,
              },
              files: files.map((f) => ({ path: f.path, size: f.content.length })),
            });
          } else {
            console.log(chalk.cyan.bold('\nDry-run mode - no files written'));
            console.log(chalk.dim('Files that would be created:'));
            for (const file of files) {
              console.log(chalk.dim(`  - ${file.path} (${file.content.length} bytes)`));
            }
          }
        }
      } catch (error) {
        if (options.json) {
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

        console.error(
          chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`),
        );
        process.exit(1);
      }
    },
  );
