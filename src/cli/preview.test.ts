import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GeneratedFile } from '../generation/role/parser.js';
import type { LintViolation } from '../generation/validation/ansible-lint.js';
import {
  displayFilePreview,
  displayFilesPreview,
  displayLintResults,
  previewAndConfirm,
} from './preview.js';

// Mock @inquirer/prompts
const mockConfirm = mock();

mock.module('@inquirer/prompts', () => ({
  confirm: mockConfirm,
}));

describe('displayFilePreview', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('displays file path as header', () => {
    displayFilePreview('tasks/main.yml', '---\n- name: Test\n');

    const output = consoleOutput.join('\n');
    expect(output).toContain('tasks/main.yml');
    expect(output).toContain('===');
  });

  test('displays file content with syntax highlighting', () => {
    const content = '---\n- name: Install nginx\n  package:\n    name: nginx\n';
    displayFilePreview('tasks/main.yml', content);

    // Should have called console.log multiple times (header + content)
    expect(consoleOutput.length).toBeGreaterThan(1);
  });

  test('detects yaml language for .yml files', () => {
    displayFilePreview('defaults/main.yml', '---\nport: 80\n');
    // Content should be highlighted (output will contain the content)
    expect(consoleOutput.join('\n')).toContain('port');
  });

  test('detects yaml language for .yaml files', () => {
    displayFilePreview('config.yaml', '---\nkey: value\n');
    expect(consoleOutput.join('\n')).toContain('key');
  });

  test('detects markdown for .md files', () => {
    displayFilePreview('README.md', '# Title\n\nContent\n');
    expect(consoleOutput.join('\n')).toContain('Title');
  });

  test('detects json for .json files', () => {
    displayFilePreview('package.json', '{"name": "test"}\n');
    expect(consoleOutput.join('\n')).toContain('name');
  });

  test('defaults to yaml for unknown extensions', () => {
    displayFilePreview('templates/nginx.conf.j2', 'server {}');
    expect(consoleOutput.length).toBeGreaterThan(0);
  });
});

describe('displayFilesPreview', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('displays header with file count', () => {
    const files: GeneratedFile[] = [
      { path: 'tasks/main.yml', content: '---\n' },
      { path: 'defaults/main.yml', content: '---\n' },
    ];

    displayFilesPreview(files);

    const output = consoleOutput.join('\n');
    expect(output).toContain('Generated files');
    expect(output).toContain('2');
  });

  test('displays all files', () => {
    const files: GeneratedFile[] = [
      { path: 'tasks/main.yml', content: '---\n- name: Task\n' },
      { path: 'handlers/main.yml', content: '---\n- name: Handler\n' },
    ];

    displayFilesPreview(files);

    const output = consoleOutput.join('\n');
    expect(output).toContain('tasks/main.yml');
    expect(output).toContain('handlers/main.yml');
  });

  test('handles empty files array', () => {
    displayFilesPreview([]);

    const output = consoleOutput.join('\n');
    expect(output).toContain('0');
  });

  test('displays each file with content', () => {
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\nvar: value\n' }];

    displayFilesPreview(files);

    expect(consoleOutput.join('\n')).toContain('var');
  });
});

describe('displayLintResults', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('displays success message when no violations', () => {
    displayLintResults([]);

    const output = consoleOutput.join('\n');
    expect(output).toContain('ansible-lint passed');
    expect(output).toContain('✓');
  });

  test('groups violations by file', () => {
    const violations: LintViolation[] = [
      { file: 'tasks/main.yml', line: 5, ruleId: 'fqcn', message: 'Use FQCN', level: 'warning' },
      {
        file: 'tasks/main.yml',
        line: 10,
        ruleId: 'yaml',
        message: 'Trailing space',
        level: 'warning',
      },
      {
        file: 'handlers/main.yml',
        line: 3,
        ruleId: 'name',
        message: 'Name required',
        level: 'error',
      },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('tasks/main.yml');
    expect(output).toContain('handlers/main.yml');
  });

  test('displays errors with red color and ✗ icon', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 1, ruleId: 'syntax', message: 'Invalid syntax', level: 'error' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('✗');
    expect(output).toContain('syntax');
  });

  test('displays warnings with yellow color and ⚠ icon', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 5, ruleId: 'fqcn', message: 'Use FQCN', level: 'warning' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('⚠');
    expect(output).toContain('fqcn');
  });

  test('displays line numbers', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 42, ruleId: 'test', message: 'Test', level: 'warning' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain(':42');
  });

  test('handles violations without line numbers', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', ruleId: 'general', message: 'General issue', level: 'warning' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('general');
  });

  test('displays summary with error count', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 1, ruleId: 'e1', message: 'Error 1', level: 'error' },
      { file: 'test.yml', line: 2, ruleId: 'e2', message: 'Error 2', level: 'error' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('2 error');
  });

  test('displays summary with warning count', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 1, ruleId: 'w1', message: 'Warning 1', level: 'warning' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('1 warning');
  });

  test('displays mixed summary', () => {
    const violations: LintViolation[] = [
      { file: 'test.yml', line: 1, ruleId: 'e1', message: 'Error', level: 'error' },
      { file: 'test.yml', line: 2, ruleId: 'w1', message: 'Warning', level: 'warning' },
      { file: 'test.yml', line: 3, ruleId: 'w2', message: 'Warning 2', level: 'warning' },
    ];

    displayLintResults(violations);

    const output = consoleOutput.join('\n');
    expect(output).toContain('1 error');
    expect(output).toContain('2 warning');
  });
});

describe('previewAndConfirm', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
    mockConfirm.mockReset();
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('displays files preview', async () => {
    mockConfirm.mockResolvedValue(true);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\nvar: value\n' }];

    await previewAndConfirm(files);

    expect(consoleOutput.join('\n')).toContain('test.yml');
  });

  test('displays lint results when provided', async () => {
    mockConfirm.mockResolvedValue(true);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];
    const violations: LintViolation[] = [
      { file: 'test.yml', ruleId: 'fqcn', message: 'Use FQCN', level: 'warning' },
    ];

    await previewAndConfirm(files, violations);

    expect(consoleOutput.join('\n')).toContain('fqcn');
  });

  test('skips lint display when no violations', async () => {
    mockConfirm.mockResolvedValue(true);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];

    await previewAndConfirm(files, undefined);

    // Should not contain lint-specific content
    const output = consoleOutput.join('\n');
    expect(output).not.toContain('ansible-lint passed');
  });

  test('prompts user for confirmation', async () => {
    mockConfirm.mockResolvedValue(false);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];

    await previewAndConfirm(files);

    expect(mockConfirm).toHaveBeenCalled();
  });

  test('returns true when user confirms', async () => {
    mockConfirm.mockResolvedValue(true);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];

    const result = await previewAndConfirm(files);

    expect(result).toBe(true);
  });

  test('returns false when user declines', async () => {
    mockConfirm.mockResolvedValue(false);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];

    const result = await previewAndConfirm(files);

    expect(result).toBe(false);
  });

  test('prompt has default value of false', async () => {
    mockConfirm.mockResolvedValue(false);
    const files: GeneratedFile[] = [{ path: 'test.yml', content: '---\n' }];

    await previewAndConfirm(files);

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        default: false,
      }),
    );
  });
});
