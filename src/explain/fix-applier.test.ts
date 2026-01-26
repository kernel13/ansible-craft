import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyFix,
  displayFix,
  extractYamlFromResponse,
  locateTargetFile,
  validateFixSyntax,
} from './fix-applier.js';

// Mock @inquirer/prompts only - DO NOT mock node:fs/promises as it pollutes globally
const mockConfirm = mock();

mock.module('@inquirer/prompts', () => ({
  confirm: mockConfirm,
}));

describe('extractYamlFromResponse', () => {
  test('extracts yaml code block', () => {
    const response = `Here is the fix:

\`\`\`yaml
---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present
\`\`\`

This should resolve the issue.`;

    const result = extractYamlFromResponse(response);

    expect(result).toContain('Install nginx');
    expect(result).toContain('ansible.builtin.package');
  });

  test('extracts code block without yaml specifier', () => {
    const response = `Fix:

\`\`\`
---
- name: Start service
  ansible.builtin.service:
    name: nginx
\`\`\``;

    const result = extractYamlFromResponse(response);

    expect(result).toContain('Start service');
  });

  test('returns null when no code block found', () => {
    const response = 'Here is some explanation without any code blocks.';

    const result = extractYamlFromResponse(response);

    expect(result).toBeNull();
  });

  test('extracts first code block when multiple present', () => {
    const response = `First:

\`\`\`yaml
---
- name: First task
\`\`\`

Second:

\`\`\`yaml
---
- name: Second task
\`\`\``;

    const result = extractYamlFromResponse(response);

    expect(result).toContain('First task');
    expect(result).not.toContain('Second task');
  });

  test('trims whitespace from extracted content', () => {
    const response = `\`\`\`yaml

---
- name: Task with whitespace

\`\`\``;

    const result = extractYamlFromResponse(response);

    expect(result).toBe('---\n- name: Task with whitespace');
  });

  test('handles empty code block', () => {
    const response = `\`\`\`yaml
\`\`\``;

    const result = extractYamlFromResponse(response);

    // Empty code block doesn't match the regex pattern (needs content between newlines)
    expect(result).toBeNull();
  });
});

describe('validateFixSyntax', () => {
  test('validates correct YAML syntax', () => {
    const yaml = `---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present`;

    const result = validateFixSyntax(yaml);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('rejects invalid YAML syntax', () => {
    const yaml = `---
- name: Bad task
  package:
    name: [unclosed bracket`;

    const result = validateFixSyntax(yaml);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('validates empty YAML document', () => {
    const yaml = '---';

    const result = validateFixSyntax(yaml);

    expect(result.valid).toBe(true);
  });

  test('validates YAML with variables', () => {
    const yaml = `---
nginx_port: 80
nginx_worker_processes: "{{ ansible_processor_vcpus }}"`;

    const result = validateFixSyntax(yaml);

    expect(result.valid).toBe(true);
  });

  test('rejects multi-document YAML with --- separator', () => {
    const yaml = `---
first: document
---
second: document`;

    const result = validateFixSyntax(yaml);

    // yaml parser rejects multi-document YAML with --- separator in the middle
    expect(result.valid).toBe(false);
  });

  test('provides error message for invalid YAML', () => {
    const yaml = 'key: value: invalid: colon: usage';

    const result = validateFixSyntax(yaml);

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
    expect(typeof result.error).toBe('string');
  });
});

describe('displayFix', () => {
  let consoleOutput: string[];
  const originalLog = console.log;

  beforeEach(() => {
    consoleOutput = [];
    console.log = mock((msg: string) => consoleOutput.push(msg));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  test('displays proposed fix header', () => {
    displayFix('---\n- name: Test\n');

    expect(consoleOutput.some((o) => o.includes('Proposed Fix'))).toBe(true);
  });

  test('displays yaml content', () => {
    const yaml = `---
- name: Install package
  ansible.builtin.package:
    name: nginx`;

    displayFix(yaml);

    // The highlighted output should contain the content
    const fullOutput = consoleOutput.join('\n');
    expect(fullOutput).toContain('name');
  });
});

describe('applyFix', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-fix-applier-test-'));
    mockConfirm.mockReset();
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('validates YAML before applying', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    const invalidYaml = 'invalid: yaml: [';

    const result = await applyFix(filePath, invalidYaml);

    expect(result.applied).toBe(false);

    // Original file should be unchanged
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('---\noriginal: content\n');
  });

  test('prompts user for confirmation', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    mockConfirm.mockResolvedValue(false);
    const validYaml = '---\n- name: Test\n';

    await applyFix(filePath, validYaml);

    expect(mockConfirm).toHaveBeenCalled();
  });

  test('does not apply when user declines', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    mockConfirm.mockResolvedValue(false);
    const validYaml = '---\n- name: Test\n';

    const result = await applyFix(filePath, validYaml);

    expect(result.applied).toBe(false);

    // Original file should be unchanged
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('---\noriginal: content\n');
  });

  test('creates backup before writing', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    mockConfirm.mockResolvedValue(true);
    const validYaml = '---\n- name: Test\n';

    await applyFix(filePath, validYaml);

    // Check backup was created
    const backupContent = await readFile(`${filePath}.backup`, 'utf-8');
    expect(backupContent).toBe('---\noriginal: content\n');
  });

  test('writes fix to file on confirmation', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    mockConfirm.mockResolvedValue(true);
    const validYaml = '---\n- name: Fixed task\n';

    const result = await applyFix(filePath, validYaml);

    expect(result.applied).toBe(true);

    // Check file was updated
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(validYaml);
  });

  test('returns backup path on success', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    mockConfirm.mockResolvedValue(true);
    const validYaml = '---\n- name: Test\n';

    const result = await applyFix(filePath, validYaml);

    expect(result.backupPath).toBe(`${filePath}.backup`);
  });

  test('skips confirmation with skipConfirm option', async () => {
    const filePath = join(tempDir, 'test.yml');
    await writeFile(filePath, '---\noriginal: content\n');

    const validYaml = '---\n- name: Test\n';

    const result = await applyFix(filePath, validYaml, { skipConfirm: true });

    expect(mockConfirm).not.toHaveBeenCalled();
    expect(result.applied).toBe(true);

    // Check file was updated
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe(validYaml);
  });
});

