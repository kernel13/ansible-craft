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
  MoleculePlatformConfig,
  MoleculeScenario,
  MoleculeTestLevel,
  MoleculeTestStage,
  MoleculeVerifier,
  PrivilegeEscalationConfig,
  RoleHandler,
  RolePlatform,
  RoleStructureDirectory,
  TagStrategy,
  TagsConfig,
  VagrantProvider,
  VagrantResourcePreset,
  VariableNaming,
  VariableStrategyConfig,
} from './types.js';

// ============================================
// Molecule Default Constants
// ============================================

/**
 * Pre-built Ansible test images by platform.
 */
export const ANSIBLE_TEST_IMAGES: Record<RolePlatform, string> = {
  Ubuntu: 'geerlingguy/docker-ubuntu2204-ansible',
  Debian: 'geerlingguy/docker-debian12-ansible',
  RHEL: 'geerlingguy/docker-rockylinux9-ansible',
  Windows: 'mcr.microsoft.com/windows/servercore:ltsc2022',
  Generic: 'geerlingguy/docker-ubuntu2204-ansible',
};

/**
 * Standard Vagrant boxes by platform.
 */
export const VAGRANT_BOXES: Record<RolePlatform, string> = {
  Ubuntu: 'generic/ubuntu2204',
  Debian: 'generic/debian12',
  RHEL: 'generic/rocky9',
  Windows: 'gusztavvargadr/windows-server-2022-standard',
  Generic: 'generic/ubuntu2204',
};

/**
 * Vagrant resource presets.
 */
export const VAGRANT_RESOURCES: Record<VagrantResourcePreset, { memory: number; cpus: number }> = {
  minimal: { memory: 512, cpus: 1 },
  standard: { memory: 1024, cpus: 2 },
  powerful: { memory: 2048, cpus: 4 },
};

/**
 * Default test sequence for basic mode.
 */
const BASIC_TEST_SEQUENCE: MoleculeTestStage[] = [
  'create',
  'converge',
  'idempotence',
  'verify',
  'destroy',
];

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
 * Prompt user for Docker-specific advanced options.
 *
 * @param rolePlatforms - Platforms selected in step 2
 * @returns Docker-specific config options
 */
async function promptMoleculeDocker(
  rolePlatforms: RolePlatform[],
): Promise<Partial<MoleculeConfig>> {
  const useAnsibleImages = await confirm({
    message: 'Use pre-built Ansible test images? (geerlingguy/*-ansible)',
    default: true,
  });

  let platformConfigs: MoleculePlatformConfig[] | undefined;
  if (!useAnsibleImages) {
    platformConfigs = [];
    for (const platform of rolePlatforms.filter((p) => p !== 'Generic')) {
      const image = await input({
        message: `Enter Docker image for ${platform}:`,
        default: ANSIBLE_TEST_IMAGES[platform],
        validate: (value) => (value.trim() ? true : 'Image cannot be empty'),
      });
      platformConfigs.push({ platform, image });
    }
  }

  const privileged = await confirm({
    message: 'Enable privileged mode for systemd support?',
    default: false,
  });

  return { useAnsibleImages, platformConfigs, privileged };
}

/**
 * Prompt user for Podman-specific advanced options.
 *
 * @param rolePlatforms - Platforms selected in step 2
 * @returns Podman-specific config options
 */
async function promptMoleculePodman(
  rolePlatforms: RolePlatform[],
): Promise<Partial<MoleculeConfig>> {
  // Podman shares Docker's image options
  const dockerConfig = await promptMoleculeDocker(rolePlatforms);

  const rootless = await confirm({
    message: 'Run in rootless mode?',
    default: true,
  });

  return { ...dockerConfig, rootless };
}

/**
 * Prompt user for Vagrant-specific advanced options.
 *
 * @param rolePlatforms - Platforms selected in step 2
 * @returns Vagrant-specific config options
 */
