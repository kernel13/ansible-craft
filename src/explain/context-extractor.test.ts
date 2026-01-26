import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { RoleFile } from './file-reader.js';
import {
  extractContext,
  extractFixContext,
  findTaskInFiles,
  parseTaskNameFromError,
} from './context-extractor.js';

describe('parseTaskNameFromError', () => {
  test('parses TASK [name] pattern', () => {
    const error = 'TASK [Install nginx] *****\nfatal: [host]: FAILED!';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Install nginx');
  });

  test('parses JSON "task" pattern', () => {
    const error = '{"task": "Configure firewall", "host": "server1"}';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Configure firewall');
  });

  test('parses undefined variable error pattern', () => {
    const error =
      'The task includes an option with an undefined variable. "Install {{ package_name }}"';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Install {{ package_name }}');
  });

  test('parses fatal error format', () => {
    const error = 'fatal: [host]: TASK: Start service => {"changed": false, "msg": "error"}';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Start service');
  });

  test('parses RUNNING HANDLER pattern', () => {
    const error = 'RUNNING HANDLER [restart nginx] *****';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('restart nginx');
  });

  test('returns undefined when no pattern matches', () => {
    const error = 'Some generic error message without task info';
    const result = parseTaskNameFromError(error);
    expect(result).toBeUndefined();
  });

  test('handles empty error message', () => {
    const result = parseTaskNameFromError('');
    expect(result).toBeUndefined();
  });

  test('trims whitespace from task name', () => {
    const error = 'TASK [  Install nginx  ] *****';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Install nginx');
  });

  test('handles nested brackets in task name', () => {
    const error = 'TASK [Install package [main]] *****';
    const result = parseTaskNameFromError(error);
    expect(result).toBe('Install package [main');
  });
});

describe('findTaskInFiles', () => {
  const createFile = (path: string, content: string, type: RoleFile['type']): RoleFile => ({
    path,
    content,
    type,
  });

  test('finds task by exact name', () => {
    const files: RoleFile[] = [
      createFile(
        'tasks/main.yml',
        '---\n- name: Install nginx\n  package:\n    name: nginx\n',
        'tasks',
      ),
    ];

    const result = findTaskInFiles('Install nginx', files);

    expect(result).toBeDefined();
    expect(result?.file.path).toBe('tasks/main.yml');
    expect(result?.lineIndex).toBe(1);
  });

  test('finds task with double quotes', () => {
    const files: RoleFile[] = [
      createFile(
        'tasks/main.yml',
        '---\n- name: "Start service"\n  service:\n    name: nginx\n',
        'tasks',
      ),
    ];

    const result = findTaskInFiles('Start service', files);

    expect(result).toBeDefined();
    expect(result?.lineIndex).toBe(1);
  });

  test('finds task with single quotes', () => {
    const files: RoleFile[] = [
      createFile(
        'tasks/main.yml',
        "---\n- name: 'Configure app'\n  template:\n    src: app.j2\n",
        'tasks',
      ),
    ];

    const result = findTaskInFiles('Configure app', files);

    expect(result).toBeDefined();
    expect(result?.lineIndex).toBe(1);
  });

  test('searches tasks files', () => {
    const files: RoleFile[] = [
      createFile('tasks/main.yml', '---\n- name: Task in tasks\n', 'tasks'),
      createFile('defaults/main.yml', '---\nvar: value\n', 'defaults'),
    ];

    const result = findTaskInFiles('Task in tasks', files);

    expect(result).toBeDefined();
    expect(result?.file.type).toBe('tasks');
  });

  test('searches handlers files', () => {
    const files: RoleFile[] = [
      createFile('handlers/main.yml', '---\n- name: restart nginx\n  service:\n', 'handlers'),
    ];

    const result = findTaskInFiles('restart nginx', files);

    expect(result).toBeDefined();
    expect(result?.file.type).toBe('handlers');
  });

  test('searches playbook files', () => {
    const files: RoleFile[] = [
      createFile('site.yml', '---\n- hosts: all\n  tasks:\n    - name: Deploy app\n', 'playbook'),
    ];

    const result = findTaskInFiles('Deploy app', files);

    expect(result).toBeDefined();
    expect(result?.file.type).toBe('playbook');
  });

  test('returns undefined when task not found', () => {
    const files: RoleFile[] = [
      createFile('tasks/main.yml', '---\n- name: Different task\n', 'tasks'),
    ];

    const result = findTaskInFiles('Nonexistent task', files);

    expect(result).toBeUndefined();
  });

  test('returns correct line index for task in middle of file', () => {
    const files: RoleFile[] = [
      createFile(
        'tasks/main.yml',
        '---\n- name: First task\n  debug: msg=1\n\n- name: Second task\n  debug: msg=2\n\n- name: Third task\n  debug: msg=3\n',
        'tasks',
      ),
    ];

    const result = findTaskInFiles('Second task', files);

    expect(result?.lineIndex).toBe(4);
  });

  test('skips non-task files (defaults, vars, meta)', () => {
    const files: RoleFile[] = [
      createFile('defaults/main.yml', '---\n# name: Not a task\nvar: value\n', 'defaults'),
      createFile('vars/main.yml', '---\n# name: Also not a task\nother: value\n', 'vars'),
    ];

    const result = findTaskInFiles('Not a task', files);

    expect(result).toBeUndefined();
  });
});

