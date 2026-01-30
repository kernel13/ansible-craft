/**
 * Interactive role wizard for collecting user preferences.
 *
 * Provides two modes:
 * 1. Exploration-based (default): Research-driven conversational exploration
 * 2. Classic: Traditional 11-step guided experience
 */

import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';
import {
  promptAnsibleVersion,
  promptDependencies,
  promptDirectories,
  promptForFeatures,
  promptForPackages,
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
import type { ResearchFindings } from '../research/index.js';
import {
  runExplorationWorkflow,
  type ExplorationOptions,
} from '../exploration/index.js';

/** Base number of wizard steps (without research) */
const BASE_STEPS = 11;

/**
 * Calculate total steps including research prompts.
 */
function calculateTotalSteps(hasResearch: boolean): number {
  return hasResearch ? BASE_STEPS + 2 : BASE_STEPS; // +2 for features and packages
}

/**
 * Options for role wizard.
 */
export interface RoleWizardOptions {
  /** Use classic linear wizard instead of exploration mode */
  classic?: boolean;
  /** Role description (for exploration mode) */
  roleDescription?: string;
  /** Sanitized role name (for exploration mode) */
  roleName?: string;
  /** Exploration-specific options */
  exploration?: ExplorationOptions;
}

/**
 * Run the interactive role wizard to collect user preferences.
 *
 * By default, uses the exploration-based flow which:
 * 1. Shows overview of research findings
 * 2. Lets user explore interesting topics
 * 3. Applies smart defaults to unexplored topics
 * 4. Allows natural language modifications
 *
 * Use `options.classic = true` for the traditional 11-step wizard.
 *
 * @param researchFindings - Optional research findings to inform prompts
 * @param options - Wizard options
 * @returns Validated RoleWizardContext ready for AI generation
 * @throws {ExitPromptError} If user cancels with Ctrl+C
 *
 * @example
 * ```typescript
 * import { ExitPromptError } from '@inquirer/prompts';
 * import { runRoleWizard } from './role-wizard.js';
 *
 * try {
 *   // Exploration mode (default)
 *   const context = await runRoleWizard(researchFindings, {
 *     roleDescription: 'nginx with SSL',
 *     roleName: 'nginx',
 *   });
 *
 *   // Or classic mode
 *   const context = await runRoleWizard(researchFindings, { classic: true });
 * } catch (error) {
 *   if (error instanceof ExitPromptError) {
 *     console.log('Wizard cancelled');
 *   }
 * }
 * ```
 */
export async function runRoleWizard(
  researchFindings?: ResearchFindings,
  options: RoleWizardOptions = {},
): Promise<RoleWizardContext> {
  // Use exploration mode if research is available and not in classic mode
  const hasResearch =
    researchFindings &&
    (researchFindings.features.length > 0 ||
      researchFindings.packages.length > 0 ||
      researchFindings.bestPractices.length > 0);

  if (!options.classic && hasResearch && options.roleDescription && options.roleName) {
    return runExplorationWizard(
      options.roleDescription,
      options.roleName,
      researchFindings,
      options.exploration,
    );
  }

  // Fall back to classic wizard
  return runClassicWizard(researchFindings);
}

/**
 * Run the exploration-based wizard.
 */
async function runExplorationWizard(
  roleDescription: string,
  roleName: string,
  findings: ResearchFindings,
  options?: ExplorationOptions,
): Promise<RoleWizardContext> {
  console.log(chalk.cyan.bold('\nRole Generation - Exploration Mode'));
  console.log('Explore research findings and configure your role interactively.');
  console.log(chalk.dim('Type topic names to explore, or "continue" for smart defaults.\n'));

  try {
    const result = await runExplorationWorkflow(roleDescription, roleName, findings, options);

    // Validate and return
    return roleWizardSchema.parse(result.wizardContext);
  } catch (error) {
    // If exploration fails, offer to fall back to classic
    if (error instanceof Error && error.message !== 'Generation cancelled by user') {
      console.log(chalk.yellow('\nExploration mode encountered an issue.'));
      const fallback = await confirm({
        message: 'Would you like to use the classic wizard instead?',
        default: true,
      });

      if (fallback) {
        return runClassicWizard(findings);
      }
    }
    throw error;
  }
}

/**
 * Run the classic linear wizard.
 *
 * Guides the user through an 11+ step process:
 * 1. Select role directories (tasks required, others optional)
 * 2. Select features from research findings (if available)
 * 3. Select package from research findings (if available)
 * 4. Select target platforms (Ubuntu, RHEL, etc. or Generic)
 * 5. Configure Ansible version requirements
 * 6. Configure variable strategy
 * 7. Configure privilege escalation
 * 8. Select handlers needed (restart, reload, enable, custom)
 * 9. Configure tags strategy
 * 10. Configure idempotency settings
 * 11. Configure role dependencies
 * 12. Configure Molecule testing
 * 13. Complete - show summary
 */
async function runClassicWizard(researchFindings?: ResearchFindings): Promise<RoleWizardContext> {
  // Display wizard intro
  console.log(chalk.cyan.bold('\nRole Generation Wizard'));
  console.log('Customize your role structure, platforms, and configuration.');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel.\n'));

  // Display topics overview
  showTopicsOverview();

  // Calculate total steps based on whether research is available
  const hasResearch =
    researchFindings &&
    (researchFindings.features.length > 0 || researchFindings.packages.length > 0);
  const totalSteps = calculateTotalSteps(!!hasResearch);
  let currentStep = 1;

  // Step 1: Role Structure
  showStepHeader(currentStep++, totalSteps, 'Role Structure');
  const structure = await promptDirectories();

  // Optional: Features from research
  let selectedFeatures: string[] = [];
  if (researchFindings && researchFindings.features.length > 0) {
    showStepHeader(currentStep++, totalSteps, 'Feature Selection');
    selectedFeatures = await promptForFeatures(researchFindings.features);
  }

  // Optional: Packages from research
  let selectedPackage: string | undefined;
  if (researchFindings && researchFindings.packages.length > 0) {
    showStepHeader(currentStep++, totalSteps, 'Package Selection');
    selectedPackage = await promptForPackages(researchFindings.packages);
  }

  // Step N: Target Platforms
  showStepHeader(currentStep++, totalSteps, 'Target Platforms');
  const platforms = await promptPlatforms();

  // Step N: Ansible Version
  showStepHeader(currentStep++, totalSteps, 'Ansible Version');
  const ansibleVersion = await promptAnsibleVersion();

  // Step N: Variable Strategy
  showStepHeader(currentStep++, totalSteps, 'Variable Strategy');
  const variableStrategy = await promptVariableStrategy();

  // Step N: Privilege Escalation
  showStepHeader(currentStep++, totalSteps, 'Privilege Escalation');
  const privilegeEscalation = await promptPrivilegeEscalation();

  // Step N: Service Handlers
  showStepHeader(currentStep++, totalSteps, 'Service Handlers');
  const handlers = await promptHandlers();

  // Step N: Tags Configuration
  showStepHeader(currentStep++, totalSteps, 'Tags Configuration');
  const tags = await promptTags();

  // Step N: Idempotency Settings
  showStepHeader(currentStep++, totalSteps, 'Idempotency Settings');
  const idempotency = await promptIdempotency();

  // Step N: Role Dependencies
  showStepHeader(currentStep++, totalSteps, 'Dependencies');
  const dependencies = await promptDependencies();

  // Step N: Molecule Testing
  showStepHeader(currentStep++, totalSteps, 'Molecule Testing');
  const molecule = await promptMolecule(platforms);

  // Final Step: Completion
  showStepHeader(currentStep, totalSteps, 'Configuration Complete');
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
    selectedFeatures: selectedFeatures.length > 0 ? selectedFeatures : undefined,
    selectedPackages: selectedPackage ? [selectedPackage] : undefined,
    custom: {},
  };

  // Validate with Zod schema before returning
  return roleWizardSchema.parse(context);
}
