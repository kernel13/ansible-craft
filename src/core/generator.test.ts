import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import {
  createGeneratorAgent,
  generatePlaybookCode,
  generateRoleCode,
  GeneratorAgent,
} from './generator.js';
import type { AgentContext } from './types.js';
import {
  createMockAnthropicClient,
  createMockPlanPreview,
  createMockPlaybookPlanPreview,
  createMockStreamedRoleYaml,
  createMockStreamedPlaybookYaml,
} from '../__test-utils__/mocks/anthropic.js';
import type { PlanPreview } from '../generation/schemas/plan-preview.js';

// Test context
const testContext: AgentContext = {
  config: {
    api: { key: 'test-api-key', model: 'claude-sonnet-4-5-20250929' },
    generation: { outputDir: '.', autoLint: true, autoFix: false },
    cli: { colors: true, verbose: false },
  },
  quiet: true,
  jsonMode: false,
  cwd: '/test',
};

describe('GeneratorAgent', () => {
  let agent: GeneratorAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to generate messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('generate:') || msg.type === 'progress') {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('creates agent with default settings', () => {
      agent = new GeneratorAgent();
      expect(agent.name).toBe('ansible-generator');
      expect(agent.description).toBe('Generate Ansible code from plans');
    });

    test('accepts custom client', () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      agent = new GeneratorAgent({ client: mockClient as any });
      expect(agent.name).toBe('ansible-generator');
    });

    test('accepts custom maxRetries', () => {
      agent = new GeneratorAgent({ maxRetries: 5 });
      expect(agent.name).toBe('ansible-generator');
    });
  });

  describe('execute for role', () => {
    test('publishes GENERATE_START message', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      await agent.execute({ plan, description: 'Create nginx role', type: 'role' }, testContext);

      const startMsg = messageLog.find((m) => m.type === MessageTypes.GENERATE_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).type).toBe('role');
    });

    test('publishes GENERATE_COMPLETE on success', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      await agent.execute({ plan, description: 'Create nginx role', type: 'role' }, testContext);

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.GENERATE_COMPLETE);
      expect(completeMsg).toBeDefined();
      expect((completeMsg?.payload as any).type).toBe('role');
    });

    test('returns generated files', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.files).toBeInstanceOf(Array);
      expect(result.data?.files.length).toBeGreaterThan(0);
    });

    test('parses files with correct structure', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      const tasksFile = result.data?.files.find((f) => f.path === 'tasks/main.yml');
      expect(tasksFile).toBeDefined();
      expect(tasksFile?.content).toContain('name:');
    });

    test('returns token usage', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedRoleYaml(),
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(typeof result.data?.tokensUsed).toBe('number');
    });
  });

  describe('execute for playbook', () => {
    test('returns generated playbook files', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedPlaybookYaml(),
      });
      const plan = createMockPlaybookPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan: plan as any, description: 'Create deploy playbook', type: 'playbook' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.files).toBeInstanceOf(Array);
    });

    test('parses playbook structure correctly', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: createMockStreamedPlaybookYaml(),
      });
      const plan = createMockPlaybookPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan: plan as any, description: 'Create deploy playbook', type: 'playbook' },
        testContext,
      );

      expect(result.success).toBe(true);
      const playbookFile = result.data?.files.find((f) => f.path === 'playbook.yml');
      expect(playbookFile).toBeDefined();
    });
  });

  describe('file count warnings', () => {
    test('warns if fewer files than expected', async () => {
      // Create a response with only 1 file but a plan expecting more
      const mockClient = createMockAnthropicClient({
        responseText: `=== PATH: tasks/main.yml ===
---
- name: Single task
  ansible.builtin.debug:
    msg: "Only one file"
=== END ===`,
      });
      const plan = createMockPlanPreview({
        handlers: ['restart nginx', 'reload nginx'],
        templates: ['nginx.conf.j2', 'vhost.conf.j2'],
      });

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0]).toContain('expected at least');
    });
  });

  describe('error handling', () => {
    test('publishes GENERATE_ERROR on failure', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'server',
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      await agent.execute({ plan, description: 'Create nginx role', type: 'role' }, testContext);

      const errorMsg = messageLog.find((m) => m.type === MessageTypes.GENERATE_ERROR);
      expect(errorMsg).toBeDefined();
    });

    test('returns failure on API error', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'auth',
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('GENERATE_ERROR');
    });

    test('returns failure when no files generated', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'No valid file markers here',
      });
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent({ client: mockClient as any });
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('NO_FILES_GENERATED');
    });

    test('handles missing API key', async () => {
      const contextWithoutKey: AgentContext = {
        ...testContext,
        config: {
          ...testContext.config,
          api: { ...testContext.config.api, key: '' },
        },
      };
      const plan = createMockPlanPreview();

      agent = new GeneratorAgent();
      const result = await agent.execute(
        { plan, description: 'Create nginx role', type: 'role' },
        contextWithoutKey,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('API key');
    });
  });
});

describe('createGeneratorAgent', () => {
  test('creates agent with default options', () => {
    const agent = createGeneratorAgent();
    expect(agent).toBeInstanceOf(GeneratorAgent);
    expect(agent.name).toBe('ansible-generator');
  });

  test('creates agent with custom client', () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const agent = createGeneratorAgent({ client: mockClient as any });
    expect(agent).toBeInstanceOf(GeneratorAgent);
  });
});

describe('generateRoleCode convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('generates role code', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(plan, 'Create nginx role', testContext, {
      client: mockClient as any,
    });

    expect(result.success).toBe(true);
    expect(result.data?.files.length).toBeGreaterThan(0);
  });
});

describe('generatePlaybookCode convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('generates playbook code', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(plan, 'Create deploy playbook', testContext, {
      client: mockClient as any,
    });

    expect(result.success).toBe(true);
    expect(result.data?.files.length).toBeGreaterThan(0);
  });
});