async function promptMoleculeVagrant(
  rolePlatforms: RolePlatform[],
): Promise<Partial<MoleculeConfig>> {
  const vagrantProvider = (await select({
    message: 'Vagrant provider:',
    choices: [
      { name: 'virtualbox (Recommended)', value: 'virtualbox' as VagrantProvider },
      { name: 'libvirt - KVM/QEMU', value: 'libvirt' as VagrantProvider },
      { name: 'parallels - macOS', value: 'parallels' as VagrantProvider },
    ],
    default: 'virtualbox',
  })) as VagrantProvider;

  const useStandardBoxes = await confirm({
    message: 'Use standard Vagrant boxes? (generic/{distro})',
    default: true,
  });

  let platformConfigs: MoleculePlatformConfig[] | undefined;
  if (!useStandardBoxes) {
    platformConfigs = [];
    for (const platform of rolePlatforms.filter((p) => p !== 'Generic')) {
      const box = await input({
        message: `Enter Vagrant box for ${platform}:`,
        default: VAGRANT_BOXES[platform],
        validate: (value) => (value.trim() ? true : 'Box cannot be empty'),
      });
      platformConfigs.push({ platform, image: box });
    }
  }

  const resourcePreset = (await select({
    message: 'VM resources:',
    choices: [
      { name: 'minimal - 512MB RAM, 1 CPU', value: 'minimal' as VagrantResourcePreset },
      {
        name: 'standard - 1GB RAM, 2 CPUs (Recommended)',
        value: 'standard' as VagrantResourcePreset,
      },
      { name: 'powerful - 2GB RAM, 4 CPUs', value: 'powerful' as VagrantResourcePreset },
    ],
    default: 'standard',
  })) as VagrantResourcePreset;

  const resources = VAGRANT_RESOURCES[resourcePreset];

  return {
    vagrantProvider,
    platformConfigs,
    vagrantMemory: resources.memory,
    vagrantCpus: resources.cpus,
    useAnsibleImages: useStandardBoxes,
  };
}

/**
 * Prompt user for delegated driver advanced options.
 *
 * @returns Delegated-specific config options
 */
async function promptMoleculeDelegated(): Promise<Partial<MoleculeConfig>> {
  const managedChoice = (await select({
    message: 'Instance management:',
    choices: [
      { name: 'external - instances managed outside Molecule (CI/CD)', value: 'external' },
      { name: 'managed - Molecule manages instance lifecycle', value: 'managed' },
    ],
    default: 'external',
  })) as 'external' | 'managed';

  return { delegatedManaged: managedChoice === 'managed' };
}

/**
 * Prompt user for common advanced Molecule options (all drivers).
 *
 * @returns Common advanced config options
 */
async function promptMoleculeAdvancedCommon(): Promise<Partial<MoleculeConfig>> {
  // Test sequence selection
  const testSequence = (await checkbox({
    message: 'Select test sequence stages:',
    choices: [
      { name: 'dependency - Install role dependencies', value: 'dependency' as MoleculeTestStage },
      { name: 'cleanup - Pre-test cleanup', value: 'cleanup' as MoleculeTestStage },
      { name: 'destroy - Remove existing instances', value: 'destroy' as MoleculeTestStage },
      {
        name: 'create - Instantiate test instances',
        value: 'create' as MoleculeTestStage,
        checked: true,
      },
      { name: 'prepare - Pre-convergence setup', value: 'prepare' as MoleculeTestStage },
      {
        name: 'converge - Run the role (required)',
        value: 'converge' as MoleculeTestStage,
        checked: true,
        disabled: true,
      },
      {
        name: 'idempotence - Verify no changes on re-run',
        value: 'idempotence' as MoleculeTestStage,
        checked: true,
      },
      { name: 'side_effect - Test side effects', value: 'side_effect' as MoleculeTestStage },
      {
        name: 'verify - Run verification tests',
        value: 'verify' as MoleculeTestStage,
        checked: true,
      },
    ],
    pageSize: 12,
  })) as MoleculeTestStage[];

  // Always include converge (it's required and disabled in UI)
  const finalSequence: MoleculeTestStage[] = testSequence.includes('converge')
    ? testSequence
    : [
        ...testSequence.slice(0, testSequence.indexOf('idempotence')),
        'converge' as MoleculeTestStage,
        ...testSequence.slice(testSequence.indexOf('idempotence')),
      ];

  // Verifier selection
  const verifier = (await select({
    message: 'Verifier type:',
    choices: [
      {
        name: 'ansible - verify.yml playbook (Recommended)',
        value: 'ansible' as MoleculeVerifier,
      },
      {
        name: 'testinfra - Python tests with pytest',
        value: 'testinfra' as MoleculeVerifier,
      },
    ],
    default: 'ansible',
  })) as MoleculeVerifier;

  return { testSequence: finalSequence, verifier };
}