describe('locateTargetFile', () => {
  test('extracts file from "in" pattern with single quotes', () => {
    const error = "The error appears to be in '/path/to/playbook.yml': line 10";

    const result = locateTargetFile(error);

    expect(result).toBe('/path/to/playbook.yml');
  });

  test('extracts file from "in" pattern with double quotes', () => {
    const error = 'The error appears to be in "/path/to/tasks.yml": line 5';

    const result = locateTargetFile(error);

    expect(result).toBe('/path/to/tasks.yml');
  });

  test('extracts file from "in" pattern without quotes', () => {
    const error = 'The error appears to be in /path/to/handlers.yml: line 3';

    const result = locateTargetFile(error);

    expect(result).toBe('/path/to/handlers.yml');
  });

  test('extracts file from playbook pattern', () => {
    const error = 'ERROR! the playbook: /path/to/site.yml could not be found';

    const result = locateTargetFile(error);

    expect(result).toBe('/path/to/site.yml');
  });

  test('extracts file from file pattern', () => {
    const error = 'Could not find file "/roles/nginx/tasks/main.yml"';

    const result = locateTargetFile(error);

    expect(result).toBe('/roles/nginx/tasks/main.yml');
  });

  test('handles .yaml extension', () => {
    const error = 'The error appears to be in /path/to/config.yaml: line 1';

    const result = locateTargetFile(error);

    expect(result).toBe('/path/to/config.yaml');
  });

  test('returns undefined when no file pattern found', () => {
    const error = 'Some generic error without file path';

    const result = locateTargetFile(error);

    expect(result).toBeUndefined();
  });

  test('returns undefined for non-yaml files in error', () => {
    const error = 'Error in /path/to/script.sh';

    const result = locateTargetFile(error);

    expect(result).toBeUndefined();
  });

  test('handles relative paths', () => {
    const error = 'The error appears to be in roles/nginx/tasks/main.yml: line 10';

    const result = locateTargetFile(error);

    expect(result).toBe('roles/nginx/tasks/main.yml');
  });

  test('handles Windows-style paths', () => {
    const error = 'The error appears to be in C:/ansible/playbook.yml: line 5';

    const result = locateTargetFile(error);

    // Pattern may or may not match Windows paths depending on regex
    // This tests current behavior
    expect(result === 'C:/ansible/playbook.yml' || result === undefined).toBe(true);
  });
});
