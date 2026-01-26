/**
 * Unit tests for the role wizard.
 *
 * Tests wizard prompts, orchestration flow, and error handling
 * including Ctrl+C cancellation at each step.
 */

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { ExitPromptError } from '@inquirer/core';

// Module-level mocks must be declared before importing the modules under test
const mockCheckbox = mock(() => Promise.resolve([]));
const mockSelect = mock(() => Promise.resolve(''));
const mockConfirm = mock(() => Promise.resolve(true));
const mockInput = mock(() => Promise.resolve(''));
const mockSeparator = class Separator {
  type = 'separator' as const;
  separator = '──────────────';
  constructor(separator?: string) {
    if (separator) this.separator = separator;
  }
  static isSeparator(item: unknown): boolean {
    return item instanceof Separator;
  }
};

// Mock @inquirer/prompts before importing modules that use it
mock.module('@inquirer/prompts', () => ({
  checkbox: mockCheckbox,
  select: mockSelect,
  confirm: mockConfirm,
  input: mockInput,
  Separator: mockSeparator,
  ExitPromptError: ExitPromptError,
}));

// Import modules after mocks are set up
import { promptDirectories, promptHandlers, promptPlatforms, showStepHeader } from './prompts.js';
import { runRoleWizard } from './role-wizard.js';
import { roleWizardSchema } from './types.js';

describe('showStepHeader', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('outputs step format with correct step number', () => {
    showStepHeader(1, 4, 'Test Step');

    expect(consoleLogSpy).toHaveBeenCalled();
    const calls = consoleLogSpy.mock.calls;
    // Find the call that contains the step info
    const stepCall = calls.find((call) => call[0]?.includes('[1/4]'));
    expect(stepCall).toBeDefined();
    expect(stepCall?.[0]).toContain('Test Step');
  });

  test('calculates 25% for step 1 of 4', () => {
    showStepHeader(1, 4, 'Step One');

    const calls = consoleLogSpy.mock.calls;
    const stepCall = calls.find((call) => call[0]?.includes('25%'));
    expect(stepCall).toBeDefined();
  });

  test('calculates 50% for step 2 of 4', () => {
    showStepHeader(2, 4, 'Step Two');

    const calls = consoleLogSpy.mock.calls;
    const stepCall = calls.find((call) => call[0]?.includes('50%'));
    expect(stepCall).toBeDefined();
  });

  test('calculates 75% for step 3 of 4', () => {
    showStepHeader(3, 4, 'Step Three');

    const calls = consoleLogSpy.mock.calls;
    const stepCall = calls.find((call) => call[0]?.includes('75%'));
    expect(stepCall).toBeDefined();
  });

  test('calculates 100% for step 4 of 4', () => {
    showStepHeader(4, 4, 'Step Four');

    const calls = consoleLogSpy.mock.calls;
    const stepCall = calls.find((call) => call[0]?.includes('100%'));
    expect(stepCall).toBeDefined();
  });
});

describe('promptDirectories', () => {
  beforeEach(() => {
    mockCheckbox.mockReset();
  });

  test('returns array of RoleStructureDirectory', async () => {
    // Note: disabled items (tasks) are excluded from checkbox answer
    mockCheckbox.mockResolvedValueOnce(['handlers', 'templates']);

    const result = await promptDirectories();

    expect(Array.isArray(result)).toBe(true);
    // tasks is always prepended
    expect(result).toEqual(['tasks', 'handlers', 'templates']);
  });

  test('tasks is always first in result', async () => {
    mockCheckbox.mockResolvedValueOnce(['handlers']);

    const result = await promptDirectories();

    expect(result[0]).toBe('tasks');
    expect(result).toContain('handlers');
  });

  test('returns all selected directories with tasks first', async () => {
    // Disabled checkbox items (tasks) excluded from answer
    const selectedDirs = ['handlers', 'templates', 'files', 'defaults', 'vars', 'meta'];
    mockCheckbox.mockResolvedValueOnce(selectedDirs);

    const result = await promptDirectories();

    // tasks prepended, then selected dirs
    expect(result).toEqual(['tasks', ...selectedDirs]);
  });

  test('always includes tasks even if not in checkbox answer', async () => {
    // Disabled checkbox items are excluded from answer array,
    // so we must prepend 'tasks' to ensure it's always included
    mockCheckbox.mockResolvedValueOnce(['handlers']); // tasks NOT included (disabled)

    const result = await promptDirectories();

    expect(result).toContain('tasks');
    expect(result[0]).toBe('tasks'); // tasks should be first
    expect(result).toContain('handlers');
  });

  test('avoids duplicate tasks if checkbox somehow includes it', async () => {
    // Safety check: if checkbox behavior changes and includes tasks
    mockCheckbox.mockResolvedValueOnce(['tasks', 'handlers']);

    const result = await promptDirectories();

    const tasksCount = result.filter((dir) => dir === 'tasks').length;
    expect(tasksCount).toBe(1); // should only appear once
  });
});

