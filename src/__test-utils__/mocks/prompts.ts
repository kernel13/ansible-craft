import { mock } from 'bun:test';

/**
 * Mock for @inquirer/prompts confirm function.
 *
 * @param response - The response to return when confirm is called
 * @returns A mock function that returns the specified response
 *
 * @example
 * ```typescript
 * const mockConfirm = createMockConfirm(true);
 * const result = await mockConfirm({ message: 'Continue?' });
 * expect(result).toBe(true);
 * ```
 */
export function createMockConfirm(response: boolean) {
  return mock(async (options: { message: string; default?: boolean }) => {
    return response;
  });
}

/**
 * Mock for @inquirer/prompts input function.
 *
 * @param response - The response to return when input is called
 * @returns A mock function that returns the specified response
 *
 * @example
 * ```typescript
 * const mockInput = createMockInput('user-response');
 * const result = await mockInput({ message: 'Enter value:' });
 * expect(result).toBe('user-response');
 * ```
 */
export function createMockInput(response: string) {
  return mock(async (options: { message: string; default?: string }) => {
    return response;
  });
}

/**
 * Mock for @inquirer/prompts select function.
 *
 * @param response - The response to return when select is called
 * @returns A mock function that returns the specified response
 *
 * @example
 * ```typescript
 * const mockSelect = createMockSelect('option-1');
 * const result = await mockSelect({ message: 'Choose:', choices: [...] });
 * expect(result).toBe('option-1');
 * ```
 */
export function createMockSelect<T = string>(response: T) {
  return mock(
    async (options: {
      message: string;
      choices: Array<{ name: string; value: T } | { name: string; value: T; description?: string }>;
    }) => {
      return response;
    },
  );
}

/**
 * Mock for @inquirer/prompts password function.
 *
 * @param response - The response to return when password is called
 * @returns A mock function that returns the specified response
 */
export function createMockPassword(response: string) {
  return mock(async (options: { message: string; mask?: string }) => {
    return response;
  });
}

/**
 * Mock for @inquirer/prompts editor function.
 *
 * @param response - The response to return when editor is called
 * @returns A mock function that returns the specified response
 */
export function createMockEditor(response: string) {
  return mock(async (options: { message: string; default?: string }) => {
    return response;
  });
}

/**
 * Create a mock that throws an error (simulates user cancellation).
 *
 * @param errorMessage - The error message to throw
 * @returns A mock function that throws an error
 *
 * @example
 * ```typescript
 * const mockConfirm = createMockCancelled('User cancelled');
 * await expect(mockConfirm({ message: 'Continue?' })).rejects.toThrow('User cancelled');
 * ```
 */
export function createMockCancelled(errorMessage = 'User cancelled') {
  return mock(async () => {
    throw new Error(errorMessage);
  });
}

/**
 * Mock prompt responses object for multiple prompts.
 */
export interface MockPromptResponses {
  confirm?: boolean | boolean[];
  input?: string | string[];
  select?: string | string[];
  password?: string | string[];
  editor?: string | string[];
}

/**
 * Create a full set of mock prompt functions with configurable responses.
 *
 * @param responses - Object with responses for each prompt type
 * @returns Object with mock functions for each prompt type
 *
 * @example
 * ```typescript
 * const mocks = createMockPrompts({
 *   confirm: [true, false],  // First call returns true, second returns false
 *   input: 'user-value',     // All calls return 'user-value'
 * });
 *
 * await mocks.confirm({ message: 'First?' });  // true
 * await mocks.confirm({ message: 'Second?' }); // false
 * await mocks.input({ message: 'Value?' });    // 'user-value'
 * ```
 */
export function createMockPrompts(responses: MockPromptResponses = {}) {
  let confirmIndex = 0;
  let inputIndex = 0;
  let selectIndex = 0;
  let passwordIndex = 0;
  let editorIndex = 0;

  const getResponse = <T>(value: T | T[] | undefined, index: number, defaultValue: T): T => {
    if (value === undefined) return defaultValue;
    if (Array.isArray(value)) {
      return value[Math.min(index, value.length - 1)];
    }
    return value;
  };

  return {
    confirm: mock(async (options: { message: string; default?: boolean }) => {
      const response = getResponse(responses.confirm, confirmIndex++, true);
      return response;
    }),

    input: mock(async (options: { message: string; default?: string }) => {
      const response = getResponse(responses.input, inputIndex++, '');
      return response;
    }),

    select: mock(
      async (options: { message: string; choices: Array<{ name: string; value: string }> }) => {
        const response = getResponse(responses.select, selectIndex++, options.choices[0]?.value);
        return response;
      },
    ),

    password: mock(async (options: { message: string; mask?: string }) => {
      const response = getResponse(responses.password, passwordIndex++, '');
      return response;
    }),

    editor: mock(async (options: { message: string; default?: string }) => {
      const response = getResponse(responses.editor, editorIndex++, '');
      return response;
    }),

    /** Reset call counters */
    reset() {
      confirmIndex = 0;
      inputIndex = 0;
      selectIndex = 0;
      passwordIndex = 0;
      editorIndex = 0;
    },
  };
}
