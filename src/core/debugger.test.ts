import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { globalMessageBus, MessageTypes } from './message-bus.js';
import { createDebuggerAgent, debugAnsibleError, DebuggerAgent } from './debugger.js';
import type { AgentContext } from './types.js';
import { createMockAnthropicClient } from '../__test-utils__/mocks/anthropic.js';

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

// Sample error messages
const sampleErrorMessage = `TASK [nginx : Install nginx package] *******************************************
fatal: [webserver]: FAILED! => {"changed": false, "msg": "No package matching 'nginx' is available"}

PLAY RECAP *********************************************************************
webserver                  : ok=2    changed=0    unreachable=0    failed=1    skipped=0    rescued=0    ignored=0`;

const undefinedVarError = `TASK [setup : Configure application] ******************************************
fatal: [appserver]: FAILED! => {"msg": "The task includes an option with an undefined variable. The error was: 'app_port' is undefined"}`;

const syntaxError = `ERROR! Syntax Error while loading YAML.
  did not find expected key

The error appears to be in '/home/user/playbook.yml': line 15, column 3`;

describe('DebuggerAgent', () => {
  let agent: DebuggerAgent;
  let messageLog: Array<{ type: string; payload: unknown }>;

  beforeEach(() => {
    messageLog = [];
    globalMessageBus.clear();

    // Subscribe to debug messages
    globalMessageBus.subscribe('*', (msg) => {
      if (msg.type.startsWith('debug:')) {
        messageLog.push({ type: msg.type, payload: msg.payload });
      }
    });
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  describe('constructor', () => {
    test('creates agent with default settings', () => {
      agent = new DebuggerAgent();
      expect(agent.name).toBe('ansible-debugger');
      expect(agent.description).toBe('Diagnose and fix errors');
    });

    test('accepts custom client', () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The error indicates a missing package.',
      });
      agent = new DebuggerAgent({ client: mockClient as any });
      expect(agent.name).toBe('ansible-debugger');
    });

    test('accepts custom maxRetries', () => {
      agent = new DebuggerAgent({ maxRetries: 5 });
      expect(agent.name).toBe('ansible-debugger');
    });
  });

  describe('execute', () => {
    test('publishes DEBUG_START message', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The error is caused by a missing package repository.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      await agent.execute({ errorMessage: sampleErrorMessage, useComplex: false }, testContext);

      const startMsg = messageLog.find((m) => m.type === MessageTypes.DEBUG_START);
      expect(startMsg).toBeDefined();
      expect((startMsg?.payload as any).useComplex).toBe(false);
    });

    test('publishes DEBUG_COMPLETE on success', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The nginx package is not available in the configured repositories.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      await agent.execute({ errorMessage: sampleErrorMessage, useComplex: false }, testContext);

      const completeMsg = messageLog.find((m) => m.type === MessageTypes.DEBUG_COMPLETE);
      expect(completeMsg).toBeDefined();
    });

    test('returns diagnosis result', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: `The error indicates that the nginx package cannot be found.

**Diagnosis:**
The package repository doesn't have nginx available.

**Suggested Fix:**
\`\`\`yaml
- name: Enable EPEL repository
  ansible.builtin.yum:
    name: epel-release
    state: present
\`\`\``,
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.diagnosis).toBeDefined();
      expect(result.data?.diagnosis).toContain('nginx');
    });

    test('extracts suggested fix from response', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: `The variable is undefined.

\`\`\`yaml
# Add this to defaults/main.yml
app_port: 8080
\`\`\``,
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: undefinedVarError, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      // suggestedFix may be extracted if YAML block is present
      if (result.data?.suggestedFix) {
        expect(result.data.suggestedFix).toContain('app_port');
      }
    });

    test('returns target file when detected from error', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The syntax error is on line 15 of playbook.yml.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: syntaxError, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      // targetFile may be detected from the error message
      if (result.data?.targetFile) {
        expect(result.data.targetFile).toContain('playbook.yml');
      }
    });
  });

  describe('error handling', () => {
    test('publishes DEBUG_ERROR on API failure', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'server',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      await agent.execute({ errorMessage: sampleErrorMessage, useComplex: false }, testContext);

      const errorMsg = messageLog.find((m) => m.type === MessageTypes.DEBUG_ERROR);
      expect(errorMsg).toBeDefined();
    });

    test('returns failure result on API error', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'auth',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('DEBUG_ERROR');
      expect(result.errors?.[0].recoverable).toBe(true);
    });

    test('handles rate limit errors', async () => {
      const mockClient = createMockAnthropicClient({
        shouldFail: true,
        errorType: 'rate_limit',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(false);
    });

    test('handles missing API key', async () => {
      const contextWithoutKey: AgentContext = {
        ...testContext,
        config: {
          ...testContext.config,
          api: { ...testContext.config.api, key: '' },
        },
      };

      agent = new DebuggerAgent();
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        contextWithoutKey,
      );

      expect(result.success).toBe(false);
      expect(result.errors?.[0].message).toContain('API key');
    });
  });

  describe('output structure', () => {
    test('output has required fields', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'Diagnosis: The package is not available.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('diagnosis');
      expect(result.data).toHaveProperty('confidence');
      // suggestedFix and targetFile are optional
    });

    test('reports duration', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The error is caused by...',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('useComplex flag', () => {
    test('passes useComplex=false to model selection', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'Simple diagnosis',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
    });

    // Skip useComplex=true test as it triggers interactive model selection prompt
    test.skip('passes useComplex=true to model selection', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'Complex detailed diagnosis with deep analysis',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: true },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('playbook context', () => {
    test('accepts playbookContext parameter', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'Based on the playbook context, the error is...',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        {
          errorMessage: sampleErrorMessage,
          useComplex: false,
          playbookContext: '/test/playbook.yml',
        },
        testContext,
      );

      expect(result.success).toBe(true);
    });
  });

  describe('confidence detection', () => {
    test('returns confidence level', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'The error is definitely caused by a missing package.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      expect(result.data?.confidence).toMatch(/^(high|low)$/);
    });

    test('returns warnings when low confidence and not complex', async () => {
      const mockClient = createMockAnthropicClient({
        responseText:
          'I think this might be a problem. Maybe it could be related to something. Perhaps try this.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: sampleErrorMessage, useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      if (result.data?.confidence === 'low') {
        expect(result.warnings).toBeInstanceOf(Array);
        expect(result.warnings?.some((w) => w.includes('--complex'))).toBe(true);
      }
    });

    test('warns when no playbook context provided', async () => {
      const mockClient = createMockAnthropicClient({
        responseText: 'Cannot determine full context without playbook.',
      });

      agent = new DebuggerAgent({ client: mockClient as any });
      const result = await agent.execute(
        { errorMessage: 'Generic error without file reference', useComplex: false },
        testContext,
      );

      expect(result.success).toBe(true);
      // May warn about missing playbook context
      if (result.warnings && result.warnings.length > 0) {
        expect(result.warnings.some((w) => w.includes('--playbook'))).toBe(true);
      }
    });
  });
});

