/**
 * Unit tests for the playbook wizard.
 *
 * Tests wizard prompts, orchestration flow, and error handling
 * including Ctrl+C cancellation at each step.
 */

import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import { ExitPromptError } from '@inquirer/core';

// Module-level mocks must be declared before importing the modules under test
const mockInput = mock(() => Promise.resolve(''));
const mockConfirm = mock(() => Promise.resolve(false));

// Mock @inquirer/prompts before importing modules that use it
mock.module('@inquirer/prompts', () => ({
	input: mockInput,
	confirm: mockConfirm,
	ExitPromptError: ExitPromptError,
}));

// Import modules after mocks are set up
import { promptBecome, promptHandlersDescription, promptHosts } from './playbook-prompts.js';
import { runPlaybookWizard } from './playbook-wizard.js';
import { playbookWizardSchema } from './types.js';

describe('promptHosts', () => {
	beforeEach(() => {
		mockInput.mockReset();
	});

	test('returns non-empty string', async () => {
		mockInput.mockResolvedValueOnce('webservers');

		const result = await promptHosts();

		expect(typeof result).toBe('string');
		expect(result).toBe('webservers');
	});

	test('validation rejects empty input', async () => {
		mockInput.mockResolvedValueOnce('webservers');

		await promptHosts();

		const options = mockInput.mock.calls[0]?.[0] as {
			validate?: (value: string) => boolean | string;
		};
		expect(options.validate).toBeDefined();

		const validate = options.validate!;
		expect(validate('')).toBe('Host pattern is required');
		expect(validate('   ')).toBe('Host pattern is required');
	});

	test('accepts valid Ansible patterns', async () => {
		mockInput.mockResolvedValueOnce('web*:&staging');

		await promptHosts();

		const options = mockInput.mock.calls[0]?.[0] as {
			validate?: (value: string) => boolean | string;
		};
		const validate = options.validate!;
		expect(validate('webservers')).toBe(true);
		expect(validate('web*:&staging')).toBe(true);
		expect(validate('databases,cache')).toBe(true);
	});
});

describe('promptBecome', () => {
	let consoleLogSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockConfirm.mockReset();
		mockInput.mockReset();
		consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test('returns become false when declined', async () => {
		mockConfirm.mockResolvedValueOnce(false);

		const result = await promptBecome();

		expect(result).toEqual({ become: false });
		expect(mockInput).not.toHaveBeenCalled(); // No follow-up prompt
	});

	test('returns become true with undefined becomeUser when accepted with empty user', async () => {
		mockConfirm.mockResolvedValueOnce(true);
		mockInput.mockResolvedValueOnce(''); // Empty become_user

		const result = await promptBecome();

		expect(result).toEqual({ become: true, becomeUser: undefined });
	});

	test('returns become true with custom becomeUser when provided', async () => {
		mockConfirm.mockResolvedValueOnce(true);
		mockInput.mockResolvedValueOnce('deploy');

		const result = await promptBecome();

		expect(result).toEqual({ become: true, becomeUser: 'deploy' });
	});

	test('confirm is called with default false', async () => {
		mockConfirm.mockResolvedValueOnce(false);

		await promptBecome();

		expect(mockConfirm).toHaveBeenCalledTimes(1);
		const options = mockConfirm.mock.calls[0]?.[0] as { default?: boolean };
		expect(options.default).toBe(false);
	});
});

describe('promptHandlersDescription', () => {
	let consoleLogSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockInput.mockReset();
		consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test('returns undefined when empty string entered', async () => {
		mockInput.mockResolvedValueOnce('');

		const result = await promptHandlersDescription();

		expect(result).toBeUndefined();
	});

	test('returns description string when provided', async () => {
		mockInput.mockResolvedValueOnce('restart nginx, reload config');

		const result = await promptHandlersDescription();

		expect(result).toBe('restart nginx, reload config');
	});

	test('accepts natural language descriptions', async () => {
		const descriptions = [
			'restart web server',
			'reload application config',
			'restart nginx and reload apache',
		];

		for (const desc of descriptions) {
			mockInput.mockResolvedValueOnce(desc);
			const result = await promptHandlersDescription();
			expect(result).toBe(desc);
		}
	});
});

