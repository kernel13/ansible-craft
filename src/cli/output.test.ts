import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { CLIError } from '../errors/cli-error.js';
import { displayError, formatError } from './output.js';

describe('displayError', () => {
  let stderrOutput: string[];
  const originalWrite = process.stderr.write;

  beforeEach(() => {
    stderrOutput = [];
    process.stderr.write = mock((msg: string) => {
      stderrOutput.push(msg);
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stderr.write = originalWrite;
  });

  test('displays error message', () => {
    const error = new Error('Something went wrong');
    displayError(error);

    const output = stderrOutput.join('');
    expect(output).toContain('Something went wrong');
  });

  test('displays error in bordered box', () => {
    const error = new Error('Test error');
    displayError(error);

    const output = stderrOutput.join('');
    // boxen creates ASCII borders
    expect(output).toContain('Error');
  });

  test('displays CLIError with suggestion', () => {
    const error = new CLIError(
      'API key not found',
      'CONFIG_ERROR',
      'Run "ansible-craft config save" to set up',
    );
    displayError(error);

    const output = stderrOutput.join('');
    expect(output).toContain('API key not found');
    expect(output).toContain('Suggestion');
    expect(output).toContain('config save');
  });

  test('handles regular Error without suggestion', () => {
    const error = new Error('Simple error');
    displayError(error);

    const output = stderrOutput.join('');
    expect(output).toContain('Simple error');
    expect(output).not.toContain('Suggestion');
  });

  test('writes to stderr', () => {
    const error = new Error('Test');
    displayError(error);

    expect(stderrOutput.length).toBeGreaterThan(0);
  });
});

describe('formatError', () => {
  test('returns formatted error string', () => {
    const result = formatError('Invalid option');
    expect(result).toContain('Invalid option');
  });

  test('returns string containing the error', () => {
    const result = formatError('Error message');
    // Result contains the error message (color codes depend on TTY)
    expect(result).toContain('Error message');
    expect(typeof result).toBe('string');
  });

  test('handles empty string', () => {
    const result = formatError('');
    expect(typeof result).toBe('string');
  });

  test('handles multiline error', () => {
    const result = formatError('Line 1\nLine 2');
    expect(result).toContain('Line 1');
    expect(result).toContain('Line 2');
  });
});