/**
 * Build basic mode defaults for a driver.
 *
 * @param driver - Selected driver
 * @param rolePlatforms - Platforms selected in step 2
 * @returns Basic mode config
 */
function buildBasicModeDefaults(
  driver: MoleculeDriver,
  rolePlatforms: RolePlatform[],
): Partial<MoleculeConfig> {
  const platforms = rolePlatforms.filter((p) => p !== 'Generic');
  const platformConfigs: MoleculePlatformConfig[] = platforms.map((p) => ({
    platform: p,
    image: driver === 'vagrant' ? VAGRANT_BOXES[p] : ANSIBLE_TEST_IMAGES[p],
  }));

  const base: Partial<MoleculeConfig> = {
    useAnsibleImages: true,
    platformConfigs: platformConfigs.length > 0 ? platformConfigs : undefined,
    testSequence: BASIC_TEST_SEQUENCE,
    verifier: 'ansible',
  };

  switch (driver) {
    case 'docker':
      return { ...base, privileged: false };
    case 'podman':
      return { ...base, privileged: false, rootless: true };
    case 'vagrant':
      return {
        ...base,
        vagrantProvider: 'virtualbox',
        vagrantMemory: VAGRANT_RESOURCES.standard.memory,
        vagrantCpus: VAGRANT_RESOURCES.standard.cpus,
      };
    case 'delegated':
      return { ...base, delegatedManaged: false };
  }
}

/**
 * Derive backward-compatible scenarios from test sequence.
 *
 * @param testSequence - Selected test stages
 * @returns Derived MoleculeScenario array
 */
function deriveScenarios(testSequence: MoleculeTestStage[]): MoleculeScenario[] {
  const scenarios: MoleculeScenario[] = ['default'];
  if (testSequence.includes('idempotence')) {
    scenarios.push('idempotence');
  }
  if (testSequence.includes('side_effect')) {
    scenarios.push('side_effect');
  }
  return scenarios;
}

/**
 * Prompt user to configure Molecule testing with tiered levels.
 *
 * Flow:
 * - none: disabled immediately
 * - basic: driver selection only, apply sensible defaults
 * - advanced: driver selection + driver-specific + common questions
 *
 * @param rolePlatforms - Platforms selected in step 2 for platform options
 * @returns Molecule configuration
 */
export async function promptMolecule(rolePlatforms: RolePlatform[]): Promise<MoleculeConfig> {
  // Q1: Testing level
  const level = (await select({
    message: 'Molecule testing level:',
    choices: [
      {
        name: 'basic - quick setup with sensible defaults (Recommended)',
        value: 'basic' as MoleculeTestLevel,
      },
      {
        name: 'advanced - full control over driver, images, and test sequence',
        value: 'advanced' as MoleculeTestLevel,
      },
      { name: 'none - skip Molecule tests', value: 'none' as MoleculeTestLevel },
    ],
    default: 'basic',
  })) as MoleculeTestLevel;

  // Handle 'none' immediately
  if (level === 'none') {
    return { enabled: false, level: 'none' };
  }

  // Q2: Driver selection (all modes)
  const driver = (await select({
    message: 'Select Molecule test driver:',
    choices: [
      { name: 'docker - container-based testing (most common)', value: 'docker' as MoleculeDriver },
      { name: 'podman - rootless container testing', value: 'podman' as MoleculeDriver },
      { name: 'vagrant - VM-based testing (full OS)', value: 'vagrant' as MoleculeDriver },
      { name: 'delegated - custom/external testing (CI/CD)', value: 'delegated' as MoleculeDriver },
    ],
  })) as MoleculeDriver;

  // Basic mode: apply defaults and return
  if (level === 'basic') {
    const defaults = buildBasicModeDefaults(driver, rolePlatforms);
    const platforms = rolePlatforms.filter((p) => p !== 'Generic');
    const scenarios = deriveScenarios(defaults.testSequence || BASIC_TEST_SEQUENCE);

    return {
      enabled: true,
      level,
      driver,
      ...defaults,
      platforms: platforms.length > 0 ? platforms : undefined,
      scenarios,
    };
  }

  // Advanced mode: driver-specific questions
  let driverConfig: Partial<MoleculeConfig> = {};
  switch (driver) {
    case 'docker':
      driverConfig = await promptMoleculeDocker(rolePlatforms);
      break;
    case 'podman':
      driverConfig = await promptMoleculePodman(rolePlatforms);
      break;
    case 'vagrant':
      driverConfig = await promptMoleculeVagrant(rolePlatforms);
      break;
    case 'delegated':
      driverConfig = await promptMoleculeDelegated();
      break;
  }

  // Advanced mode: common questions
  const commonConfig = await promptMoleculeAdvancedCommon();

  // Build final config
  const platforms = rolePlatforms.filter((p) => p !== 'Generic');
  const scenarios = deriveScenarios(commonConfig.testSequence || BASIC_TEST_SEQUENCE);

  return {
    enabled: true,
    level,
    driver,
    ...driverConfig,
    ...commonConfig,
    platforms: platforms.length > 0 ? platforms : undefined,
    scenarios,
  };
}