describe('promptPlatforms', () => {
  beforeEach(() => {
    mockCheckbox.mockReset();
  });

  test('returns array of RolePlatform', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu', 'RHEL']);

    const result = await promptPlatforms();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(['Ubuntu', 'RHEL']);
  });

  test('validates empty selection is rejected', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as {
      validate?: (answer: readonly string[]) => boolean | string;
    };
    expect(options.validate).toBeDefined();

    const validate = options.validate!;
    expect(validate([])).toBe('Select at least one platform');
  });

  test('validates Generic alone is valid', async () => {
    mockCheckbox.mockResolvedValueOnce(['Generic']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as {
      validate?: (answer: readonly string[]) => boolean | string;
    };
    const validate = options.validate!;
    expect(validate(['Generic'])).toBe(true);
  });

  test('validates Generic with specific platform is rejected', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as {
      validate?: (answer: readonly string[]) => boolean | string;
    };
    const validate = options.validate!;
    expect(validate(['Generic', 'Ubuntu'])).toBe(
      'Generic cannot be combined with specific platforms',
    );
  });

  test('validates multiple specific platforms is valid', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu', 'RHEL']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as {
      validate?: (answer: readonly string[]) => boolean | string;
    };
    const validate = options.validate!;
    expect(validate(['Ubuntu', 'RHEL', 'Debian'])).toBe(true);
  });
});

describe('promptHandlers', () => {
  beforeEach(() => {
    mockCheckbox.mockReset();
  });

  test('returns array of RoleHandler', async () => {
    mockCheckbox.mockResolvedValueOnce(['restart', 'reload']);

    const result = await promptHandlers();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(['restart', 'reload']);
  });

  test('empty array is valid (handlers optional)', async () => {
    mockCheckbox.mockResolvedValueOnce([]);

    const result = await promptHandlers();

    expect(result).toEqual([]);
  });

  test('returns all selected handlers', async () => {
    const allHandlers = ['restart', 'reload', 'enable', 'custom'];
    mockCheckbox.mockResolvedValueOnce(allHandlers);

    const result = await promptHandlers();

    expect(result).toEqual(allHandlers);
  });

  test('checkbox is called without required validation', async () => {
    mockCheckbox.mockResolvedValueOnce([]);

    await promptHandlers();

    const options = mockCheckbox.mock.calls[0]?.[0] as {
      validate?: (answer: readonly string[]) => boolean | string;
    };
    // Handlers prompt should not have a validate function since selection is optional
    expect(options.validate).toBeUndefined();
  });
});

/**
 * Helper function to set up all wizard prompts for complete flow.
 * The enhanced wizard has 11 steps with many prompts:
 * 1. Directories (checkbox)
 * 2. Platforms (checkbox)
 * 3. Ansible version (select, confirm)
 * 4. Variable strategy (confirm x2, select)
 * 5. Privilege escalation (select, select)
 * 6. Handlers (checkbox)
 * 7. Tags (select, input)
 * 8. Idempotency (confirm x3)
 * 9. Dependencies (confirm, input)
 * 10. Molecule (tiered: level select, driver select, [advanced questions])
 * 11. Complete
 */
