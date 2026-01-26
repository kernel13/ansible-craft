import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readAnsiblePath, readRoleDirectory, type RoleFile } from './file-reader.js';

describe('readAnsiblePath', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-file-reader-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('file reading', () => {
    test('reads single YAML file', async () => {
      const filePath = join(tempDir, 'playbook.yml');
      await writeFile(filePath, '---\n- name: Test task\n  debug:\n    msg: hello\n');

      const result = await readAnsiblePath(filePath);

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe(filePath);
      expect(result[0].content).toContain('Test task');
    });

    test('infers type from tasks/ directory', async () => {
      const tasksDir = join(tempDir, 'tasks');
      await mkdir(tasksDir, { recursive: true });
      const filePath = join(tasksDir, 'main.yml');
      await writeFile(filePath, '---\n- name: Install package\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('tasks');
    });

    test('infers type from handlers/ directory', async () => {
      const handlersDir = join(tempDir, 'handlers');
      await mkdir(handlersDir, { recursive: true });
      const filePath = join(handlersDir, 'main.yml');
      await writeFile(filePath, '---\n- name: restart nginx\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('handlers');
    });

    test('infers type from defaults/ directory', async () => {
      const defaultsDir = join(tempDir, 'defaults');
      await mkdir(defaultsDir, { recursive: true });
      const filePath = join(defaultsDir, 'main.yml');
      await writeFile(filePath, '---\nnginx_port: 80\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('defaults');
    });

    test('infers type from vars/ directory', async () => {
      const varsDir = join(tempDir, 'vars');
      await mkdir(varsDir, { recursive: true });
      const filePath = join(varsDir, 'main.yml');
      await writeFile(filePath, '---\ninternal_var: value\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('vars');
    });

    test('infers type from meta/ directory', async () => {
      const metaDir = join(tempDir, 'meta');
      await mkdir(metaDir, { recursive: true });
      const filePath = join(metaDir, 'main.yml');
      await writeFile(filePath, '---\ngalaxy_info:\n  author: test\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('meta');
    });

    test('infers type from templates/ directory', async () => {
      const templatesDir = join(tempDir, 'templates');
      await mkdir(templatesDir, { recursive: true });
      const filePath = join(templatesDir, 'nginx.conf.j2');
      await writeFile(filePath, 'server {\n  listen {{ nginx_port }};\n}');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('templates');
    });

    test('defaults to playbook type for standalone files', async () => {
      const filePath = join(tempDir, 'site.yml');
      await writeFile(filePath, '---\n- hosts: all\n');

      const result = await readAnsiblePath(filePath);

      expect(result[0].type).toBe('playbook');
    });
  });

  describe('directory reading', () => {
    test('reads role directory structure', async () => {
      const roleDir = join(tempDir, 'nginx');
      const tasksDir = join(roleDir, 'tasks');
      await mkdir(tasksDir, { recursive: true });
      await writeFile(join(tasksDir, 'main.yml'), '---\n- name: Test\n');

      const result = await readAnsiblePath(roleDir);

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((f) => f.type === 'tasks')).toBe(true);
    });
  });

  describe('error handling', () => {
    test('returns empty array for non-existent path', async () => {
      const result = await readAnsiblePath('/nonexistent/path.yml');
      expect(result).toEqual([]);
    });
  });
});

describe('readRoleDirectory', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-role-reader-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('reads files from standard role subdirectories', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');
    const defaultsDir = join(roleDir, 'defaults');

    await mkdir(tasksDir, { recursive: true });
    await mkdir(defaultsDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\n- name: Task\n');
    await writeFile(join(defaultsDir, 'main.yml'), '---\nvar: value\n');

    const result = await readRoleDirectory(roleDir);

    expect(result.length).toBe(2);
    expect(result.find((f) => f.type === 'tasks')).toBeDefined();
    expect(result.find((f) => f.type === 'defaults')).toBeDefined();
  });

  test('only reads .yml, .yaml, .j2 files', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');

    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\n');
    await writeFile(join(tasksDir, 'extra.yaml'), '---\n');
    await writeFile(join(tasksDir, 'template.j2'), 'content');
    await writeFile(join(tasksDir, 'readme.txt'), 'ignore me');
    await writeFile(join(tasksDir, 'script.sh'), '#!/bin/bash');

    const result = await readRoleDirectory(roleDir);

    // Should only read yml, yaml, j2 files (3 files from tasks/)
    expect(result).toHaveLength(3);
  });

  test('includes README.md if present', async () => {
    const roleDir = join(tempDir, 'nginx');
    const tasksDir = join(roleDir, 'tasks');

    await mkdir(tasksDir, { recursive: true });
    await writeFile(join(tasksDir, 'main.yml'), '---\ncontent\n');
    await writeFile(join(roleDir, 'README.md'), '# Nginx Role\n\nInstalls nginx.');

    const result = await readRoleDirectory(roleDir);

    const readme = result.find((f) => f.path === 'README.md');
    expect(readme).toBeDefined();
    expect(readme?.type).toBe('meta');
    expect(readme?.content).toContain('Nginx Role');
  });

  test('handles missing subdirectories gracefully', async () => {
    const roleDir = join(tempDir, 'empty');
    await mkdir(roleDir, { recursive: true });

    const result = await readRoleDirectory(roleDir);

    // No README, no subdirs = empty result
    expect(result).toEqual([]);
  });

  test('constructs correct relative paths', async () => {
    const roleDir = join(tempDir, 'nginx');
    const handlersDir = join(roleDir, 'handlers');

    await mkdir(handlersDir, { recursive: true });
    await writeFile(join(handlersDir, 'main.yml'), '---\n- name: Handler\n');
    await writeFile(join(handlersDir, 'extra.yml'), '---\n- name: Extra\n');

    const result = await readRoleDirectory(roleDir);

    expect(result).toHaveLength(2);
    // File order is not guaranteed by filesystem, check both paths exist
    const paths = result.map((f) => f.path).sort();
    expect(paths).toEqual(['handlers/extra.yml', 'handlers/main.yml']);
  });
});
