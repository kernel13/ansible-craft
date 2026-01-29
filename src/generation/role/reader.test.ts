/**
 * Tests for existing role reader.
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readExistingRole, formatExistingRoleForPrompt } from './reader.js';

describe('readExistingRole', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a unique test directory for each test
    testDir = join(tmpdir(), `ansible-craft-test-${Date.now()}-${Math.random()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('returns exists: false for non-existent role', async () => {
    const result = await readExistingRole(testDir, 'nonexistent');

    expect(result.exists).toBe(false);
    expect(result.files.size).toBe(0);
    expect(result.structure.directories).toHaveLength(0);
    expect(result.structure.hasTests).toBe(false);
    expect(result.structure.hasMolecule).toBe(false);
  });

  test('reads empty role directory', async () => {
    const roleName = 'empty-role';
    const roleDir = join(testDir, roleName);
    await mkdir(roleDir);

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.size).toBe(0);
    expect(result.structure.directories).toHaveLength(0);
  });

  test('reads basic role structure', async () => {
    const roleName = 'basic-role';
    const roleDir = join(testDir, roleName);

    // Create basic structure
    await mkdir(join(roleDir, 'tasks'), { recursive: true });
    await mkdir(join(roleDir, 'defaults'), { recursive: true });
    await mkdir(join(roleDir, 'handlers'), { recursive: true });

    // Write some files
    await writeFile(
      join(roleDir, 'tasks', 'main.yml'),
      '---\n- name: Test task\n  ansible.builtin.debug:\n    msg: "Hello"',
    );
    await writeFile(join(roleDir, 'defaults', 'main.yml'), '---\ntest_var: value');
    await writeFile(join(roleDir, 'README.md'), '# Test Role\n\nThis is a test role.');

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.size).toBe(3);
    expect(result.files.has('tasks/main.yml')).toBe(true);
    expect(result.files.has('defaults/main.yml')).toBe(true);
    expect(result.files.has('README.md')).toBe(true);

    expect(result.structure.directories).toContain('tasks');
    expect(result.structure.directories).toContain('defaults');
    expect(result.structure.directories).toContain('handlers');
  });

  test('detects Molecule tests', async () => {
    const roleName = 'molecule-role';
    const roleDir = join(testDir, roleName);

    // Create Molecule structure
    await mkdir(join(roleDir, 'molecule', 'default'), { recursive: true });
    await writeFile(
      join(roleDir, 'molecule', 'default', 'molecule.yml'),
      '---\ndriver:\n  name: docker',
    );

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.structure.hasMolecule).toBe(true);
    expect(result.structure.hasTests).toBe(true);
    expect(result.files.has('molecule/default/molecule.yml')).toBe(true);
  });

  test('detects test directories', async () => {
    const roleName = 'test-role';
    const roleDir = join(testDir, roleName);

    // Create test structure
    await mkdir(join(roleDir, 'tests'), { recursive: true });
    await writeFile(join(roleDir, 'tests', 'test.yml'), '---\n- name: Test');

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.structure.hasTests).toBe(true);
    expect(result.files.has('tests/test.yml')).toBe(true);
  });

  test('reads Jinja2 templates', async () => {
    const roleName = 'template-role';
    const roleDir = join(testDir, roleName);

    // Create template
    await mkdir(join(roleDir, 'templates'), { recursive: true });
    await writeFile(
      join(roleDir, 'templates', 'config.j2'),
      '# Config file\nport={{ port }}\nhost={{ host }}',
    );

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.has('templates/config.j2')).toBe(true);
    expect(result.files.get('templates/config.j2')).toContain('port={{ port }}');
  });

  test('skips hidden files and directories', async () => {
    const roleName = 'hidden-role';
    const roleDir = join(testDir, roleName);

    // Create hidden files/dirs
    await mkdir(join(roleDir, '.git'), { recursive: true });
    await writeFile(join(roleDir, '.git', 'config'), 'test');
    await writeFile(join(roleDir, '.gitignore'), 'test');

    // Create normal file
    await mkdir(join(roleDir, 'tasks'), { recursive: true });
    await writeFile(join(roleDir, 'tasks', 'main.yml'), '---\n- name: Test');

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.has('.gitignore')).toBe(false);
    expect(result.files.has('.git/config')).toBe(false);
    expect(result.files.has('tasks/main.yml')).toBe(true);
  });

  test('skips non-readable extensions', async () => {
    const roleName = 'binary-role';
    const roleDir = join(testDir, roleName);

    await mkdir(join(roleDir, 'files'), { recursive: true });

    // Create binary file
    await writeFile(join(roleDir, 'files', 'binary.bin'), Buffer.from([0x00, 0x01, 0x02]));

    // Create readable file
    await writeFile(join(roleDir, 'files', 'script.sh'), '#!/bin/bash\necho "test"');

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.has('files/binary.bin')).toBe(false);
    expect(result.files.has('files/script.sh')).toBe(false); // .sh is not in READABLE_EXTENSIONS
  });

  test('handles large files gracefully', async () => {
    const roleName = 'large-role';
    const roleDir = join(testDir, roleName);

    await mkdir(join(roleDir, 'tasks'), { recursive: true });

    // Create a file larger than MAX_FILE_SIZE (1MB)
    const largeContent = 'x'.repeat(2 * 1024 * 1024); // 2MB
    await writeFile(join(roleDir, 'tasks', 'large.yml'), largeContent);

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.files.has('tasks/large.yml')).toBe(true);
    expect(result.files.get('tasks/large.yml')).toContain('[File too large to read');
  });

  test('handles nested directory structures', async () => {
    const roleName = 'nested-role';
    const roleDir = join(testDir, roleName);

    // Create deeply nested structure
    await mkdir(join(roleDir, 'molecule', 'default', 'tests'), { recursive: true });
    await writeFile(
      join(roleDir, 'molecule', 'default', 'tests', 'test_default.py'),
      'def test_service():\n    pass',
    );

    const result = await readExistingRole(testDir, roleName);

    expect(result.exists).toBe(true);
    expect(result.structure.directories).toContain('molecule');
    expect(result.structure.directories).toContain('molecule/default');
    expect(result.structure.directories).toContain('molecule/default/tests');
  });
});

describe('formatExistingRoleForPrompt', () => {
  test('returns empty string for non-existent role', () => {
    const content = {
      exists: false,
      files: new Map(),
      structure: {
        directories: [],
        hasTests: false,
        hasMolecule: false,
      },
    };

    const formatted = formatExistingRoleForPrompt(content);
    expect(formatted).toBe('');
  });

  test('returns empty string for empty role', () => {
    const content = {
      exists: true,
      files: new Map(),
      structure: {
        directories: [],
        hasTests: false,
        hasMolecule: false,
      },
    };

    const formatted = formatExistingRoleForPrompt(content);
    expect(formatted).toBe('');
  });

  test('formats role content with grouped directories', () => {
    const content = {
      exists: true,
      files: new Map([
        ['tasks/main.yml', '---\n- name: Test task'],
        ['defaults/main.yml', '---\ntest_var: value'],
        ['README.md', '# Test Role'],
      ]),
      structure: {
        directories: ['tasks', 'defaults'],
        hasTests: false,
        hasMolecule: false,
      },
    };

    const formatted = formatExistingRoleForPrompt(content);

    expect(formatted).toContain('## Existing Role Implementation');
    expect(formatted).toContain('### Directory: tasks');
    expect(formatted).toContain('### Directory: defaults');
    expect(formatted).toContain('**File: main.yml**');
    expect(formatted).toContain('**File: README.md**');
    expect(formatted).toContain('- Preserves working functionality');
    expect(formatted).toContain('- Applies best practices');
  });

  test('sorts directories and files consistently', () => {
    const content = {
      exists: true,
      files: new Map([
        ['vars/main.yml', '---\ninternal_var: value'],
        ['tasks/main.yml', '---\n- name: Task'],
        ['defaults/main.yml', '---\ndefault_var: value'],
        ['README.md', '# Role'],
      ]),
      structure: {
        directories: ['tasks', 'defaults', 'vars'],
        hasTests: false,
        hasMolecule: false,
      },
    };

    const formatted = formatExistingRoleForPrompt(content);

    // Check that directories appear in sorted order
    const defaultsIdx = formatted.indexOf('### Directory: defaults');
    const tasksIdx = formatted.indexOf('### Directory: tasks');
    const varsIdx = formatted.indexOf('### Directory: vars');
    const rootIdx = formatted.indexOf('### Directory: .');

    expect(rootIdx).toBeLessThan(defaultsIdx);
    expect(defaultsIdx).toBeLessThan(tasksIdx);
    expect(tasksIdx).toBeLessThan(varsIdx);
  });
});