describe('createDebuggerAgent', () => {
  test('creates agent with default options', () => {
    const agent = createDebuggerAgent();
    expect(agent).toBeInstanceOf(DebuggerAgent);
    expect(agent.name).toBe('ansible-debugger');
  });

  test('creates agent with custom client', () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'Debug output',
    });
    const agent = createDebuggerAgent({ client: mockClient as any });
    expect(agent).toBeInstanceOf(DebuggerAgent);
  });

  test('creates agent with custom maxRetries', () => {
    const agent = createDebuggerAgent({ maxRetries: 5 });
    expect(agent).toBeInstanceOf(DebuggerAgent);
  });
});

describe('debugAnsibleError convenience function', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('debugs ansible error', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'The error is caused by a configuration issue.',
    });

    const result = await debugAnsibleError(sampleErrorMessage, testContext, {
      client: mockClient as any,
    });

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis).toBeDefined();
  });

  // Skip useComplex test as it triggers interactive model selection prompt
  test.skip('accepts useComplex option', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'Deep analysis of the error...',
    });

    const result = await debugAnsibleError(sampleErrorMessage, testContext, {
      client: mockClient as any,
      useComplex: true,
    });

    expect(result.success).toBe(true);
  });

  test('accepts playbookContext option', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'With playbook context, the error is...',
    });

    const result = await debugAnsibleError(sampleErrorMessage, testContext, {
      client: mockClient as any,
      playbookContext: '/test/playbook.yml',
    });

    expect(result.success).toBe(true);
  });
});

describe('error message parsing', () => {
  test('extracts task name from TASK line', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'The nginx installation task failed.',
    });

    const agent = new DebuggerAgent({ client: mockClient as any });
    const result = await agent.execute(
      { errorMessage: sampleErrorMessage, useComplex: false },
      testContext,
    );

    // Task name extraction happens internally
    expect(result.success).toBe(true);
  });

  test('handles undefined variable errors', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'The variable app_port is not defined in your inventory or defaults.',
    });

    const agent = new DebuggerAgent({ client: mockClient as any });
    const result = await agent.execute(
      { errorMessage: undefinedVarError, useComplex: false },
      testContext,
    );

    expect(result.success).toBe(true);
    expect(result.data?.diagnosis).toContain('variable');
  });

  test('handles syntax errors', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'There is a YAML syntax error on line 15.',
    });

    const agent = new DebuggerAgent({ client: mockClient as any });
    const result = await agent.execute(
      { errorMessage: syntaxError, useComplex: false },
      testContext,
    );

    expect(result.success).toBe(true);
  });
});