describe('runPlaybookWizard', () => {
	let consoleLogSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockInput.mockReset();
		mockConfirm.mockReset();
		consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test('returns validated PlaybookWizardContext on complete flow', async () => {
		mockInput
			.mockResolvedValueOnce('webservers') // hosts
			.mockResolvedValueOnce('') // become_user (skipped)
			.mockResolvedValueOnce('restart nginx'); // handlers

		mockConfirm.mockResolvedValueOnce(true); // become

		const result = await runPlaybookWizard();

		expect(result).toEqual({
			hosts: ['webservers'],
			become: true,
			includeHandlers: true,
			custom: {
				handlersDescription: 'restart nginx',
			},
		});
	});

	test('result is validated by Zod schema', async () => {
		mockInput
			.mockResolvedValueOnce('databases')
			.mockResolvedValueOnce(''); // no handlers

		mockConfirm.mockResolvedValueOnce(false); // no become

		const result = await runPlaybookWizard();

		const validation = playbookWizardSchema.safeParse(result);
		expect(validation.success).toBe(true);
	});

	test('calls prompts in correct order', async () => {
		mockInput
			.mockResolvedValueOnce('webservers')
			.mockResolvedValueOnce('');

		mockConfirm.mockResolvedValueOnce(false);

		await runPlaybookWizard();

		// First input: hosts, then confirm: become, then input: handlers
		expect(mockInput).toHaveBeenCalledTimes(2); // hosts + handlers (no become_user since become=false)
		expect(mockConfirm).toHaveBeenCalledTimes(1);
	});

	test('hosts array contains single element', async () => {
		mockInput
			.mockResolvedValueOnce('web*:&staging')
			.mockResolvedValueOnce('');

		mockConfirm.mockResolvedValueOnce(false);

		const result = await runPlaybookWizard();

		expect(result.hosts).toEqual(['web*:&staging']);
		expect(result.hosts.length).toBe(1);
	});

	test('includeHandlers is true when description provided', async () => {
		mockInput
			.mockResolvedValueOnce('webservers')
			.mockResolvedValueOnce('restart nginx');

		mockConfirm.mockResolvedValueOnce(false);

		const result = await runPlaybookWizard();

		expect(result.includeHandlers).toBe(true);
	});

	test('includeHandlers is false when no description', async () => {
		mockInput
			.mockResolvedValueOnce('webservers')
			.mockResolvedValueOnce(''); // empty handlers

		mockConfirm.mockResolvedValueOnce(false);

		const result = await runPlaybookWizard();

		expect(result.includeHandlers).toBe(false);
	});

	test('custom contains becomeUser when provided', async () => {
		mockInput
			.mockResolvedValueOnce('webservers')
			.mockResolvedValueOnce('deploy') // becomeUser
			.mockResolvedValueOnce(''); // no handlers

		mockConfirm.mockResolvedValueOnce(true); // become

		const result = await runPlaybookWizard();

		expect(result.custom.becomeUser).toBe('deploy');
	});

	test('custom contains handlersDescription when provided', async () => {
		mockInput
			.mockResolvedValueOnce('webservers')
			.mockResolvedValueOnce('restart nginx'); // handlers

		mockConfirm.mockResolvedValueOnce(false); // no become

		const result = await runPlaybookWizard();

		expect(result.custom.handlersDescription).toBe('restart nginx');
	});
});

describe('ExitPromptError handling', () => {
	let consoleLogSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		mockInput.mockReset();
		mockConfirm.mockReset();
		consoleLogSpy = spyOn(console, 'log').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleLogSpy.mockRestore();
	});

	test('throws ExitPromptError when user cancels at step 1 (hosts)', async () => {
		const exitError = new ExitPromptError();
		mockInput.mockRejectedValueOnce(exitError);

		await expect(runPlaybookWizard()).rejects.toThrow(ExitPromptError);

		// Only hosts input was called
		expect(mockInput).toHaveBeenCalledTimes(1);
	});

	test('throws ExitPromptError when user cancels at step 2 (become)', async () => {
		const exitError = new ExitPromptError();
		mockInput.mockResolvedValueOnce('webservers'); // Step 1 succeeds
		mockConfirm.mockRejectedValueOnce(exitError); // Step 2 cancelled

		await expect(runPlaybookWizard()).rejects.toThrow(ExitPromptError);

		expect(mockInput).toHaveBeenCalledTimes(1); // hosts
		expect(mockConfirm).toHaveBeenCalledTimes(1); // become
	});

	test('throws ExitPromptError when user cancels at step 3 (handlers)', async () => {
		const exitError = new ExitPromptError();
		mockInput
			.mockResolvedValueOnce('webservers') // Step 1 succeeds
			.mockRejectedValueOnce(exitError); // Step 3 cancelled

		mockConfirm.mockResolvedValueOnce(false); // Step 2 succeeds

		await expect(runPlaybookWizard()).rejects.toThrow(ExitPromptError);

		expect(mockInput).toHaveBeenCalledTimes(2); // hosts + handlers
		expect(mockConfirm).toHaveBeenCalledTimes(1); // become
	});

	test('no subsequent prompts called after cancellation', async () => {
		const exitError = new ExitPromptError();
		mockInput.mockRejectedValueOnce(exitError);

		try {
			await runPlaybookWizard();
		} catch {
			// Expected to throw
		}

		// Only the first input should be called
		expect(mockInput).toHaveBeenCalledTimes(1);
		expect(mockConfirm).not.toHaveBeenCalled();
	});
});
