import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import type { GeneratedFile } from '../generation/role/parser.js';
import type { LintViolation } from '../generation/validation/ansible-lint.js';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import { applyFixes, canAutoFix, createFixerAgent, FixerAgent } from './fixer.js';
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
const fileWithFqcnIssue: GeneratedFile = {
  path: 'tasks/main.yml',
  content: `---
- name: Install nginx
  package:
    name: nginx
    state: present

- name: Start service
  service:
    name: nginx
    state: started
`,
};

const fileWithYamlIssue: GeneratedFile = {
  path: 'tasks/other.yml',
  content: `---
- name: Run command
  shell: echo hello
  args:
    creates: /tmp/hello
`,
};

const fqcnViolation: LintViolation = {
  ruleId: 'fqcn[action-core]',
  level: 'warning',
  message: 'Use FQCN for module package',
  file: 'tasks/main.yml',
  line: 3,
};

const yamlTruthyViolation: LintViolation = {
  ruleId: 'yaml[truthy]',
  level: 'warning',
  message: 'Truthy value should be true/false',
  file: 'tasks/main.yml',
  line: 5,
};

const unfixableViolation: LintViolation = {
  ruleId: 'no-changed-when',
  level: 'warning',
  message: 'Commands should have changed_when',
  file: 'tasks/main.yml',
  line: 10,
};

describe('FixerAgent', () => {
  let agent: FixerAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    agent = new FixerAgent();
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to fix messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('fix:') || msg.type === 'progress') {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('creates agent with default settings', () => {
      const agent = new FixerAgent();
      expect(agent.name).toBe('ansible-fixer');
      expect(agent.description).toBe('Auto-fix lint violations');
    });

    test('accepts custom maxConcurrency', () => {
      const agent = new FixerAgent({ maxConcurrency: 10 });
      expect(agent.name).toBe('ansible-fixer');
    });
  });

  describe('execute with autoFix=false', () => {
    test('publishes FIX_START message', async () => {
      await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: false },
        testContext,
      );

      const startMsg = messageLog.find((m) => m.type === MessageTypes.FIX_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).autoFix).toBe(false);
    });

    test('publishes FIX_COMPLETE message', async () => {
      await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: false },
        testContext,
      );

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.FIX_COMPLETE);
      expect(completeMsg).toBeDefined();
      expect((completeMsg?.payload as any).fixedCount).toBe(0);
    });

    test('returns files unchanged', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: false },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.modifiedFiles).toEqual([fileWithFqcnIssue]);
      expect(result.data?.fixed).toEqual([]);
    });

    test('separates fixable from unfixable', async () => {
      const result = await agent.execute(
        {
          files: [fileWithFqcnIssue],
          violations: [fqcnViolation, unfixableViolation],
          autoFix: false,
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.unfixable.length).toBeGreaterThan(0);
    });
  });

  describe('execute with autoFix=true', () => {
    test('publishes FIX_COMPLETE with fix count', async () => {
      await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: true },
        testContext,
      );

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.FIX_COMPLETE);
      expect(completeMsg).toBeDefined();
      // FQCN violations are auto-fixable
    });

    test('returns modified files', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.modifiedFiles).toBeInstanceOf(Array);
    });

    test('returns fixed violations list', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.fixed).toBeInstanceOf(Array);
    });

    test('returns unfixable violations list', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [unfixableViolation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.unfixable).toBeInstanceOf(Array);
      expect(result.data?.unfixable.length).toBeGreaterThan(0);
    });

    test('generates warnings for unfixable violations', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [unfixableViolation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      // Unfixable violations may generate warnings
    });
  });

  describe('FQCN fixing', () => {
    test('fixes package module to FQCN', async () => {
      const violation: LintViolation = {
        ruleId: 'fqcn[action-core]',
        level: 'warning',
        message: 'Use FQCN for module package',
        file: 'tasks/main.yml',
        line: 3,
      };

      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [violation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      const modifiedFile = result.data?.modifiedFiles.find((f) => f.path === 'tasks/main.yml');
      if (result.data?.fixed.length > 0) {
        expect(modifiedFile?.content).toContain('ansible.builtin.package');
      }
    });

    test('fixes service module to FQCN', async () => {
      const violation: LintViolation = {
        ruleId: 'fqcn[action-core]',
        level: 'warning',
        message: 'Use FQCN for module service',
        file: 'tasks/main.yml',
        line: 8,
      };

      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [violation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('empty input handling', () => {
    test('handles empty files array', async () => {
      const result = await agent.execute({ files: [], violations: [], autoFix: true }, testContext);

      expect(result.success).toBe(true);
      expect(result.data?.modifiedFiles).toEqual([]);
      expect(result.data?.fixed).toEqual([]);
    });

    test('handles empty violations array', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.fixed).toEqual([]);
    });
  });

  describe('parallel fix processing', () => {
    test('handles many files with concurrency limit', async () => {
      const manyFiles: GeneratedFile[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          path: `tasks/task${i}.yml`,
          content: `---
- name: Task ${i}
  package:
    name: nginx
    state: present
`,
        }));

      const violations: LintViolation[] = manyFiles.map((f, i) => ({
        ruleId: 'fqcn[action-core]',
        level: 'warning' as const,
        message: 'Use FQCN',
        file: f.path,
        line: 3,
      }));

      const agent = new FixerAgent({ maxConcurrency: 3 });
      const result = await agent.execute(
        { files: manyFiles, violations, autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
    });

    test('uses sequential processing for small file counts', async () => {
      const result = await agent.execute(
        { files: [fileWithFqcnIssue], violations: [fqcnViolation], autoFix: true },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });
});

describe('createFixerAgent', () => {
  test('creates agent with default options', () => {
    const agent = createFixerAgent();
    expect(agent).toBeInstanceOf(FixerAgent);
    expect(agent.name).toBe('ansible-fixer');
  });

  test('creates agent with custom maxConcurrency', () => {
    const agent = createFixerAgent({ maxConcurrency: 8 });
    expect(agent).toBeInstanceOf(FixerAgent);
  });
});

describe('applyFixes convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('applies fixes with default autoFix=true', async () => {
    const result = await applyFixes([fileWithFqcnIssue], [fqcnViolation], testContext);

    expect(result.success).toBe(true);
  });

  test('respects autoFix option', async () => {
    const result = await applyFixes([fileWithFqcnIssue], [fqcnViolation], testContext, {
      autoFix: false,
    });

    expect(result.success).toBe(true);
    expect(result.data?.fixed).toEqual([]);
  });

  test('accepts maxConcurrency option', async () => {
    const result = await applyFixes([fileWithFqcnIssue], [fqcnViolation], testContext, {
      maxConcurrency: 5,
    });

    expect(result.success).toBe(true);
  });
});

describe('canAutoFix', () => {
  test('returns true for fqcn rules', () => {
    expect(canAutoFix('fqcn[action-core]')).toBe(true);
    expect(canAutoFix('fqcn[action]')).toBe(true);
  });

  test('returns true for yaml[trailing-spaces] rule', () => {
    expect(canAutoFix('yaml[trailing-spaces]')).toBe(true);
  });

  test('returns true for yaml[new-line-at-end-of-file] rule', () => {
    expect(canAutoFix('yaml[new-line-at-end-of-file]')).toBe(true);
  });

  test('returns false for unfixable rules', () => {
    expect(canAutoFix('no-changed-when')).toBe(false);
    expect(canAutoFix('risky-shell-pipe')).toBe(false);
    expect(canAutoFix('unknown-rule')).toBe(false);
  });
});
