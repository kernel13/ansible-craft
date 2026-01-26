import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import path from 'node:path';
import type { GeneratedFile } from './role/parser.js';
import {
  displayPlaybookTree,
  displayRoleTree,
  writeGeneratedPlaybook,
  writeGeneratedRole,
  type WritePlaybookResult,
  type WriteResult,
} from './writer.js';

// We test the functions with dryRun=true to avoid file system operations
// The structure functions are tested separately in their own test files

describe('writeGeneratedRole', () => {
  const testFiles: GeneratedFile[] = [
    { path: 'tasks/main.yml', content: '---\n- name: Test task\n  debug:\n    msg: hello\n' },
    { path: 'defaults/main.yml', content: '---\ntest_var: value\n' },
  ];

  describe('dry run mode', () => {
    test('returns correct role directory path', async () => {
      const result = await writeGeneratedRole(testFiles, {
        roleName: 'test-role',
        outputDir: '/tmp/test',
        dryRun: true,
        quiet: true,
      });

      expect(result.roleDir).toBe('/tmp/test/test-role');
    });

    test('lists files that would be written', async () => {
      const result = await writeGeneratedRole(testFiles, {
        roleName: 'nginx',
        outputDir: '/tmp/roles',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toContain('tasks/main.yml');
      expect(result.filesWritten).toContain('defaults/main.yml');
    });

    test('marks result as dry run', async () => {
      const result = await writeGeneratedRole(testFiles, {
        roleName: 'test-role',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.dryRun).toBe(true);
    });

    test('uses cwd when outputDir not specified', async () => {
      const result = await writeGeneratedRole(testFiles, {
        roleName: 'test-role',
        dryRun: true,
        quiet: true,
      });

      expect(result.roleDir).toBe(path.join(process.cwd(), 'test-role'));
    });

    test('handles empty files array', async () => {
      const result = await writeGeneratedRole([], {
        roleName: 'empty-role',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toHaveLength(0);
    });

    test('preserves file paths in result', async () => {
      const files: GeneratedFile[] = [
        { path: 'handlers/main.yml', content: '---\n' },
        { path: 'templates/nginx.conf.j2', content: 'server {}\n' },
      ];

      const result = await writeGeneratedRole(files, {
        roleName: 'nginx',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toContain('handlers/main.yml');
      expect(result.filesWritten).toContain('templates/nginx.conf.j2');
    });
  });

  describe('force mode', () => {
    test('force=true does not prompt for confirmation', async () => {
      // This test verifies that force mode works correctly in dry run
      const result = await writeGeneratedRole(testFiles, {
        roleName: 'test-role',
        outputDir: '/nonexistent/path',
        dryRun: true,
        force: true,
        quiet: true,
      });

      expect(result.dryRun).toBe(true);
    });
  });
});

describe('writeGeneratedPlaybook', () => {
  const testFiles: GeneratedFile[] = [
    { path: 'playbook.yml', content: '---\n- hosts: all\n  tasks: []\n' },
    { path: 'inventory.ini', content: '[webservers]\nweb01\n' },
    { path: 'group_vars/all.yml', content: '---\nvar: value\n' },
  ];

  describe('dry run mode', () => {
    test('returns correct playbook directory path', async () => {
      const result = await writeGeneratedPlaybook(testFiles, {
        playbookName: 'deploy-app',
        outputDir: '/tmp/playbooks',
        dryRun: true,
        quiet: true,
      });

      expect(result.playbookDir).toBe('/tmp/playbooks/deploy-app');
    });

    test('lists files that would be written', async () => {
      const result = await writeGeneratedPlaybook(testFiles, {
        playbookName: 'lamp-stack',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toContain('playbook.yml');
      expect(result.filesWritten).toContain('inventory.ini');
      expect(result.filesWritten).toContain('group_vars/all.yml');
    });

    test('marks result as dry run', async () => {
      const result = await writeGeneratedPlaybook(testFiles, {
        playbookName: 'test-playbook',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.dryRun).toBe(true);
    });

    test('uses cwd when outputDir not specified', async () => {
      const result = await writeGeneratedPlaybook(testFiles, {
        playbookName: 'test-playbook',
        dryRun: true,
        quiet: true,
      });

      expect(result.playbookDir).toBe(path.join(process.cwd(), 'test-playbook'));
    });

    test('handles empty files array', async () => {
      const result = await writeGeneratedPlaybook([], {
        playbookName: 'empty-playbook',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toHaveLength(0);
    });

    test('handles nested group_vars files', async () => {
      const files: GeneratedFile[] = [
        { path: 'group_vars/webservers.yml', content: '---\n' },
        { path: 'group_vars/databases.yml', content: '---\n' },
      ];

      const result = await writeGeneratedPlaybook(files, {
        playbookName: 'multi-tier',
        outputDir: '/tmp',
        dryRun: true,
        quiet: true,
      });

      expect(result.filesWritten).toContain('group_vars/webservers.yml');
      expect(result.filesWritten).toContain('group_vars/databases.yml');
    });
  });

  describe('force mode', () => {
    test('force=true does not prompt for confirmation', async () => {
      const result = await writeGeneratedPlaybook(testFiles, {
        playbookName: 'test-playbook',
        outputDir: '/nonexistent/path',
        dryRun: true,
        force: true,
        quiet: true,
      });

      expect(result.dryRun).toBe(true);
    });
  });
});

describe('displayRoleTree', () => {
  test('outputs role tree structure', () => {
    const consoleOutput: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => consoleOutput.push(msg));

    const result: WriteResult = {
      roleDir: '/tmp/nginx',
      filesWritten: ['tasks/main.yml', 'defaults/main.yml', 'handlers/main.yml'],
      dirsCreated: ['tasks', 'defaults', 'handlers'],
      dryRun: false,
    };

    displayRoleTree(result);

    // Restore console.log
    console.log = originalLog;

    // Should have output something (the tree structure)
    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(consoleOutput[0]).toContain('/tmp/nginx');
  });

  test('handles empty files list', () => {
    const consoleOutput: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => consoleOutput.push(msg));

    const result: WriteResult = {
      roleDir: '/tmp/empty',
      filesWritten: [],
      dirsCreated: [],
      dryRun: false,
    };

    displayRoleTree(result);

    console.log = originalLog;

    // Should still output the directory path
    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(consoleOutput[0]).toContain('/tmp/empty');
  });
});

describe('displayPlaybookTree', () => {
  test('outputs playbook tree structure', () => {
    const consoleOutput: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => consoleOutput.push(msg));

    const result: WritePlaybookResult = {
      playbookDir: '/tmp/deploy-app',
      filesWritten: ['playbook.yml', 'inventory.ini', 'group_vars/all.yml'],
      dirsCreated: ['group_vars'],
      dryRun: false,
    };

    displayPlaybookTree(result);

    console.log = originalLog;

    // Should have output something
    expect(consoleOutput.length).toBeGreaterThan(0);
    expect(consoleOutput[0]).toContain('/tmp/deploy-app');
  });

  test('sorts files alphabetically', () => {
    const consoleOutput: string[] = [];
    const originalLog = console.log;
    console.log = mock((msg: string) => consoleOutput.push(msg));

    const result: WritePlaybookResult = {
      playbookDir: '/tmp/test',
      filesWritten: ['z-file.yml', 'a-file.yml', 'm-file.yml'],
      dirsCreated: [],
      dryRun: false,
    };

    displayPlaybookTree(result);

    console.log = originalLog;

    // Verify files are present in sorted order in output
    const outputJoined = consoleOutput.join('\n');
    const aIndex = outputJoined.indexOf('a-file');
    const mIndex = outputJoined.indexOf('m-file');
    const zIndex = outputJoined.indexOf('z-file');

    // a should appear before m, m before z
    expect(aIndex).toBeLessThan(mIndex);
    expect(mIndex).toBeLessThan(zIndex);
  });
});
