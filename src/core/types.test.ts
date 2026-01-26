import { describe, expect, test } from 'bun:test';
import {
  type AgentContext,
  type AgentError,
  type AgentMessage,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  createAgentError,
  createMessage,
  failureResult,
  successResult,
} from './types.js';

describe('createAgentError', () => {
  test('creates error with all required fields', () => {
    const error = createAgentError('test-agent', 'TEST_ERROR', 'Test error message');

    expect(error.agent).toBe('test-agent');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test error message');
    expect(error.recoverable).toBe(false);
    expect(error.cause).toBeUndefined();
  });

  test('uses default recoverable=false when not specified', () => {
    const error = createAgentError('agent', 'CODE', 'message');

    expect(error.recoverable).toBe(false);
  });

  test('allows setting recoverable=true', () => {
    const error = createAgentError('agent', 'CODE', 'message', { recoverable: true });

    expect(error.recoverable).toBe(true);
  });

  test('includes cause when provided', () => {
    const cause = new Error('Original error');
    const error = createAgentError('agent', 'CODE', 'message', { cause });

    expect(error.cause).toBe(cause);
    expect(error.cause?.message).toBe('Original error');
  });

  test('handles both cause and recoverable options', () => {
    const cause = new Error('Original');
    const error = createAgentError('agent', 'CODE', 'message', {
      cause,
      recoverable: true,
    });

    expect(error.cause).toBe(cause);
    expect(error.recoverable).toBe(true);
  });

  test('creates error without optional options', () => {
    const error = createAgentError('agent', 'CODE', 'message', {});

    expect(error.recoverable).toBe(false);
    expect(error.cause).toBeUndefined();
  });
});

describe('successResult', () => {
  test('creates success result with data', () => {
    const result = successResult({ value: 42 }, 100);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ value: 42 });
    expect(result.duration).toBe(100);
    expect(result.warnings).toBeUndefined();
    expect(result.errors).toBeUndefined();
  });

  test('success is always true', () => {
    const result = successResult(null, 0);

    expect(result.success).toBe(true);
  });

  test('includes warnings when provided', () => {
    const result = successResult('data', 50, ['Warning 1', 'Warning 2']);

    expect(result.warnings).toEqual(['Warning 1', 'Warning 2']);
    expect(result.success).toBe(true);
  });

  test('handles empty warnings array', () => {
    const result = successResult('data', 50, []);

    expect(result.warnings).toEqual([]);
  });

  test('works with different data types', () => {
    const stringResult = successResult('string data', 10);
    expect(stringResult.data).toBe('string data');

    const numberResult = successResult(123, 10);
    expect(numberResult.data).toBe(123);

    const arrayResult = successResult([1, 2, 3], 10);
    expect(arrayResult.data).toEqual([1, 2, 3]);

    const objectResult = successResult({ nested: { value: true } }, 10);
    expect(objectResult.data).toEqual({ nested: { value: true } });
  });

  test('duration is preserved', () => {
    const result = successResult('data', 999);

    expect(result.duration).toBe(999);
  });
});

describe('failureResult', () => {
  test('creates failure result with errors', () => {
    const errors: AgentError[] = [createAgentError('agent', 'CODE', 'Error message')];

    const result = failureResult(errors, 200);

    expect(result.success).toBe(false);
    expect(result.errors).toEqual(errors);
    expect(result.duration).toBe(200);
    expect(result.data).toBeUndefined();
    expect(result.warnings).toBeUndefined();
  });

  test('success is always false', () => {
    const result = failureResult([], 0);

    expect(result.success).toBe(false);
  });

  test('handles multiple errors', () => {
    const errors: AgentError[] = [
      createAgentError('agent1', 'CODE1', 'Error 1'),
      createAgentError('agent2', 'CODE2', 'Error 2'),
      createAgentError('agent3', 'CODE3', 'Error 3'),
    ];

    const result = failureResult(errors, 100);

    expect(result.errors).toHaveLength(3);
    expect(result.errors?.[0].code).toBe('CODE1');
    expect(result.errors?.[1].code).toBe('CODE2');
    expect(result.errors?.[2].code).toBe('CODE3');
  });

  test('includes warnings when provided', () => {
    const errors: AgentError[] = [createAgentError('agent', 'CODE', 'Error')];

    const result = failureResult(errors, 100, ['Warning 1']);

    expect(result.warnings).toEqual(['Warning 1']);
  });

  test('handles empty errors array', () => {
    const result = failureResult([], 50);

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(false);
  });

  test('preserves duration', () => {
    const result = failureResult([], 777);

    expect(result.duration).toBe(777);
  });
});

