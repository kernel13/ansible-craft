import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  formatJsonError,
  formatJsonSuccess,
  lintViolationsToWarnings,
  outputJson,
  type ErrorResult,
  type GenerationResult,
  type Warning,
} from './json-output.js';

describe('formatJsonSuccess', () => {
  const baseFiles = [
    { path: 'tasks/main.yml', content: '---\n- name: Test\n' },
    { path: 'defaults/main.yml', content: '---\nvar: value\n' },
  ];

  test('returns correct format_version', () => {
    const result = formatJsonSuccess(
      'role',
      'nginx',
      '/tmp/nginx',
      baseFiles,
      [],
      'new role',
      Date.now(),
    );
    expect(result.format_version).toBe('1.0');
  });

  test('returns success: true', () => {
    const result = formatJsonSuccess(
      'role',
      'nginx',
      '/tmp/nginx',
      baseFiles,
      [],
      'new role',
      Date.now(),
    );
    expect(result.success).toBe(true);
  });

  test('includes type in result', () => {
    const roleResult = formatJsonSuccess('role', 'nginx', '/tmp', baseFiles, [], 'cmd', Date.now());
    expect(roleResult.type).toBe('role');

    const playbookResult = formatJsonSuccess(
      'playbook',
      'deploy',
      '/tmp',
      baseFiles,
      [],
      'cmd',
      Date.now(),
    );
    expect(playbookResult.type).toBe('playbook');
  });

  test('includes name in result', () => {
    const result = formatJsonSuccess(
      'role',
      'custom-role',
      '/tmp',
      baseFiles,
      [],
      'cmd',
      Date.now(),
    );
    expect(result.name).toBe('custom-role');
  });

  test('includes output_path in result', () => {
    const result = formatJsonSuccess(
      'role',
      'nginx',
      '/custom/path',
      baseFiles,
      [],
      'cmd',
      Date.now(),
    );
    expect(result.output_path).toBe('/custom/path');
  });

  test('converts files to FileEntry format', () => {
    const result = formatJsonSuccess('role', 'nginx', '/tmp', baseFiles, [], 'cmd', Date.now());

    expect(result.files).toHaveLength(2);
    expect(result.files[0].path).toBe('tasks/main.yml');
    expect(result.files[0].type).toBe('file');
    expect(typeof result.files[0].bytes).toBe('number');
  });

  test('calculates correct byte size', () => {
    const files = [{ path: 'test.yml', content: 'hello' }];
    const result = formatJsonSuccess('role', 'test', '/tmp', files, [], 'cmd', Date.now());

    expect(result.files[0].bytes).toBe(5);
  });

  test('includes warnings in result', () => {
    const warnings: Warning[] = [
      { code: 'fqcn', message: 'Use FQCN' },
      { code: 'yaml', message: 'Trailing space', file: 'test.yml', line: 5 },
    ];
    const result = formatJsonSuccess(
      'role',
      'nginx',
      '/tmp',
      baseFiles,
      warnings,
      'cmd',
      Date.now(),
    );

    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0].code).toBe('fqcn');
    expect(result.warnings[1].line).toBe(5);
  });

  test('includes metadata with command', () => {
    const result = formatJsonSuccess(
      'role',
      'nginx',
      '/tmp',
      baseFiles,
      [],
      'new role nginx',
      Date.now(),
    );

    expect(result.metadata.command).toBe('new role nginx');
  });

  test('includes metadata with timestamp', () => {
    const result = formatJsonSuccess('role', 'nginx', '/tmp', baseFiles, [], 'cmd', Date.now());

    expect(result.metadata.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('calculates duration_ms correctly', () => {
    const startTime = Date.now() - 1500; // 1.5 seconds ago
    const result = formatJsonSuccess('role', 'nginx', '/tmp', baseFiles, [], 'cmd', startTime);

    expect(result.metadata.duration_ms).toBeGreaterThanOrEqual(1400);
    expect(result.metadata.duration_ms).toBeLessThan(2000);
  });
});

describe('formatJsonError', () => {
  test('returns correct format_version', () => {
    const result = formatJsonError('API_ERROR', 'API key invalid');
    expect(result.format_version).toBe('1.0');
  });

  test('returns success: false', () => {
    const result = formatJsonError('TEST_ERROR', 'Test message');
    expect(result.success).toBe(false);
  });

  test('includes error code', () => {
    const result = formatJsonError('VALIDATION_ERROR', 'Invalid YAML');
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });

  test('includes error message', () => {
    const result = formatJsonError('TEST', 'Something went wrong');
    expect(result.error.message).toBe('Something went wrong');
  });

  test('includes details when provided', () => {
    const details = { file: 'test.yml', line: 10 };
    const result = formatJsonError('PARSE_ERROR', 'Parse failed', details);

    expect(result.error.details).toEqual(details);
  });

  test('omits details when not provided', () => {
    const result = formatJsonError('SIMPLE_ERROR', 'Simple error');
    expect(result.error.details).toBeUndefined();
  });
});

describe('outputJson', () => {
  let stdoutOutput: string[];
  const originalWrite = process.stdout.write;

  beforeEach(() => {
    stdoutOutput = [];
    process.stdout.write = mock((msg: string) => {
      stdoutOutput.push(msg);
      return true;
    }) as any;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  test('outputs to stdout', () => {
    const data: ErrorResult = {
      format_version: '1.0',
      success: false,
      error: { code: 'TEST', message: 'Test' },
    };

    outputJson(data);

    expect(stdoutOutput.length).toBeGreaterThan(0);
  });

  test('outputs valid JSON', () => {
    const data: ErrorResult = {
      format_version: '1.0',
      success: false,
      error: { code: 'TEST', message: 'Test' },
    };

    outputJson(data);

    const output = stdoutOutput.join('');
    expect(() => JSON.parse(output)).not.toThrow();
  });

  test('outputs formatted JSON (with indentation)', () => {
    const data: ErrorResult = {
      format_version: '1.0',
      success: false,
      error: { code: 'TEST', message: 'Test' },
    };

    outputJson(data);

    const output = stdoutOutput.join('');
    expect(output).toContain('\n');
    expect(output).toContain('  '); // 2-space indentation
  });

  test('outputs generation result', () => {
    const data: GenerationResult = {
      format_version: '1.0',
      success: true,
      type: 'role',
      name: 'nginx',
      output_path: '/tmp/nginx',
      files: [],
      warnings: [],
      metadata: {
        command: 'new role nginx',
        timestamp: '2025-01-20T12:00:00.000Z',
        duration_ms: 1000,
      },
    };

    outputJson(data);

    const output = stdoutOutput.join('');
    const parsed = JSON.parse(output);
    expect(parsed.success).toBe(true);
    expect(parsed.name).toBe('nginx');
  });

  test('appends newline to output', () => {
    const data: ErrorResult = {
      format_version: '1.0',
      success: false,
      error: { code: 'TEST', message: 'Test' },
    };

    outputJson(data);

    const output = stdoutOutput.join('');
    expect(output.endsWith('\n')).toBe(true);
  });
});

describe('lintViolationsToWarnings', () => {
  test('converts violations to warnings', () => {
    const violations = [{ ruleId: 'fqcn', message: 'Use FQCN', file: 'test.yml', line: 5 }];

    const result = lintViolationsToWarnings(violations);

    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('fqcn');
    expect(result[0].message).toBe('Use FQCN');
    expect(result[0].file).toBe('test.yml');
    expect(result[0].line).toBe(5);
  });

  test('handles violations without file', () => {
    const violations = [{ ruleId: 'general', message: 'General issue' }];

    const result = lintViolationsToWarnings(violations);

    expect(result[0].file).toBeUndefined();
  });

  test('handles violations without line', () => {
    const violations = [{ ruleId: 'general', message: 'Issue', file: 'test.yml' }];

    const result = lintViolationsToWarnings(violations);

    expect(result[0].line).toBeUndefined();
  });

  test('handles empty array', () => {
    const result = lintViolationsToWarnings([]);
    expect(result).toEqual([]);
  });

  test('converts multiple violations', () => {
    const violations = [
      { ruleId: 'r1', message: 'M1' },
      { ruleId: 'r2', message: 'M2' },
      { ruleId: 'r3', message: 'M3' },
    ];

    const result = lintViolationsToWarnings(violations);

    expect(result).toHaveLength(3);
    expect(result.map((w) => w.code)).toEqual(['r1', 'r2', 'r3']);
  });
});
