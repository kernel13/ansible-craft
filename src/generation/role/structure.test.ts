import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REQUIRED_FILES, ROLE_DIRECTORIES, createRoleStructure, roleExists } from './structure.js';

describe('createRoleStructure', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('directory creation', () => {
    test('should create role root directory', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      expect(result.roleDir).toBe(join(tempDir, 'test-role'));
      expect(result.createdDirs).toContain(result.roleDir);
    });

    test('should create all standard role directories', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      const dirs = await readdir(result.roleDir);
      expect(dirs).toContain('tasks');
      expect(dirs).toContain('handlers');
      expect(dirs).toContain('defaults');
      expect(dirs).toContain('vars');
      expect(dirs).toContain('templates');
      expect(dirs).toContain('files');
      expect(dirs).toContain('meta');
      expect(dirs).toContain('molecule');
    });

    test('should create molecule/default subdirectory', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      const moleculeDir = join(result.roleDir, 'molecule');
      const moleculeContents = await readdir(moleculeDir);
      expect(moleculeContents).toContain('default');
    });
  });

  describe('gitkeep files', () => {
    test('should create .gitkeep in templates directory', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      const templatesDir = join(result.roleDir, 'templates');
      const contents = await readdir(templatesDir);
      expect(contents).toContain('.gitkeep');
    });

    test('should create .gitkeep in files directory', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      const filesDir = join(result.roleDir, 'files');
      const contents = await readdir(filesDir);
      expect(contents).toContain('.gitkeep');
    });

    test('should report created gitkeep files', async () => {
      const result = await createRoleStructure({
        roleName: 'test-role',
        outputDir: tempDir,
      });

      expect(result.createdGitkeeps.length).toBe(2);
    });
  });

  describe('dry run mode', () => {
    test('should not create directories in dry run', async () => {
      const result = await createRoleStructure({
        roleName: 'dry-run-role',
        outputDir: tempDir,
        dryRun: true,
      });

      const roleExists = await readdir(result.roleDir).then(
        () => true,
        () => false,
      );

      expect(roleExists).toBe(false);
    });

    test('should still report what would be created', async () => {
      const result = await createRoleStructure({
        roleName: 'dry-run-role',
        outputDir: tempDir,
        dryRun: true,
      });

      expect(result.createdDirs.length).toBeGreaterThan(0);
      expect(result.createdGitkeeps.length).toBe(2);
    });
  });
});

describe('roleExists', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'ansible-craft-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test('should return false for non-existent role', () => {
    expect(roleExists(tempDir, 'nonexistent')).toBe(false);
  });

  test('should return true for existing role', async () => {
    await createRoleStructure({
      roleName: 'existing-role',
      outputDir: tempDir,
    });

    expect(roleExists(tempDir, 'existing-role')).toBe(true);
  });
});

describe('constants', () => {
  test('ROLE_DIRECTORIES should contain standard Ansible directories', () => {
    expect(ROLE_DIRECTORIES).toContain('tasks');
    expect(ROLE_DIRECTORIES).toContain('handlers');
    expect(ROLE_DIRECTORIES).toContain('defaults');
    expect(ROLE_DIRECTORIES).toContain('meta');
  });

  test('REQUIRED_FILES should contain essential role files', () => {
    expect(REQUIRED_FILES).toContain('tasks/main.yml');
    expect(REQUIRED_FILES).toContain('defaults/main.yml');
    expect(REQUIRED_FILES).toContain('meta/main.yml');
    expect(REQUIRED_FILES).toContain('README.md');
  });
});