function setupWizardMocks(
  options: {
    directories?: string[];
    platforms?: string[];
    handlers?: string[];
    moleculeLevel?: 'none' | 'basic' | 'advanced';
    moleculeDriver?: 'docker' | 'podman' | 'vagrant' | 'delegated';
    dependenciesEnabled?: boolean;
  } = {},
) {
  const {
    directories = ['handlers'],
    platforms = ['Ubuntu'],
    handlers = ['restart'],
    moleculeLevel = 'basic',
    moleculeDriver = 'docker',
    dependenciesEnabled = true,
  } = options;

  // Step 1: Directories
  mockCheckbox.mockResolvedValueOnce(directories);

  // Step 2: Platforms
  mockCheckbox.mockResolvedValueOnce(platforms);

  // Step 3: Ansible version
  mockSelect.mockResolvedValueOnce('2.14'); // minimum version
  mockConfirm.mockResolvedValueOnce(false); // include version check

  // Step 4: Variable strategy
  mockConfirm.mockResolvedValueOnce(true); // include defaults
  mockConfirm.mockResolvedValueOnce(false); // include vars
  mockSelect.mockResolvedValueOnce('prefixed'); // naming convention

  // Step 5: Privilege escalation
  mockSelect.mockResolvedValueOnce('yes'); // required
  mockSelect.mockResolvedValueOnce('root'); // become user

  // Step 6: Handlers
  mockCheckbox.mockResolvedValueOnce(handlers);

  // Step 7: Tags
  mockSelect.mockResolvedValueOnce('grouped'); // strategy
  mockInput.mockResolvedValueOnce('install,config,service'); // tag groups

  // Step 8: Idempotency
  mockConfirm.mockResolvedValueOnce(true); // support check mode
  mockConfirm.mockResolvedValueOnce(true); // include changed_when
  mockConfirm.mockResolvedValueOnce(false); // include failed_when

  // Step 9: Dependencies
  mockConfirm.mockResolvedValueOnce(dependenciesEnabled); // include meta
  if (dependenciesEnabled) {
    mockInput.mockResolvedValueOnce(''); // role dependencies (empty)
  }

  // Step 10: Molecule (new tiered flow)
  mockSelect.mockResolvedValueOnce(moleculeLevel); // Q1: level

  if (moleculeLevel !== 'none') {
    mockSelect.mockResolvedValueOnce(moleculeDriver); // Q2: driver

    if (moleculeLevel === 'advanced') {
      // Driver-specific questions for advanced mode
      switch (moleculeDriver) {
        case 'docker':
          mockConfirm.mockResolvedValueOnce(true); // use ansible images
          mockConfirm.mockResolvedValueOnce(false); // privileged mode
          break;
        case 'podman':
          mockConfirm.mockResolvedValueOnce(true); // use ansible images
          mockConfirm.mockResolvedValueOnce(false); // privileged mode
          mockConfirm.mockResolvedValueOnce(true); // rootless mode
          break;
        case 'vagrant':
          mockSelect.mockResolvedValueOnce('virtualbox'); // provider
          mockConfirm.mockResolvedValueOnce(true); // use standard boxes
          mockSelect.mockResolvedValueOnce('standard'); // resources
          break;
        case 'delegated':
          mockSelect.mockResolvedValueOnce('external'); // instance management
          break;
      }

      // Common advanced questions
      mockCheckbox.mockResolvedValueOnce(['create', 'converge', 'idempotence', 'verify']); // test sequence
      mockSelect.mockResolvedValueOnce('ansible'); // verifier
    }
  }
}