// ============================================
// Research Integration Prompts
// ============================================

/**
 * Prompt user to select features from research findings.
 *
 * @param features - Array of discovered features with metadata
 * @returns Array of selected feature names
 */
export async function promptForFeatures(
  features: Array<{
    name: string;
    description: string;
    category: 'essential' | 'recommended' | 'optional';
    complexity: string;
  }>,
): Promise<string[]> {
  if (features.length === 0) {
    return [];
  }

  console.log(chalk.dim('Research discovered the following features:\n'));

  const choices = features.map((feature) => {
    const categoryLabel =
      feature.category === 'essential'
        ? chalk.green('essential')
        : feature.category === 'recommended'
          ? chalk.yellow('recommended')
          : chalk.dim('optional');

    const complexityLabel =
      feature.complexity === 'simple' ? '' : chalk.dim(` [${feature.complexity}]`);

    return {
      name: `${feature.name} ${categoryLabel}${complexityLabel}`,
      value: feature.name,
      description: feature.description,
      checked: feature.category === 'essential', // Pre-check essential features
    };
  });

  choices.push({
    name: chalk.dim('None of the above - skip features'),
    value: '__skip__',
    description: 'Continue without selecting features',
    checked: false,
  });

  const selected = await checkbox({
    message: 'Select features to include (space to select, enter to confirm):',
    choices,
  });

  // Filter out the skip option
  return selected.filter((s) => s !== '__skip__');
}

/**
 * Prompt user to select a package from research findings.
 *
 * @param packages - Array of discovered packages with metadata
 * @returns Selected package name or undefined
 */
export async function promptForPackages(
  packages: Array<{
    name: string;
    source: string;
    version?: string;
    description?: string;
    isDefault: boolean;
  }>,
): Promise<string | undefined> {
  if (packages.length === 0) {
    return undefined;
  }

  console.log(chalk.dim('Research discovered the following package options:\n'));

  const choices = packages.map((pkg) => {
    const defaultLabel = pkg.isDefault ? chalk.green(' [recommended]') : '';
    const versionLabel = pkg.version ? chalk.dim(` v${pkg.version}`) : '';
    const sourceLabel = chalk.dim(` (${pkg.source})`);

    return {
      name: `${pkg.name}${sourceLabel}${versionLabel}${defaultLabel}`,
      value: pkg.name,
      description: pkg.description || `${pkg.name} package`,
    };
  });

  choices.push({
    name: chalk.dim('Use custom package name'),
    value: '__custom__',
    description: 'Specify a different package name',
  });

  const selection = await select({
    message: 'Which package should be used for installation?',
    choices,
  });

  if (selection === '__custom__') {
    const customName = await input({
      message: 'Enter custom package name:',
      validate: (value) => (value.trim().length > 0 ? true : 'Package name cannot be empty'),
    });
    return customName.trim();
  }

  return selection;
}

/**
 * Prompt user to confirm deep dive research on selected features.
 *
 * @returns true if user wants deep dive, false otherwise
 */
export async function confirmDeepDive(): Promise<boolean> {
  console.log(
    chalk.dim(
      '\nDeep dive research provides detailed implementation guidance for selected features.',
    ),
  );
  console.log(chalk.dim('This adds approximately 30 seconds to the planning phase.\n'));

  return await confirm({
    message: 'Run deep dive research on selected features?',
    default: false,
  });
}