describe('createMessage', () => {
  test('creates message with correct structure', () => {
    const beforeTime = Date.now();
    const message = createMessage('test:type', { data: 'payload' }, 'source-agent');
    const afterTime = Date.now();

    expect(message.type).toBe('test:type');
    expect(message.payload).toEqual({ data: 'payload' });
    expect(message.source).toBe('source-agent');
    expect(message.timestamp).toBeGreaterThanOrEqual(beforeTime);
    expect(message.timestamp).toBeLessThanOrEqual(afterTime);
    expect(message.correlationId).toBeUndefined();
  });

  test('timestamp is Date.now()', () => {
    const now = Date.now();
    const message = createMessage('type', {}, 'source');

    // Allow 10ms tolerance
    expect(Math.abs(message.timestamp - now)).toBeLessThan(10);
  });

  test('correlationId is optional', () => {
    const messageWithoutId = createMessage('type', {}, 'source');
    expect(messageWithoutId.correlationId).toBeUndefined();

    const messageWithId = createMessage('type', {}, 'source', 'corr-123');
    expect(messageWithId.correlationId).toBe('corr-123');
  });

  test('handles different payload types', () => {
    const stringPayload = createMessage('type', 'string', 'source');
    expect(stringPayload.payload).toBe('string');

    const numberPayload = createMessage('type', 42, 'source');
    expect(numberPayload.payload).toBe(42);

    const arrayPayload = createMessage('type', [1, 2, 3], 'source');
    expect(arrayPayload.payload).toEqual([1, 2, 3]);

    const objectPayload = createMessage('type', { nested: { value: true } }, 'source');
    expect(objectPayload.payload).toEqual({ nested: { value: true } });

    const nullPayload = createMessage('type', null, 'source');
    expect(nullPayload.payload).toBeNull();
  });

  test('preserves all fields', () => {
    const message = createMessage('event:complete', { result: 'success' }, 'worker', 'uuid-123');

    expect(message.type).toBe('event:complete');
    expect(message.payload).toEqual({ result: 'success' });
    expect(message.source).toBe('worker');
    expect(message.correlationId).toBe('uuid-123');
  });
});

describe('DEFAULT_AGENT_CONFIGS', () => {
  test('validator config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.validator;

    expect(config.name).toBe('ansible-validator');
    expect(config.description).toBe('Validate Ansible code quality');
    expect(config.maxConcurrency).toBe(5);
    expect(config.timeout).toBe(30000);
    expect(config.retries).toBe(0);
  });

  test('writer config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.writer;

    expect(config.name).toBe('ansible-writer');
    expect(config.description).toBe('Write generated files to disk');
    expect(config.maxConcurrency).toBe(10);
    expect(config.timeout).toBe(30000);
    expect(config.retries).toBe(1);
  });

  test('linter config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.linter;

    expect(config.name).toBe('ansible-linter');
    expect(config.maxConcurrency).toBe(1);
    expect(config.timeout).toBe(60000);
    expect(config.retries).toBe(0);
  });

  test('planner config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.planner;

    expect(config.name).toBe('ansible-planner');
    expect(config.maxConcurrency).toBe(1);
    expect(config.timeout).toBe(120000);
    expect(config.retries).toBe(3);
  });

  test('generator config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.generator;

    expect(config.name).toBe('ansible-generator');
    expect(config.maxConcurrency).toBe(1);
    expect(config.timeout).toBe(180000);
    expect(config.retries).toBe(3);
  });

  test('fixer config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.fixer;

    expect(config.name).toBe('ansible-fixer');
    expect(config.maxConcurrency).toBe(5);
    expect(config.timeout).toBe(30000);
    expect(config.retries).toBe(0);
  });

  test('explainer config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.explainer;

    expect(config.name).toBe('ansible-explainer');
    expect(config.maxConcurrency).toBe(1);
    expect(config.timeout).toBe(120000);
    expect(config.retries).toBe(2);
  });

  test('debugger config has correct defaults', () => {
    const config = DEFAULT_AGENT_CONFIGS.debugger;

    expect(config.name).toBe('ansible-debugger');
    expect(config.maxConcurrency).toBe(1);
    expect(config.timeout).toBe(120000);
    expect(config.retries).toBe(2);
  });

  test('all agents have required fields', () => {
    for (const [key, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      expect(config.name).toBeDefined();
      expect(config.description).toBeDefined();
      expect(config.maxConcurrency).toBeGreaterThan(0);
      expect(config.timeout).toBeGreaterThan(0);
      expect(config.retries).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('Type interfaces', () => {
  test('AgentContext interface shape', () => {
    const context: AgentContext = {
      config: {
        api: { key: 'test-key' },
        defaults: { model: 'claude-sonnet-4-5-20250929', outputDir: './' },
      } as any,
      quiet: false,
      jsonMode: false,
      cwd: '/test/dir',
    };

    expect(context.config).toBeDefined();
    expect(context.quiet).toBe(false);
    expect(context.jsonMode).toBe(false);
    expect(context.cwd).toBe('/test/dir');
  });

  test('AgentResult generic type', () => {
    const stringResult: AgentResult<string> = {
      success: true,
      data: 'test',
      duration: 100,
    };
    expect(stringResult.data).toBe('test');

    const objectResult: AgentResult<{ id: number }> = {
      success: true,
      data: { id: 42 },
      duration: 100,
    };
    expect(objectResult.data?.id).toBe(42);
  });

  test('AgentMessage generic type', () => {
    const message: AgentMessage<{ count: number }> = {
      type: 'test',
      payload: { count: 5 },
      source: 'agent',
      timestamp: Date.now(),
    };

    expect(message.payload.count).toBe(5);
  });
});