describe('runRoleWizard', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCheckbox.mockReset();
    mockSelect.mockReset();
    mockConfirm.mockReset();
    mockInput.mockReset();
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('returns validated RoleWizardContext on complete flow', async () => {
    setupWizardMocks({
      directories: ['handlers'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
    });

    const result = await runRoleWizard();

    // Verify core structure
    expect(result.structure).toEqual(['tasks', 'handlers']); // tasks prepended
    expect(result.platforms).toEqual(['Ubuntu']);
    expect(result.handlers).toEqual(['restart']);
    expect(result.custom).toEqual({});

    // Verify new fields
    expect(result.ansibleVersion.minimum).toBe('2.14');
    expect(result.variableStrategy.naming).toBe('prefixed');
    expect(result.privilegeEscalation.required).toBe('yes');
    expect(result.molecule.enabled).toBe(true);
  });

  test('result is validated by Zod schema', async () => {
    setupWizardMocks({
      directories: ['templates', 'defaults'],
      platforms: ['Generic'],
      handlers: [],
      moleculeEnabled: false, // Generic platform means no molecule platforms
    });

    const result = await runRoleWizard();

    // Validate that the result passes Zod schema validation
    const validation = roleWizardSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  test('returns empty handlers when none selected', async () => {
    setupWizardMocks({
      handlers: [],
    });

    const result = await runRoleWizard();

    expect(result.handlers).toEqual([]);
  });

  test('includes all structure directories when all selected', async () => {
    const allDirs = ['tasks', 'handlers', 'templates', 'files', 'defaults', 'vars', 'meta'];
    setupWizardMocks({
      directories: allDirs,
    });

    const result = await runRoleWizard();

    expect(result.structure).toEqual(allDirs);
  });

  test('includes custom as empty object', async () => {
    setupWizardMocks();

    const result = await runRoleWizard();

    expect(result.custom).toEqual({});
  });

  test('molecule disabled when user chooses none level', async () => {
    setupWizardMocks({
      moleculeLevel: 'none',
    });

    const result = await runRoleWizard();

    expect(result.molecule.enabled).toBe(false);
    expect(result.molecule.level).toBe('none');
    expect(result.molecule.driver).toBeUndefined();
  });

  test('molecule basic mode applies defaults', async () => {
    setupWizardMocks({
      moleculeLevel: 'basic',
      moleculeDriver: 'docker',
    });

    const result = await runRoleWizard();

    expect(result.molecule.enabled).toBe(true);
    expect(result.molecule.level).toBe('basic');
    expect(result.molecule.driver).toBe('docker');
    expect(result.molecule.verifier).toBe('ansible');
    expect(result.molecule.testSequence).toBeDefined();
  });

  test('molecule advanced mode with docker driver', async () => {
    setupWizardMocks({
      moleculeLevel: 'advanced',
      moleculeDriver: 'docker',
    });

    const result = await runRoleWizard();

    expect(result.molecule.enabled).toBe(true);
    expect(result.molecule.level).toBe('advanced');
    expect(result.molecule.driver).toBe('docker');
    expect(result.molecule.useAnsibleImages).toBe(true);
    expect(result.molecule.privileged).toBe(false);
  });

  test('molecule advanced mode with podman driver includes rootless', async () => {
    setupWizardMocks({
      moleculeLevel: 'advanced',
      moleculeDriver: 'podman',
    });

    const result = await runRoleWizard();

    expect(result.molecule.enabled).toBe(true);
    expect(result.molecule.driver).toBe('podman');
    expect(result.molecule.rootless).toBe(true);
  });

  test('molecule advanced mode with vagrant driver includes provider', async () => {
    setupWizardMocks({
      moleculeLevel: 'advanced',
      moleculeDriver: 'vagrant',
    });

    const result = await runRoleWizard();

    expect(result.molecule.enabled).toBe(true);
    expect(result.molecule.driver).toBe('vagrant');
    expect(result.molecule.vagrantProvider).toBe('virtualbox');
    expect(result.molecule.vagrantMemory).toBeDefined();
    expect(result.molecule.vagrantCpus).toBeDefined();
  });
});

describe('ExitPromptError handling', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCheckbox.mockReset();
    mockSelect.mockReset();
    mockConfirm.mockReset();
    mockInput.mockReset();
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('throws ExitPromptError when user cancels at step 1 (directories)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox.mockRejectedValueOnce(exitError);

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify only one checkbox was called (step 1)
    expect(mockCheckbox).toHaveBeenCalledTimes(1);
  });

  test('throws ExitPromptError when user cancels at step 2 (platforms)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox
      .mockResolvedValueOnce(['tasks']) // Step 1 succeeds
      .mockRejectedValueOnce(exitError); // Step 2 cancelled

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify two checkboxes were called (steps 1 and 2)
    expect(mockCheckbox).toHaveBeenCalledTimes(2);
  });

  test('throws ExitPromptError when user cancels at step 3 (ansible version)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox
      .mockResolvedValueOnce(['tasks']) // Step 1 succeeds
      .mockResolvedValueOnce(['Ubuntu']); // Step 2 succeeds
    mockSelect.mockRejectedValueOnce(exitError); // Step 3 cancelled

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify prompts were called correctly
    expect(mockCheckbox).toHaveBeenCalledTimes(2);
    expect(mockSelect).toHaveBeenCalledTimes(1);
  });

  test('no subsequent prompts called after cancellation at step 1', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox.mockRejectedValueOnce(exitError);

    try {
      await runRoleWizard();
    } catch {
      // Expected to throw
    }

    // Only the first prompt should be called
    expect(mockCheckbox).toHaveBeenCalledTimes(1);
    expect(mockSelect).toHaveBeenCalledTimes(0);
  });

  test('no subsequent prompts called after cancellation at step 2', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox
      .mockResolvedValueOnce(['tasks'])
      .mockRejectedValueOnce(exitError)
      .mockResolvedValueOnce([]); // This should never be called

    try {
      await runRoleWizard();
    } catch {
      // Expected to throw
    }

    // Only two checkboxes should be called
    expect(mockCheckbox).toHaveBeenCalledTimes(2);
    expect(mockSelect).toHaveBeenCalledTimes(0);
  });
});
