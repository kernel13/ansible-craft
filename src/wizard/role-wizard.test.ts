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
const mockSeparator = class Separator {
  type = 'separator' as const;
  separator = '──────────────';
  constructor(separator?: string) {
    if (separator) this.separator = separator;
  }
};

// Mock @inquirer/prompts before importing modules that use it
mock.module('@inquirer/prompts', () => ({
  checkbox: mockCheckbox,
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
    mockCheckbox.mockResolvedValueOnce(['tasks', 'handlers', 'templates']);

    const result = await promptDirectories();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual(['tasks', 'handlers', 'templates']);
  });

  test('tasks is always included when selected', async () => {
    mockCheckbox.mockResolvedValueOnce(['tasks']);

    const result = await promptDirectories();

    expect(result).toContain('tasks');
  });

  test('returns all selected directories', async () => {
    const allDirs = ['tasks', 'handlers', 'templates', 'files', 'defaults', 'vars', 'meta'];
    mockCheckbox.mockResolvedValueOnce(allDirs);

    const result = await promptDirectories();

    expect(result).toEqual(allDirs);
  });

  test('validates that tasks is required via checkbox config', async () => {
    // The checkbox validate function should reject empty tasks
    // We test this by checking the mock was called with correct options
    mockCheckbox.mockResolvedValueOnce(['tasks']);

    await promptDirectories();

    expect(mockCheckbox).toHaveBeenCalledTimes(1);
    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
    expect(options.validate).toBeDefined();

    // Test the validation function directly
    const validate = options.validate!;
    expect(validate(['tasks'])).toBe(true);
    expect(validate([])).toBe('tasks directory is required');
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

    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
    expect(options.validate).toBeDefined();

    const validate = options.validate!;
    expect(validate([])).toBe('Select at least one platform');
  });

  test('validates Generic alone is valid', async () => {
    mockCheckbox.mockResolvedValueOnce(['Generic']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
    const validate = options.validate!;
    expect(validate(['Generic'])).toBe(true);
  });

  test('validates Generic with specific platform is rejected', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
    const validate = options.validate!;
    expect(validate(['Generic', 'Ubuntu'])).toBe('Generic cannot be combined with specific platforms');
  });

  test('validates multiple specific platforms is valid', async () => {
    mockCheckbox.mockResolvedValueOnce(['Ubuntu', 'RHEL']);

    await promptPlatforms();

    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
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

    const options = mockCheckbox.mock.calls[0]?.[0] as { validate?: (answer: readonly string[]) => boolean | string };
    // Handlers prompt should not have a validate function since selection is optional
    expect(options.validate).toBeUndefined();
  });
});

describe('runRoleWizard', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCheckbox.mockReset();
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('returns validated RoleWizardContext on complete flow', async () => {
    // Mock the three checkbox prompts in sequence
    mockCheckbox
      .mockResolvedValueOnce(['tasks', 'handlers']) // directories
      .mockResolvedValueOnce(['Ubuntu']) // platforms
      .mockResolvedValueOnce(['restart']); // handlers

    const result = await runRoleWizard();

    expect(result).toEqual({
      structure: ['tasks', 'handlers'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
      custom: {},
    });
  });

  test('result is validated by Zod schema', async () => {
    mockCheckbox
      .mockResolvedValueOnce(['tasks', 'templates', 'defaults'])
      .mockResolvedValueOnce(['Generic'])
      .mockResolvedValueOnce([]);

    const result = await runRoleWizard();

    // Validate that the result passes Zod schema validation
    const validation = roleWizardSchema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  test('calls prompts in correct order', async () => {
    mockCheckbox
      .mockResolvedValueOnce(['tasks'])
      .mockResolvedValueOnce(['Ubuntu'])
      .mockResolvedValueOnce([]);

    await runRoleWizard();

    expect(mockCheckbox).toHaveBeenCalledTimes(3);
  });

  test('returns empty handlers when none selected', async () => {
    mockCheckbox
      .mockResolvedValueOnce(['tasks'])
      .mockResolvedValueOnce(['Ubuntu'])
      .mockResolvedValueOnce([]);

    const result = await runRoleWizard();

    expect(result.handlers).toEqual([]);
  });

  test('includes all structure directories when all selected', async () => {
    const allDirs = ['tasks', 'handlers', 'templates', 'files', 'defaults', 'vars', 'meta'];
    mockCheckbox
      .mockResolvedValueOnce(allDirs)
      .mockResolvedValueOnce(['Ubuntu'])
      .mockResolvedValueOnce([]);

    const result = await runRoleWizard();

    expect(result.structure).toEqual(allDirs);
  });

  test('includes custom as empty object', async () => {
    mockCheckbox
      .mockResolvedValueOnce(['tasks'])
      .mockResolvedValueOnce(['Ubuntu'])
      .mockResolvedValueOnce([]);

    const result = await runRoleWizard();

    expect(result.custom).toEqual({});
  });
});

describe('ExitPromptError handling', () => {
  let consoleLogSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockCheckbox.mockReset();
    consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  test('throws ExitPromptError when user cancels at step 1 (directories)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox.mockRejectedValueOnce(exitError);

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify only one prompt was called (step 1)
    expect(mockCheckbox).toHaveBeenCalledTimes(1);
  });

  test('throws ExitPromptError when user cancels at step 2 (platforms)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox
      .mockResolvedValueOnce(['tasks']) // Step 1 succeeds
      .mockRejectedValueOnce(exitError); // Step 2 cancelled

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify two prompts were called (steps 1 and 2)
    expect(mockCheckbox).toHaveBeenCalledTimes(2);
  });

  test('throws ExitPromptError when user cancels at step 3 (handlers)', async () => {
    const exitError = new ExitPromptError();
    mockCheckbox
      .mockResolvedValueOnce(['tasks']) // Step 1 succeeds
      .mockResolvedValueOnce(['Ubuntu']) // Step 2 succeeds
      .mockRejectedValueOnce(exitError); // Step 3 cancelled

    await expect(runRoleWizard()).rejects.toThrow(ExitPromptError);

    // Verify three prompts were called (steps 1, 2, and 3)
    expect(mockCheckbox).toHaveBeenCalledTimes(3);
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

    // Only two prompts should be called
    expect(mockCheckbox).toHaveBeenCalledTimes(2);
  });
});
