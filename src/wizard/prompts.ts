/**
 * Prompt utility functions for the role wizard.
 *
 * Provides individual prompt functions for collecting user preferences
 * during interactive role generation.
 */

import { Separator, checkbox, confirm, input, select } from '@inquirer/prompts';
import chalk from 'chalk';
import type {
  AnsibleVersion,
  AnsibleVersionConfig,
  BecomeRequirement,
  DependenciesConfig,
  IdempotencyConfig,
  MoleculeConfig,
  MoleculeDriver,
  MoleculeScenario,
  PrivilegeEscalationConfig,
  RoleHandler,
  RolePlatform,
  RoleStructureDirectory,
  TagStrategy,
  TagsConfig,
  VariableNaming,
  VariableStrategyConfig,
} from './types.js';

/**
 * Display a styled step header with progress indication.
 *
 * @param current - Current step number (1-based)
 * @param total - Total number of steps
 * @param title - Step title to display
 */
export function showStepHeader(current: number, total: number, title: string): void {
  const percentage = Math.round((current / total) * 100);
  const separator = '='.repeat(60);

  console.log(chalk.cyan(`\n${separator}`));
  console.log(chalk.cyan.bold(`[${current}/${total}] ${title} (${percentage}% complete)`));
  console.log(chalk.cyan(`${separator}\n`));
}

/**
 * Prompt user to select role directories to generate.
 *
 * The `tasks` directory is pre-checked and required (cannot be unchecked).
 * All other directories are optional and unchecked by default.
 *
 * @returns Array of selected directory names
 */
export async function promptDirectories(): Promise<RoleStructureDirectory[]> {
  // Note: disabled items are excluded from checkbox answer array,
  // so we manually include 'tasks' in the result
  const selected = (await checkbox({
    message: 'Select role directories to generate:',
    choices: [
      {
        name: 'tasks - main role tasks (required)',
        value: 'tasks' as RoleStructureDirectory,
        checked: true,
        disabled: true,
      },
      {
        name: 'handlers - service restart/reload actions',
        value: 'handlers' as RoleStructureDirectory,
      },
      {
        name: 'templates - Jinja2 config templates',
        value: 'templates' as RoleStructureDirectory,
      },
      { name: 'files - static files to copy', value: 'files' as RoleStructureDirectory },
      { name: 'vars - role variables', value: 'vars' as RoleStructureDirectory },
      { name: 'defaults - default variable values', value: 'defaults' as RoleStructureDirectory },
      { name: 'meta - role metadata and dependencies', value: 'meta' as RoleStructureDirectory },
    ],
    pageSize: 10,
    loop: true,
  })) as RoleStructureDirectory[];

  // Always include 'tasks' since it's required (disabled items excluded from answer)
  // Filter to avoid duplicates in case behavior changes
  const withoutTasks = selected.filter((dir) => dir !== 'tasks');
  return ['tasks', ...withoutTasks];
}

/**
 * Prompt user to select target platforms for the role.
 *
 * At least one platform must be selected. The `Generic` option is
 * mutually exclusive with specific platforms - selecting Generic
 * indicates a platform-agnostic role.
 *
 * @returns Array of selected platform names
 */
export async function promptPlatforms(): Promise<RolePlatform[]> {
  return (await checkbox({
    message: 'Select target platforms (or Generic for platform-agnostic):',
    choices: [
      { name: 'Ubuntu', value: 'Ubuntu' as RolePlatform },
      { name: 'Debian', value: 'Debian' as RolePlatform },
      { name: 'RHEL/CentOS', value: 'RHEL' as RolePlatform },
      { name: 'Windows', value: 'Windows' as RolePlatform },
      new Separator(),
      { name: 'Generic - no platform-specific tasks', value: 'Generic' as RolePlatform },
    ],
    pageSize: 8,
    loop: true,
    validate: (answer: readonly RolePlatform[]) => {
      if (answer.length === 0) {
        return 'Select at least one platform';
      }

      // Generic is mutually exclusive with specific platforms
      if (answer.includes('Generic') && answer.length > 1) {
        return 'Generic cannot be combined with specific platforms';
      }

      return true;
    },
  })) as RolePlatform[];
}

/**
 * Prompt user to select handlers for service management.
 *
 * Handlers are optional - the user may select none if the role
 * does not need service management functionality.
 *
 * @returns Array of selected handler types
 */
export async function promptHandlers(): Promise<RoleHandler[]> {
  return (await checkbox({
    message: 'Select handlers needed for service management:',
    choices: [
      { name: 'restart - restart service', value: 'restart' as RoleHandler },
      { name: 'reload - reload service configuration', value: 'reload' as RoleHandler },
      { name: 'enable - enable service at boot', value: 'enable' as RoleHandler },
      { name: 'custom - custom handler actions', value: 'custom' as RoleHandler },
    ],
    pageSize: 6,
    loop: true,
  })) as RoleHandler[];
}

