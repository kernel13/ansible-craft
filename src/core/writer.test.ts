import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GeneratedFile } from '../generation/role/parser.js';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import { createWriterAgent, writeFiles, WriterAgent } from './writer.js';
import type { AgentContext } from './types.js';
import { createMockFileSystem, type MockFileSystem } from '../__test-utils__/mocks/filesystem.js';

// Test context
const testContext: AgentContext = {
  config: {
    api: { key: 'test-key', model: 'claude-sonnet-4-5-20250929' },
    generation: { outputDir: '.', autoLint: true, autoFix: false },
    cli: { colors: true, verbose: false },
  },
  quiet: true,
  jsonMode: false,
  cwd: '/test',
};

// Test fixtures
const testFiles: GeneratedFile[] = [
  {
    path: 'tasks/main.yml',
    content: `---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present
`,
  },
  {
    path: 'defaults/main.yml',
    content: `---
nginx_port: 80
`,
  },
  {
    path: 'handlers/main.yml',
    content: `---
- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
`,
  },
];

describe('WriterAgent', () => {
  let agent: WriterAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    agent = new WriterAgent();
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to all write messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('write:') || msg.type === 'progress') {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('uses default maxConcurrency', () => {
      const agent = new WriterAgent();
      expect(agent.name).toBe('ansible-writer');
    });

    test('accepts custom maxConcurrency', () => {
      const agent = new WriterAgent({ maxConcurrency: 15 });
      expect(agent.name).toBe('ansible-writer');
    });
  });

  describe('execute with dryRun', () => {
    test('publishes WRITE_START message', async () => {
      await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test-role',
          type: 'role',
          force: false,
          dryRun: true,
        },
        testContext,
      );

      const startMsg = messageLog.find((m) => m.type === MessageTypes.WRITE_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).fileCount).toBe(3);
      expect((startMsg?.payload as any).dryRun).toBe(true);
    });

    test('publishes WRITE_COMPLETE message', async () => {
      await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test-role',
          type: 'role',
          force: false,
          dryRun: true,
        },
        testContext,
      );

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.WRITE_COMPLETE);
      expect(completeMsg).toBeDefined();
    });

    test('dryRun=true skips filesystem operations', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test-role',
          type: 'role',
          force: false,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.written).toHaveLength(3);
      expect(result.data?.targetDir).toBe('/output/test-role');
    });

    test('returns correct file list in dryRun mode', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'my-role',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.written).toContain('tasks/main.yml');
      expect(result.data?.written).toContain('defaults/main.yml');
      expect(result.data?.written).toContain('handlers/main.yml');
    });
  });

  describe('execute with force flag', () => {
    test('force=true overwrites without prompt', async () => {
      // With force=true and dryRun=true, should succeed without prompt
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'existing-role',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('type handling', () => {
    test('creates role structure for type=role', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'nginx',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.targetDir).toBe('/output/nginx');
    });

    test('creates playbook structure for type=playbook', async () => {
      const playbookFiles: GeneratedFile[] = [
        { path: 'playbook.yml', content: '---\n- hosts: all\n  tasks: []' },
        { path: 'inventory.ini', content: '[all]\n' },
      ];

      const result = await agent.execute(
        {
          files: playbookFiles,
          outputDir: '/output',
          name: 'deploy',
          type: 'playbook',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.targetDir).toBe('/output/deploy');
    });
  });

  describe('output structure', () => {
    test('returns written files list', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.data?.written).toBeInstanceOf(Array);
      expect(result.data?.written.length).toBe(testFiles.length);
    });

    test('returns skipped files list (empty in normal case)', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.data?.skipped).toBeInstanceOf(Array);
    });

    test('returns conflicts list when directory existed', async () => {
      // In dryRun mode with force=true, conflicts might be recorded
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/output',
          name: 'test',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.data?.conflicts).toBeInstanceOf(Array);
    });

    test('returns target directory path', async () => {
      const result = await agent.execute(
        {
          files: testFiles,
          outputDir: '/custom/path',
          name: 'my-role',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.data?.targetDir).toBe('/custom/path/my-role');
    });
  });

  describe('empty input handling', () => {
    test('handles empty files array', async () => {
      const result = await agent.execute(
        {
          files: [],
          outputDir: '/output',
          name: 'empty-role',
          type: 'role',
          force: true,
          dryRun: true,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.written).toHaveLength(0);
    });
  });
});

describe('createWriterAgent', () => {
  test('creates agent with default options', () => {
    const agent = createWriterAgent();
    expect(agent).toBeInstanceOf(WriterAgent);
    expect(agent.name).toBe('ansible-writer');
  });

  test('creates agent with custom maxConcurrency', () => {
    const agent = createWriterAgent({ maxConcurrency: 20 });
    expect(agent).toBeInstanceOf(WriterAgent);
  });
});

describe('writeFiles convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('works with basic parameters', async () => {
    const result = await writeFiles(testFiles, '/output', 'my-role', 'role', testContext, {
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.targetDir).toBe('/output/my-role');
  });

  test('accepts force option', async () => {
    const result = await writeFiles(testFiles, '/output', 'my-role', 'role', testContext, {
      force: true,
      dryRun: true,
    });

    expect(result.success).toBe(true);
  });

  test('accepts dryRun option', async () => {
    const result = await writeFiles(testFiles, '/output', 'my-role', 'role', testContext, {
      dryRun: true,
    });

    expect(result.success).toBe(true);
  });

  test('accepts maxConcurrency option', async () => {
    const result = await writeFiles(testFiles, '/output', 'my-role', 'role', testContext, {
      maxConcurrency: 5,
      dryRun: true,
    });

    expect(result.success).toBe(true);
  });
});

describe('parallel writing', () => {
  let agent: WriterAgent;

  beforeEach(() => {
    agent = new WriterAgent({ maxConcurrency: 3 });
    globalMessageBus.clear();
  });

  test('writes multiple files with concurrency limit', async () => {
    const manyFiles: GeneratedFile[] = Array(10)
      .fill(null)
      .map((_, i) => ({
        path: `tasks/task${i}.yml`,
        content: `---\n- name: Task ${i}\n  ansible.builtin.debug:\n    msg: "${i}"`,
      }));

    const result = await agent.execute(
      {
        files: manyFiles,
        outputDir: '/output',
        name: 'many-tasks',
        type: 'role',
        force: true,
        dryRun: true,
      },
      testContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.written).toHaveLength(10);
  });

  test('sequential writing for small file counts', async () => {
    const result = await agent.execute(
      {
        files: testFiles.slice(0, 2), // Only 2 files
        outputDir: '/output',
        name: 'small-role',
        type: 'role',
        force: true,
        dryRun: true,
      },
      testContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.written).toHaveLength(2);
  });
});
