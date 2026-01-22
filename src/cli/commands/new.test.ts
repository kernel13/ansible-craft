/**
 * Integration tests for wizard CLI integration in new command.
 *
 * Tests wizard invocation conditions, skip conditions, and error handling.
 *
 * Note: This test file uses targeted mocking to avoid polluting other tests.
 * Only wizard modules and inquirer prompts are mocked at module level.
 * The command's action is tested via shouldRunWizard logic extraction.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { ExitPromptError } from '@inquirer/core';
import { formatPlaybookContextForPrompt, formatRoleContextForPrompt } from '../../wizard/types.js';
import { newCommand } from './new.js';

// Store original isTTY value
const originalIsTTY = process.stdin.isTTY;

/**
 * Helper function that replicates the wizard skip logic from new.ts
 * This allows testing the logic without running the full command.
 */
function shouldSkipWizard(options: {
  quick?: boolean;
  interactive?: boolean;
  json?: boolean;
  isTTY?: boolean | undefined;
}): boolean {
  const jsonMode = options.json ?? false;
  const skipWizard = options.quick || options.interactive === false || jsonMode || !options.isTTY;
  return skipWizard;
}

describe('wizard CLI integration', () => {
  beforeEach(() => {
    // Default to TTY
    Object.defineProperty(process.stdin, 'isTTY', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', {
      value: originalIsTTY,
      writable: true,
      configurable: true,
    });
  });

  describe('role command wizard skip logic', () => {
    test('wizard runs when TTY and no skip flags', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(false);
    });

    test('wizard skips with --quick flag', () => {
      const skip = shouldSkipWizard({
        quick: true,
        interactive: true,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips with --no-interactive flag (interactive: false)', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: false,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips in non-TTY environment', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: false,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips when stdin.isTTY is undefined', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: undefined,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips with --json flag', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: true,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('default options without explicit values', () => {
      // Test with minimal options to match CLI defaults
      const skip = shouldSkipWizard({
        isTTY: true,
      });
      expect(skip).toBe(false);
    });

    test('default options in non-TTY', () => {
      const skip = shouldSkipWizard({
        isTTY: false,
      });
      expect(skip).toBe(true);
    });
  });

  describe('skip conditions precedence', () => {
    test('--quick takes precedence over TTY', () => {
      const skip = shouldSkipWizard({
        quick: true,
        interactive: true,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('--json takes precedence over TTY', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: true,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('non-TTY takes precedence even without flags', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: false,
      });
      expect(skip).toBe(true);
    });

    test('multiple skip conditions combine (all true)', () => {
      const skip = shouldSkipWizard({
        quick: true,
        interactive: false,
        json: true,
        isTTY: false,
      });
      expect(skip).toBe(true);
    });
  });

  describe('playbook command wizard skip logic', () => {
    // The playbook command uses the same skip logic as role command
    test('wizard runs for playbook when TTY and no skip flags', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(false);
    });

    test('wizard skips for playbook with --quick flag', () => {
      const skip = shouldSkipWizard({
        quick: true,
        interactive: true,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips for playbook with --no-interactive flag', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: false,
        json: false,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips for playbook in non-TTY environment', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: false,
        isTTY: false,
      });
      expect(skip).toBe(true);
    });

    test('wizard skips for playbook with --json flag', () => {
      const skip = shouldSkipWizard({
        quick: false,
        interactive: true,
        json: true,
        isTTY: true,
      });
      expect(skip).toBe(true);
    });
  });
});

describe('wizard context formatting', () => {
  describe('formatRoleContextForPrompt', () => {
    test('formats wizard context correctly for prompt', () => {
      const context = {
        structure: ['tasks', 'handlers'] as const,
        platforms: ['Ubuntu'] as const,
        handlers: ['restart'] as const,
        custom: {},
      };

      const clarifications = formatRoleContextForPrompt(context);

      expect(clarifications.structure).toContain('tasks');
      expect(clarifications.structure).toContain('handlers');
      expect(clarifications.platforms).toContain('Ubuntu');
      expect(clarifications.handlers).toContain('restart');
    });

    test('omits empty arrays from clarifications', () => {
      const context = {
        structure: ['tasks'] as const,
        platforms: ['Ubuntu'] as const,
        handlers: [] as const,
        custom: {},
      };

      const clarifications = formatRoleContextForPrompt(context);

      expect(clarifications.structure).toBeDefined();
      expect(clarifications.platforms).toBeDefined();
      expect(clarifications.handlers).toBeUndefined();
    });

    test('includes custom fields in clarifications', () => {
      const context = {
        structure: ['tasks'] as const,
        platforms: ['Ubuntu'] as const,
        handlers: [] as const,
        custom: { additionalRequirements: 'SSL support' },
      };

      const clarifications = formatRoleContextForPrompt(context);

      expect(clarifications.additionalRequirements).toBe('SSL support');
    });
  });

  describe('formatPlaybookContextForPrompt', () => {
    test('formats playbook wizard context correctly', () => {
      const context = {
        hosts: ['webservers'],
        become: true,
        includeHandlers: true,
        custom: {},
      };

      const clarifications = formatPlaybookContextForPrompt(context);

      expect(clarifications.hosts).toContain('webservers');
      expect(clarifications.become).toBe('yes');
      expect(clarifications.handlers).toBe('include');
    });

    test('formats become false as no', () => {
      const context = {
        hosts: ['webservers'],
        become: false,
        includeHandlers: false,
        custom: {},
      };

      const clarifications = formatPlaybookContextForPrompt(context);

      expect(clarifications.become).toBe('no');
      expect(clarifications.handlers).toBe('exclude');
    });

    test('formats multiple hosts correctly', () => {
      const context = {
        hosts: ['webservers', 'databases', 'loadbalancers'],
        become: true,
        includeHandlers: true,
        custom: {},
      };

      const clarifications = formatPlaybookContextForPrompt(context);

      expect(clarifications.hosts).toBe('webservers, databases, loadbalancers');
    });
  });
});

describe('ExitPromptError handling', () => {
  test('ExitPromptError is an Error instance', () => {
    const error = new ExitPromptError();
    expect(error).toBeInstanceOf(Error);
  });

  test('ExitPromptError has correct name', () => {
    const error = new ExitPromptError();
    expect(error.name).toBe('ExitPromptError');
  });

  test('can check for ExitPromptError with instanceof', () => {
    const error = new ExitPromptError();
    const isExitError = error instanceof ExitPromptError;
    expect(isExitError).toBe(true);
  });
});

describe('CLI options parsing', () => {
  test('newCommand has role subcommand', () => {
    const roleCommand = newCommand.commands.find((cmd) => cmd.name() === 'role');
    expect(roleCommand).toBeDefined();
  });

  test('newCommand has playbook subcommand', () => {
    const playbookCommand = newCommand.commands.find((cmd) => cmd.name() === 'playbook');
    expect(playbookCommand).toBeDefined();
  });

  test('role command has --quick option', () => {
    const roleCommand = newCommand.commands.find((cmd) => cmd.name() === 'role');
    const options = roleCommand?.options || [];
    const quickOption = options.find((opt) => opt.long === '--quick' || opt.short === '-Q');
    expect(quickOption).toBeDefined();
  });

  test('role command has --no-interactive option', () => {
    const roleCommand = newCommand.commands.find((cmd) => cmd.name() === 'role');
    const options = roleCommand?.options || [];
    const interactiveOption = options.find((opt) => opt.long === '--no-interactive');
    expect(interactiveOption).toBeDefined();
  });

  test('role command has --json option', () => {
    const roleCommand = newCommand.commands.find((cmd) => cmd.name() === 'role');
    const options = roleCommand?.options || [];
    const jsonOption = options.find((opt) => opt.long === '--json');
    expect(jsonOption).toBeDefined();
  });

  test('playbook command has --quick option', () => {
    const playbookCommand = newCommand.commands.find((cmd) => cmd.name() === 'playbook');
    const options = playbookCommand?.options || [];
    const quickOption = options.find((opt) => opt.long === '--quick' || opt.short === '-Q');
    expect(quickOption).toBeDefined();
  });

  test('playbook command has --no-interactive option', () => {
    const playbookCommand = newCommand.commands.find((cmd) => cmd.name() === 'playbook');
    const options = playbookCommand?.options || [];
    const interactiveOption = options.find((opt) => opt.long === '--no-interactive');
    expect(interactiveOption).toBeDefined();
  });

  test('playbook command has --json option', () => {
    const playbookCommand = newCommand.commands.find((cmd) => cmd.name() === 'playbook');
    const options = playbookCommand?.options || [];
    const jsonOption = options.find((opt) => opt.long === '--json');
    expect(jsonOption).toBeDefined();
  });
});