/**
 * Display topics overview before wizard questions begin.
 */
export function showTopicsOverview(): void {
  const boxWidth = 61;
  const topBorder = `┌${'─'.repeat(boxWidth - 2)}┐`;
  const bottomBorder = `└${'─'.repeat(boxWidth - 2)}┘`;
  const emptyLine = `│${' '.repeat(boxWidth - 2)}│`;

  console.log(chalk.cyan(topBorder));
  console.log(
    chalk.cyan('│') +
      chalk.white.bold('  Topics to configure:') +
      ' '.repeat(boxWidth - 25) +
      chalk.cyan('│'),
  );
  console.log(chalk.cyan(emptyLine));
  console.log(
    chalk.cyan('│') +
      chalk.dim('   1. Role Structure       - directories & organization   ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   2. Target Platforms     - OS compatibility             ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   3. Ansible Version      - minimum version requirements ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   4. Variable Strategy    - defaults & vars approach     ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   5. Privilege Escalation - become/sudo requirements     ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   6. Service Handlers     - restart, reload, enable      ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   7. Tags Configuration   - task tagging strategy        ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   8. Idempotency          - check mode & conditions      ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('   9. Dependencies         - role requirements            ') +
      chalk.cyan('│'),
  );
  console.log(
    chalk.cyan('│') +
      chalk.dim('  10. Molecule Testing     - automated testing setup      ') +
      chalk.cyan('│'),
  );
  console.log(chalk.cyan(bottomBorder));
}

/**
 * Prompt user to configure Ansible version requirements.
 *
 * @returns Ansible version configuration
 */
export async function promptAnsibleVersion(): Promise<AnsibleVersionConfig> {
  const minimum = (await select({
    message: 'Minimum Ansible version required:',
    choices: [
      { name: '2.17 (latest)', value: '2.17' as AnsibleVersion },
      { name: '2.16', value: '2.16' as AnsibleVersion },
      { name: '2.15', value: '2.15' as AnsibleVersion },
      { name: '2.14', value: '2.14' as AnsibleVersion },
      { name: '2.13', value: '2.13' as AnsibleVersion },
      { name: '2.12', value: '2.12' as AnsibleVersion },
      { name: '2.11', value: '2.11' as AnsibleVersion },
      { name: '2.10', value: '2.10' as AnsibleVersion },
      { name: '2.9 (legacy)', value: '2.9' as AnsibleVersion },
    ],
    default: '2.14',
  })) as AnsibleVersion;

  const includeVersionCheck = await confirm({
    message: 'Include Ansible version check task?',
    default: false,
  });

  return { minimum, includeVersionCheck };
}

/**
 * Prompt user to configure variable strategy.
 *
 * @returns Variable strategy configuration
 */
export async function promptVariableStrategy(): Promise<VariableStrategyConfig> {
  const includeDefaults = await confirm({
    message: 'Include defaults directory for overridable variables?',
    default: true,
  });

  const includeVars = await confirm({
    message: 'Include vars directory for internal variables?',
    default: false,
  });

  const naming = (await select({
    message: 'Variable naming convention:',
    choices: [
      {
        name: 'prefixed - prefix with role name (e.g., nginx_port)',
        value: 'prefixed' as VariableNaming,
      },
      {
        name: 'flat - no prefix (e.g., port)',
        value: 'flat' as VariableNaming,
      },
    ],
    default: 'prefixed',
  })) as VariableNaming;

  return { includeDefaults, includeVars, naming };
}

/**
 * Prompt user to configure privilege escalation requirements.
 *
 * @returns Privilege escalation configuration
 */
export async function promptPrivilegeEscalation(): Promise<PrivilegeEscalationConfig> {
  const required = (await select({
    message: 'Does this role require privilege escalation (become/sudo)?',
    choices: [
      { name: 'yes - always requires elevated privileges', value: 'yes' as BecomeRequirement },
      { name: 'no - runs as regular user', value: 'no' as BecomeRequirement },
      {
        name: 'sometimes - only certain tasks need elevation',
        value: 'sometimes' as BecomeRequirement,
      },
    ],
    default: 'yes',
  })) as BecomeRequirement;

  let becomeUser: string | undefined;
  if (required === 'yes' || required === 'sometimes') {
    const userChoice = await select({
      message: 'Default become user:',
      choices: [
        { name: 'root (default)', value: 'root' },
        { name: 'custom user', value: 'custom' },
      ],
      default: 'root',
    });

    if (userChoice === 'custom') {
      becomeUser = await input({
        message: 'Enter become user:',
        validate: (value) => (value.trim() ? true : 'User cannot be empty'),
      });
    } else {
      becomeUser = 'root';
    }
  }

  return { required, becomeUser };
}

/**
 * Prompt user to configure tag strategy.
 *
 * @param roleDescription - Role description for AI tag suggestions
 * @returns Tags configuration
 */
export async function promptTags(roleDescription?: string): Promise<TagsConfig> {
  const strategy = (await select({
    message: 'Task tagging strategy:',
    choices: [
      { name: 'none - no tags on tasks', value: 'none' as TagStrategy },
      { name: 'per-task - unique tag per task', value: 'per-task' as TagStrategy },
      {
        name: 'grouped - logical tag groups (install, config, service)',
        value: 'grouped' as TagStrategy,
      },
      { name: 'always - always tag with critical tags', value: 'always' as TagStrategy },
    ],
    default: 'grouped',
  })) as TagStrategy;

  let groups: string[] | undefined;
  if (strategy === 'grouped') {
    const groupsInput = await input({
      message: 'Enter tag groups (comma-separated, e.g., install,config,service):',
      default: 'install,config,service',
    });
    groups = groupsInput
      .split(',')
      .map((g) => g.trim())
      .filter((g) => g.length > 0);
  }

  return { strategy, groups };
}

/**
 * Prompt user to configure idempotency settings.
 *
 * @returns Idempotency configuration
 */
export async function promptIdempotency(): Promise<IdempotencyConfig> {
  const supportCheckMode = await confirm({
    message: 'Support check mode (--check)?',
    default: true,
  });

  const includeChangedWhen = await confirm({
    message: 'Include changed_when conditions?',
    default: true,
  });

  const includeFailedWhen = await confirm({
    message: 'Include failed_when conditions?',
    default: false,
  });

  return { supportCheckMode, includeChangedWhen, includeFailedWhen };
}

/**
 * Prompt user to configure role dependencies.
 *
 * @returns Dependencies configuration
 */
export async function promptDependencies(): Promise<DependenciesConfig> {
  const includeMeta = await confirm({
    message: 'Include meta/main.yml with dependencies?',
    default: true,
  });

  let roles: string[] = [];
  if (includeMeta) {
    const rolesInput = await input({
      message: 'Enter role dependencies (comma-separated, or leave empty):',
      default: '',
    });
    if (rolesInput.trim()) {
      roles = rolesInput
        .split(',')
        .map((r) => r.trim())
        .filter((r) => r.length > 0);
    }
  }

  return { includeMeta, roles };
}

/**
 * Prompt user to configure Molecule testing.
 *
 * @param rolePlatforms - Platforms selected in step 2 for platform options
 * @returns Molecule configuration
 */
export async function promptMolecule(rolePlatforms: RolePlatform[]): Promise<MoleculeConfig> {
  const enabled = await confirm({
    message: 'Include Molecule tests?',
    default: true,
  });

  if (!enabled) {
    return { enabled: false };
  }

  // Driver selection (no default, user must choose)
  const driver = (await select({
    message: 'Select Molecule test driver:',
    choices: [
      { name: 'docker - container-based testing (most common)', value: 'docker' as MoleculeDriver },
      { name: 'podman - rootless container testing', value: 'podman' as MoleculeDriver },
      { name: 'vagrant - VM-based testing', value: 'vagrant' as MoleculeDriver },
      { name: 'delegated - custom/external testing', value: 'delegated' as MoleculeDriver },
    ],
  })) as MoleculeDriver;

  // Platform selection based on role platforms
  const platformChoices = rolePlatforms
    .filter((p) => p !== 'Generic')
    .map((p) => ({
      name: p,
      value: p,
      checked: true,
    }));

  let platforms: RolePlatform[] = [];
  if (platformChoices.length > 0) {
    platforms = (await checkbox({
      message: 'Select platforms for Molecule testing:',
      choices: platformChoices,
      pageSize: 8,
    })) as RolePlatform[];
  }

  // Scenario selection
  const scenarios = (await checkbox({
    message: 'Select Molecule test scenarios:',
    choices: [
      {
        name: 'default - standard convergence test',
        value: 'default' as MoleculeScenario,
        checked: true,
      },
      { name: 'side_effect - test side effects', value: 'side_effect' as MoleculeScenario },
      {
        name: 'idempotence - verify idempotent behavior',
        value: 'idempotence' as MoleculeScenario,
        checked: true,
      },
    ],
    pageSize: 5,
    validate: (answer: readonly MoleculeScenario[]) => {
      if (answer.length === 0) {
        return 'Select at least one scenario';
      }
      return true;
    },
  })) as MoleculeScenario[];

  return { enabled, driver, platforms, scenarios };
}
