import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import {
  createPlannerAgent,
  generatePlaybookPlan,
  generateRolePlan,
  PlannerAgent,
} from './planner.js';
import type { AgentContext } from './types.js';
import {
  createMockAnthropicClient,
  createMockPlanPreview,
  createMockPlaybookPlanPreview,
} from '../__test-utils__/mocks/anthropic.js';

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

describe('PlannerAgent', () => {
  let agent: PlannerAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to plan messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('plan:')) {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('creates agent with default settings', () => {
      agent = new PlannerAgent();
      expect(agent.name).toBe('ansible-planner');
      expect(agent.description).toBe('Generate role/playbook plans');
    });

    test('accepts custom client', () => {
      const mockClient = createMockAnthropicClient({
        structuredResponse: createMockPlanPreview(),
      });
      agent = new PlannerAgent({ client: mockClient as any });
      expect(agent.name).toBe('ansible-planner');
    });

    test('accepts custom maxRetries', () => {
      agent = new PlannerAgent({ maxRetries: 5 });
      expect(agent.name).toBe('ansible-planner');
    });
  });

  describe('execute for role', () => {
    test('publishes PLAN_START message', async () => {
      const mockPlan = createMockPlanPreview();
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      await agent.execute({ description: 'Create nginx role', type: 'role' }, testContext);

      const startMsg = messageLog.find((m) => m.type === MessageTypes.PLAN_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).type).toBe('role');
    });

    test('publishes PLAN_COMPLETE on success', async () => {
      const mockPlan = createMockPlanPreview();
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      await agent.execute({ description: 'Create nginx role', type: 'role' }, testContext);

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.PLAN_COMPLETE);
      expect(completeMsg).toBeDefined();
      expect((completeMsg?.payload as any).type).toBe('role');
    });

    test('returns parsed plan preview', async () => {
      const mockPlan = createMockPlanPreview({
        role_name: 'custom-nginx',
        description: 'Custom nginx role',
      });
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.plan.role_name).toBe('custom-nginx');
      expect(result.data?.plan.description).toBe('Custom nginx role');
    });

    test('handles clarifications in input', async () => {
      const mockPlan = createMockPlanPreview();
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        {
          description: 'Create nginx role',
          type: 'role',
          clarifications: {
            ssl: 'yes',
            port: '443',
          },
        },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(mockClient.beta.messages.create).toHaveBeenCalled();
    });

    test('handles feedback for refinement', async () => {
      const mockPlan = createMockPlanPreview();
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        {
          description: 'Create nginx role',
          type: 'role',
          feedback: 'Add support for load balancing',
        },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('execute for playbook', () => {
    test('returns parsed playbook plan preview', async () => {
      const mockPlan = createMockPlaybookPlanPreview({
        playbook_name: 'deploy-app',
        description: 'Deploy application playbook',
      });
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create deployment playbook', type: 'playbook' },
        testContext,
      );

      expect(result.success).toBe(true);
      // Note: plan is typed as PlanPreview but can be PlaybookPlanPreview
      expect((result.data?.plan as any).playbook_name).toBe('deploy-app');
    });

    test('uses playbook system prompt', async () => {
      const mockPlan = createMockPlaybookPlanPreview();
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      await agent.execute(
        { description: 'Create LAMP stack playbook', type: 'playbook' },
        testContext,
      );

      // Verify the API was called (system prompt is internal)
      expect(mockClient.beta.messages.create).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('publishes PLAN_ERROR on failure', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'server',
      });

      agent = new PlannerAgent({ client: mockClient as any });
      await agent.execute({ description: 'Create nginx role', type: 'role' }, testContext);

      const errorMsg = messageLog.find((m) => m.type === MessageTypes.PLAN_ERROR);
      expect(errorMsg).toBeDefined();
    });

    test('returns failure result on API error', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'auth',
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('PLAN_ERROR');
      expect(result.errors?.[0].recoverable).toBe(true);
    });

    test('handles rate limit errors', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'rate_limit',
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('Rate limited');
    });

    test('handles missing API key', async () => {
      const contextWithoutKey: AgentContext = {
        ...testContext,
        config: {
          ...testContext.config,
          api: { ...testContext.config.api, key: '' },
        },
      };

      agent = new PlannerAgent();
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        contextWithoutKey,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('API key');
    });
  });

  describe('response parsing', () => {
    test('parses valid JSON response', async () => {
      const mockPlan = createMockPlanPreview({
        tasks: [
          { name: 'Task 1', description: 'First task', module: 'ansible.builtin.debug' },
          { name: 'Task 2', description: 'Second task', module: 'ansible.builtin.command' },
        ],
      });
      const mockClient = createMockAnthropicClient({
        structuredResponse: mockPlan,
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.plan.tasks).toHaveLength(2);
    });

    test('handles malformed JSON response', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'not valid json {{{',
      });

      agent = new PlannerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { description: 'Create nginx role', type: 'role' },
        testContext,
      );

      expect(result.success).toBe(false);
    });
  });
});

describe('createPlannerAgent', () => {
  test('creates agent with default options', () => {
    const agent = createPlannerAgent();
    expect(agent).toBeInstanceOf(PlannerAgent);
    expect(agent.name).toBe('ansible-planner');
  });

  test('creates agent with custom client', () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: createMockPlanPreview(),
    });
    const agent = createPlannerAgent({ client: mockClient as any });
    expect(agent).toBeInstanceOf(PlannerAgent);
  });

  test('creates agent with custom maxRetries', () => {
    const agent = createPlannerAgent({ maxRetries: 5 });
    expect(agent).toBeInstanceOf(PlannerAgent);
  });
});

describe('generateRolePlan convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('generates role plan', async () => {
    const mockPlan = createMockPlanPreview({ role_name: 'nginx' });
    const mockClient = createMockAnthropicClient({
      structuredResponse: mockPlan,
    });

    const result = await generateRolePlan('Create nginx role', testContext, {
      client: mockClient as any,
    });

    expect(result.success).toBe(true);
    expect(result.data?.plan.role_name).toBe('nginx');
  });

  test('accepts clarifications', async () => {
    const mockPlan = createMockPlanPreview();
    const mockClient = createMockAnthropicClient({
      structuredResponse: mockPlan,
    });

    const result = await generateRolePlan('Create nginx role', testContext, {
      client: mockClient as any,
      clarifications: { ssl: 'enabled' },
    });

    expect(result.success).toBe(true);
  });

  test('accepts feedback', async () => {
    const mockPlan = createMockPlanPreview();
    const mockClient = createMockAnthropicClient({
      structuredResponse: mockPlan,
    });

    const result = await generateRolePlan('Create nginx role', testContext, {
      client: mockClient as any,
      feedback: 'Add more handlers',
    });

    expect(result.success).toBe(true);
  });
});

describe('generatePlaybookPlan convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('generates playbook plan', async () => {
    const mockPlan = createMockPlaybookPlanPreview({ playbook_name: 'deploy' });
    const mockClient = createMockAnthropicClient({
      structuredResponse: mockPlan,
    });

    const result = await generatePlaybookPlan('Create deploy playbook', testContext, {
      client: mockClient as any,
    });

    expect(result.success).toBe(true);
  });

  test('accepts clarifications', async () => {
    const mockPlan = createMockPlaybookPlanPreview();
    const mockClient = createMockAnthropicClient({
      structuredResponse: mockPlan,
    });

    const result = await generatePlaybookPlan('Create deploy playbook', testContext, {
      client: mockClient as any,
      clarifications: { target: 'production' },
    });

    expect(result.success).toBe(true);
  });
});