describe('extractContext', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-context-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('extracts variables from defaults files', async () => {
    const roleDir = join(tempDir, 'nginx');
    const defaultsDir = join(roleDir, 'defaults');
    await mkdir(defaultsDir, { recursive: true });
    await writeFile(join(defaultsDir, 'main.yml'), '---\nnginx_port: 80\nnginx_user: www-data\n');

    const result = await extractContext(roleDir);

    expect(result.variables).toEqual({ nginx_port: 80, nginx_user: 'www-data' });
  });

  test('extracts variables from vars files', async () => {
    const roleDir = join(tempDir, 'nginx');
    const varsDir = join(roleDir, 'vars');
    await mkdir(varsDir, { recursive: true });
    await writeFile(join(varsDir, 'main.yml'), '---\ninternal_var: secret\n');

    const result = await extractContext(roleDir);

    expect(result.variables).toEqual({ internal_var: 'secret' });
  });

  test('merges variables from defaults and vars', async () => {
    const roleDir = join(tempDir, 'nginx');
    const defaultsDir = join(roleDir, 'defaults');
    const varsDir = join(roleDir, 'vars');
    await mkdir(defaultsDir, { recursive: true });
    await mkdir(varsDir, { recursive: true });
    await writeFile(join(defaultsDir, 'main.yml'), '---\nport: 80\n');
    await writeFile(join(varsDir, 'main.yml'), '---\nhost: localhost\n');

    const result = await extractContext(roleDir);

    expect(result.variables).toEqual({ port: 80, host: 'localhost' });
  });

  test('extracts handler names', async () => {
    const roleDir = join(tempDir, 'nginx');
    const handlersDir = join(roleDir, 'handlers');
    await mkdir(handlersDir, { recursive: true });
    await writeFile(
      join(handlersDir, 'main.yml'),
      '---\n- name: restart nginx\n  service:\n    name: nginx\n\n- name: reload nginx\n  service:\n    name: nginx\n',
    );

    const result = await extractContext(roleDir);

    expect(result.handlers).toContain('restart nginx');
    expect(result.handlers).toContain('reload nginx');
  });

  test('builds role structure for multi-file roles', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');
    const handlersDir = join(roleDir, 'handlers');
    const defaultsDir = join(roleDir, 'defaults');
    await mkdir(tasksDir, { recursive: true });
    await mkdir(handlersDir, { recursive: true });
    await mkdir(defaultsDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\n');
    await writeFile(join(handlersDir, 'main.yml'), '---\n');
    await writeFile(join(defaultsDir, 'main.yml'), '---\n');

    const result = await extractContext(roleDir);

    expect(result.roleStructure).toBeDefined();
    expect(result.roleStructure).toContain('tasks');
    expect(result.roleStructure).toContain('handlers');
    expect(result.roleStructure).toContain('defaults');
  });

  test('does not build role structure for single file', async () => {
    const playbookPath = join(tempDir, 'playbook.yml');
    await writeFile(playbookPath, '---\n- hosts: all\n');

    const result = await extractContext(playbookPath);

    expect(result.roleStructure).toBeUndefined();
  });

  test('handles empty/nonexistent path', async () => {
    const result = await extractContext('/nonexistent/path');

    expect(result.variables).toEqual({});
    expect(result.handlers).toEqual([]);
    expect(result.taskContext).toBe('');
  });

  test('skips unparseable YAML files', async () => {
    const roleDir = join(tempDir, 'broken');
    const defaultsDir = join(roleDir, 'defaults');
    await mkdir(defaultsDir, { recursive: true });
    await writeFile(join(defaultsDir, 'main.yml'), 'invalid: yaml: content: [');

    const result = await extractContext(roleDir);

    expect(result.variables).toEqual({});
  });
});

describe('extractFixContext', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-fix-context-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('extracts task context for error', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');
    await mkdir(tasksDir, { recursive: true });
    await writeFile(
      join(tasksDir, 'main.yml'),
      '---\n- name: First task\n  debug: msg=1\n\n- name: Failing task\n  command: /bin/false\n\n- name: Last task\n  debug: msg=3\n',
    );

    const result = await extractFixContext('TASK [Failing task] *****\nfatal error', roleDir);

    expect(result.taskContext).toContain('Failing task');
  });

  test('extracts variables for fix context', async () => {
    const roleDir = join(tempDir, 'app');
    const defaultsDir = join(roleDir, 'defaults');
    const tasksDir = join(roleDir, 'tasks');
    await mkdir(defaultsDir, { recursive: true });
    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(defaultsDir, 'main.yml'), '---\napp_port: 8080\n');
    await writeFile(join(tasksDir, 'main.yml'), '---\n- name: Start app\n  command: start\n');

    const result = await extractFixContext('TASK [Start app] *****\nerror', roleDir);

    expect(result.variables).toEqual({ app_port: 8080 });
  });

  test('extracts handlers for fix context', async () => {
    const roleDir = join(tempDir, 'app');
    const handlersDir = join(roleDir, 'handlers');
    const tasksDir = join(roleDir, 'tasks');
    await mkdir(handlersDir, { recursive: true });
    await mkdir(tasksDir, { recursive: true });
    await writeFile(
      join(handlersDir, 'main.yml'),
      '---\n- name: restart app\n  service: name=app\n',
    );
    await writeFile(
      join(tasksDir, 'main.yml'),
      '---\n- name: Configure app\n  template: src=app.j2\n',
    );

    const result = await extractFixContext('TASK [Configure app] *****', roleDir);

    expect(result.handlers).toContain('restart app');
  });

  test('returns empty taskContext when task not found', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');
    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\n- name: Different task\n  debug: msg=1\n');

    const result = await extractFixContext('TASK [Unknown task] *****', roleDir);

    expect(result.taskContext).toBe('');
  });

  test('returns empty taskContext when no task name in error', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');
    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\n- name: Some task\n  debug: msg=1\n');

    const result = await extractFixContext('Generic error without task name', roleDir);

    expect(result.taskContext).toBe('');
  });
});
