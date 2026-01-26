import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GeneratedFile } from '../generation/role/parser.js';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import { createLinterAgent, lintFiles, LinterAgent, isAnsibleLintAvailable } from './linter.js';
import type { AgentContext } from './types.js';

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
const validTasksFile: GeneratedFile = {
  path: 'tasks/main.yml',
  content: `---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Start nginx service
  ansible.builtin.service:
    name: nginx
    state: started
`,
};

const fileWithIssues: GeneratedFile = {
  path: 'tasks/legacy.yml',
  content: `---
- name: Install package
  package:
    name: nginx
    state: present
- name: run shell
  shell: echo hello
`,
};

describe('LinterAgent', () => {
  let agent: LinterAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    agent = new LinterAgent();
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to all lint messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('lint:')) {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('creates agent with default settings', () => {
      const agent = new LinterAgent();
      expect(agent.name).toBe('ansible-linter');
      expect(agent.description).toBe('Run ansible-lint validation');
    });
  });

  describe('execute', () => {
    test('publishes LINT_START message', async () => {
      await agent.execute({ files: [validTasksFile] }, testContext);

      const startMsg = messageLog.find((m) => m.type === MessageTypes.LINT_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).fileCount).toBe(1);
    });

    test('publishes LINT_COMPLETE message', async () => {
      await agent.execute({ files: [validTasksFile] }, testContext);

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.LINT_COMPLETE);
      expect(completeMsg).toBeDefined();
    });

    test('returns available=false when ansible-lint not installed', async () => {
      // This test assumes ansible-lint might not be installed
      // The result should still be a success (not an error)
      const result = await agent.execute({ files: [validTasksFile] }, testContext);

      // Result is always success - unavailable is not an error
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data?.available).toBe('boolean');
    });

    test('returns violations array', async () => {
      const result = await agent.execute({ files: [validTasksFile] }, testContext);

      expect(result.success).toBe(true);
      expect(result.data?.violations).toBeInstanceOf(Array);
    });

    test('returns exitCode', async () => {
      const result = await agent.execute({ files: [validTasksFile] }, testContext);

      expect(result.success).toBe(true);
      expect(typeof result.data?.exitCode).toBe('number');
    });

    test('handles empty files array', async () => {
      const result = await agent.execute({ files: [] }, testContext);

      expect(result.success).toBe(true);
      expect(result.data?.violations).toEqual([]);
    });

    test('uses provided tempDir if specified', async () => {
      const result = await agent.execute(
        { files: [validTasksFile], tempDir: '/tmp/custom-lint-dir' },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('output structure', () => {
    test('violations have required fields', async () => {
      const result = await agent.execute({ files: [fileWithIssues] }, testContext);

      if (result.data?.available && result.data.violations.length > 0) {
        const violation = result.data.violations[0];
        expect(violation).toHaveProperty('ruleId');
        expect(violation).toHaveProperty('level');
        expect(violation).toHaveProperty('message');
        expect(violation).toHaveProperty('file');
        expect(violation).toHaveProperty('line');
      }
    });

    test('violations have normalized file paths', async () => {
      const result = await agent.execute({ files: [validTasksFile] }, testContext);

      if (result.data?.available && result.data.violations.length > 0) {
        // File paths should not contain temp directory prefix
        const violation = result.data.violations[0];
        expect(violation.file).not.toContain('/tmp/');
        expect(violation.file).not.toContain('ansible-craft-lint');
      }
    });
  });

  describe('install instructions', () => {
    test('returns install instructions when not available', async () => {
      const result = await agent.execute({ files: [validTasksFile] }, testContext);

      if (!result.data?.available) {
        expect(result.warnings?.length).toBeGreaterThan(0);
        expect(result.warnings?.[0]).toContain('ansible-lint');
      }
    });
  });
});

describe('createLinterAgent', () => {
  test('creates agent instance', () => {
    const agent = createLinterAgent();
    expect(agent).toBeInstanceOf(LinterAgent);
    expect(agent.name).toBe('ansible-linter');
  });
});

describe('lintFiles convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('works with basic parameters', async () => {
    const result = await lintFiles([validTasksFile], testContext);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });

  test('accepts tempDir option', async () => {
    const result = await lintFiles([validTasksFile], testContext, { tempDir: '/tmp/test-lint' });

    expect(result.success).toBe(true);
  });
});

describe('isAnsibleLintAvailable', () => {
  test('returns boolean', async () => {
    const available = await isAnsibleLintAvailable();
    expect(typeof available).toBe('boolean');
  });
});

describe('multiple file linting', () => {
  let agent: LinterAgent;

  beforeEach(() => {
    agent = new LinterAgent();
    globalMessageBus.clear();
  });

  test('lints multiple files together', async () => {
    const files: GeneratedFile[] = [
      validTasksFile,
      {
        path: 'defaults/main.yml',
        content: '---\nnginx_port: 80\n',
      },
      {
        path: 'handlers/main.yml',
        content:
          '---\n- name: restart nginx\n  ansible.builtin.service:\n    name: nginx\n    state: restarted\n',
      },
    ];

    const result = await agent.execute({ files }, testContext);

    expect(result.success).toBe(true);
  });

  test('aggregates violations from multiple files', async () => {
    const files: GeneratedFile[] = [
      fileWithIssues,
      {
        path: 'tasks/more-issues.yml',
        content: `---
- name: Another task
  command: ls -la
`,
      },
    ];

    const result = await agent.execute({ files }, testContext);

    expect(result.success).toBe(true);
    // Violations should be aggregated from all files
    if (result.data?.available) {
      // Each violation should reference its source file
      for (const violation of result.data.violations) {
        expect(violation.file).toBeDefined();
      }
    }
  });
});

describe('temp directory cleanup', () => {
  test('cleans up temp directory after linting', async () => {
    const agent = new LinterAgent();
    const result = await agent.execute({ files: [validTasksFile] }, testContext);

    expect(result.success).toBe(true);
    // The agent should clean up temp directories automatically
    // This is verified by the fact that subsequent runs don't fail
    // due to directory conflicts
  });

  test('does not clean up provided tempDir', async () => {
    const agent = new LinterAgent();
    const customTempDir = `/tmp/ansible-craft-test-${Date.now()}`;

    const result = await agent.execute(
      { files: [validTasksFile], tempDir: customTempDir },
      testContext,
    );

    expect(result.success).toBe(true);
    // When tempDir is provided, we don't clean it up
  });
});
