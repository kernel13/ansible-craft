import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  AgentOrchestrator,
  batch,
  createOrchestrator,
  executeConcurrent,
  executeParallel,
  executePipeline,
  retryWithBackoff,
  withTimeout,
  type ParallelResult,
  type PipelineStage,
} from './orchestrator.js';
import { globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

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

describe('batch', () => {
  test('batches items into correct size', () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const batches = batch(items, 3);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual([1, 2, 3]);
    expect(batches[1]).toEqual([4, 5, 6]);
    expect(batches[2]).toEqual([7]);
  });

  test('handles empty array', () => {
    const batches = batch([], 5);
    expect(batches).toHaveLength(0);
  });

  test('handles array smaller than batch size', () => {
    const items = [1, 2];
    const batches = batch(items, 5);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual([1, 2]);
  });

  test('handles batch size of 1', () => {
    const items = [1, 2, 3];
    const batches = batch(items, 1);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual([1]);
    expect(batches[1]).toEqual([2]);
    expect(batches[2]).toEqual([3]);
  });

  test('handles array with exact multiple of batch size', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const batches = batch(items, 2);

    expect(batches).toHaveLength(3);
    expect(batches[0]).toEqual([1, 2]);
    expect(batches[1]).toEqual([3, 4]);
    expect(batches[2]).toEqual([5, 6]);
  });
});

describe('withTimeout', () => {
  test('completes if promise faster', async () => {
    const promise = Promise.resolve('result');
    const result = await withTimeout(promise, 1000);

    expect(result).toBe('result');
  });

  test('rejects if timeout exceeded', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('result'), 200));

    await expect(withTimeout(slowPromise, 50)).rejects.toThrow('Operation timed out');
  });

  test('uses custom error message', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('result'), 200));

    await expect(withTimeout(slowPromise, 50, 'Custom timeout message')).rejects.toThrow(
      'Custom timeout message',
    );
  });

  test('clears timeout on success', async () => {
    // This test verifies no unhandled promise rejection after completion
    const promise = Promise.resolve('fast');
    const result = await withTimeout(promise, 100);

    expect(result).toBe('fast');
    // Wait a bit to ensure no timeout fires
    await new Promise((resolve) => setTimeout(resolve, 150));
  });

  test('clears timeout on error', async () => {
    const failingPromise = Promise.reject(new Error('Immediate failure'));

    await expect(withTimeout(failingPromise, 1000)).rejects.toThrow('Immediate failure');
  });
});

describe('retryWithBackoff', () => {
  test('succeeds on first try', async () => {
    const operation = mock(async () => 'success');

    const result = await retryWithBackoff(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  test('retries up to maxRetries', async () => {
    let attempts = 0;
    const operation = mock(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success after retries';
    });

    const result = await retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
    });

    expect(result).toBe('success after retries');
    expect(attempts).toBe(3);
  });

  test('throws after exhausting retries', async () => {
    const operation = mock(async () => {
      throw new Error('Persistent failure');
    });

    await expect(
      retryWithBackoff(operation, {
        maxRetries: 2,
        baseDelayMs: 1,
        maxDelayMs: 10,
      }),
    ).rejects.toThrow('Persistent failure');

    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  test('exponential backoff delay', async () => {
    const times: number[] = [];
    let attempts = 0;

    const operation = mock(async () => {
      times.push(Date.now());
      attempts++;
      if (attempts < 3) {
        throw new Error('Fail');
      }
      return 'done';
    });

    await retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelayMs: 50,
      maxDelayMs: 1000,
    });

    // First retry should wait ~50ms, second ~100ms
    const delay1 = times[1] - times[0];
    const delay2 = times[2] - times[1];

    expect(delay1).toBeGreaterThanOrEqual(40);
    expect(delay1).toBeLessThan(100);
    expect(delay2).toBeGreaterThanOrEqual(80);
    expect(delay2).toBeLessThan(200);
  });

  test('respects maxDelayMs cap', async () => {
    const times: number[] = [];
    let attempts = 0;

    const operation = mock(async () => {
      times.push(Date.now());
      attempts++;
      if (attempts < 4) {
        throw new Error('Fail');
      }
      return 'done';
    });

    await retryWithBackoff(operation, {
      maxRetries: 5,
      baseDelayMs: 50,
      maxDelayMs: 60, // Cap at 60ms
    });

    // All delays should be capped at ~60ms
    for (let i = 1; i < times.length; i++) {
      const delay = times[i] - times[i - 1];
      expect(delay).toBeLessThan(100);
    }
  });

  test('uses defaults when no options provided', async () => {
    let attempts = 0;
    const operation = mock(async () => {
      attempts++;
      if (attempts < 2) {
        throw new Error('Fail once');
      }
      return 'success';
    });

    const result = await retryWithBackoff(operation);

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});

describe('executeParallel', () => {
  test('executes all operations', async () => {
    const operations = [
      async () => successResult(1, 10),
      async () => successResult(2, 10),
      async () => successResult(3, 10),
    ];

    const result = await executeParallel(operations);

    expect(result.results).toHaveLength(3);
    expect(result.successCount).toBe(3);
    expect(result.failureCount).toBe(0);
  });

  test('respects maxConcurrency limit', async () => {
    let concurrentCount = 0;
    let maxConcurrent = 0;

    const operations = Array(10)
      .fill(null)
      .map(() => async () => {
        concurrentCount++;
        maxConcurrent = Math.max(maxConcurrent, concurrentCount);
        await new Promise((resolve) => setTimeout(resolve, 20));
        concurrentCount--;
        return successResult('done', 10);
      });

    await executeParallel(operations, { maxConcurrency: 3 });

    expect(maxConcurrent).toBeLessThanOrEqual(3);
  });

  test('failFast stops on first error', async () => {
    let executedCount = 0;

    const operations = [
      async () => {
        executedCount++;
        return successResult(1, 10);
      },
      async () => {
        executedCount++;
        return failureResult([createAgentError('test', 'ERROR', 'Failed')], 10);
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        executedCount++;
        return successResult(3, 10);
      },
    ];

    const result = await executeParallel(operations, { failFast: true, maxConcurrency: 1 });

    expect(result.failureCount).toBeGreaterThan(0);
    // Third operation should not run (loop breaks after failure)
    expect(executedCount).toBe(2);
    expect(result.results).toHaveLength(2);
  });

  test('progress callback called', async () => {
    const progressCalls: Array<{ completed: number; total: number }> = [];

    const operations = [
      async () => successResult(1, 10),
      async () => successResult(2, 10),
      async () => successResult(3, 10),
    ];

    await executeParallel(operations, {
      maxConcurrency: 1,
      onProgress: (completed, total) => {
        progressCalls.push({ completed, total });
      },
    });

    expect(progressCalls).toHaveLength(3);
    expect(progressCalls[0]).toEqual({ completed: 1, total: 3 });
    expect(progressCalls[2]).toEqual({ completed: 3, total: 3 });
  });

  test('handles thrown exceptions', async () => {
    const operations = [
      async () => successResult(1, 10),
      async () => {
        throw new Error('Unexpected error');
      },
      async () => successResult(3, 10),
    ];

    const result = await executeParallel(operations, { maxConcurrency: 1 });

    expect(result.failureCount).toBe(1);
    expect(result.successCount).toBe(2);
    expect(result.results[1].errors?.[0].code).toBe('EXECUTION_ERROR');
  });

  test('returns duration', async () => {
    const operations = [async () => successResult(1, 10), async () => successResult(2, 10)];

    const result = await executeParallel(operations);

    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});

describe('executePipeline', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  test('executes stages sequentially', async () => {
    const executionOrder: string[] = [];

    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'stage1',
        agent: {
          name: 'agent1',
          description: 'Test agent 1',
          execute: async (input) => {
            executionOrder.push('stage1');
            return successResult({ ...input, stage1: true }, 10);
          },
        },
      },
      {
        name: 'stage2',
        agent: {
          name: 'agent2',
          description: 'Test agent 2',
          execute: async (input) => {
            executionOrder.push('stage2');
            return successResult({ ...input, stage2: true }, 10);
          },
        },
      },
    ];

    const result = await executePipeline(stages, { initial: true }, testContext);

    expect(result.success).toBe(true);
    expect(executionOrder).toEqual(['stage1', 'stage2']);
  });

  test('passes output to next stage', async () => {
    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'stage1',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => successResult({ value: 10 }, 10),
        },
      },
      {
        name: 'stage2',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async (input: any) => successResult({ value: input.value * 2 }, 10),
        },
      },
    ];

    const result = await executePipeline<unknown, { value: number }>(stages, {}, testContext);

    expect(result.data?.value).toBe(20);
  });

  test('transform function modifies output', async () => {
    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'stage1',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => successResult({ nested: { value: 5 } }, 10),
        },
        transform: (output: any) => output.nested,
      },
      {
        name: 'stage2',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async (input: any) => successResult({ doubled: input.value * 2 }, 10),
        },
      },
    ];

    const result = await executePipeline<unknown, { doubled: number }>(stages, {}, testContext);

    expect(result.data?.doubled).toBe(10);
  });

  test('stopOnError behavior', async () => {
    const executionOrder: string[] = [];

    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'stage1',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => {
            executionOrder.push('stage1');
            return successResult('ok', 10);
          },
        },
      },
      {
        name: 'stage2',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async () => {
            executionOrder.push('stage2');
            return failureResult([createAgentError('agent2', 'ERROR', 'Failed')], 10);
          },
        },
      },
      {
        name: 'stage3',
        agent: {
          name: 'agent3',
          description: 'Test',
          execute: async () => {
            executionOrder.push('stage3');
            return successResult('ok', 10);
          },
        },
      },
    ];

    const result = await executePipeline(stages, {}, testContext, { failFast: true });

    expect(result.success).toBe(false);
    expect(executionOrder).toEqual(['stage1', 'stage2']); // stage3 not executed
  });

  test('collects warnings from all stages', async () => {
    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'stage1',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => successResult('ok', 10, ['Warning 1']),
        },
      },
      {
        name: 'stage2',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async () => successResult('ok', 10, ['Warning 2', 'Warning 3']),
        },
      },
    ];

    const result = await executePipeline(stages, {}, testContext);

    expect(result.warnings).toEqual(['Warning 1', 'Warning 2', 'Warning 3']);
  });

  test('progress callback called for each stage', async () => {
    const progressCalls: Array<{ stage: number; total: number; name: string }> = [];

    const stages: PipelineStage<unknown, unknown>[] = [
      {
        name: 'first',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => successResult('ok', 10),
        },
      },
      {
        name: 'second',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async () => successResult('ok', 10),
        },
      },
    ];

    await executePipeline(stages, {}, testContext, {
      onProgress: (stage, total, name) => {
        progressCalls.push({ stage, total, name });
      },
    });

    expect(progressCalls).toHaveLength(2);
    expect(progressCalls[0]).toEqual({ stage: 1, total: 2, name: 'first' });
    expect(progressCalls[1]).toEqual({ stage: 2, total: 2, name: 'second' });
  });
});

describe('executeConcurrent', () => {
  test('executes multiple agents concurrently', async () => {
    // Track execution
    const executed: string[] = [];

    const agents = [
      {
        name: 'agent1',
        agent: {
          name: 'agent1',
          description: 'Test',
          execute: async () => {
            executed.push('agent1');
            return successResult({ result: 1 }, 10);
          },
        } as Agent<unknown, unknown>,
        input: {},
      },
      {
        name: 'agent2',
        agent: {
          name: 'agent2',
          description: 'Test',
          execute: async () => {
            executed.push('agent2');
            return successResult({ result: 2 }, 10);
          },
        } as Agent<unknown, unknown>,
        input: {},
      },
    ];

    const { duration } = await executeConcurrent(agents, testContext);

    // Both agents should have executed
    expect(executed).toContain('agent1');
    expect(executed).toContain('agent2');
    expect(duration).toBeGreaterThanOrEqual(0);
  });
});

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    orchestrator = createOrchestrator(testContext);
    globalMessageBus.clear();
  });

  describe('register/get', () => {
    test('registers and retrieves agent', () => {
      const agent: Agent<string, string> = {
        name: 'test-agent',
        description: 'Test agent',
        execute: async (input) => successResult(input.toUpperCase(), 10),
      };

      orchestrator.register(agent);
      const retrieved = orchestrator.get<string, string>('test-agent');

      expect(retrieved).toBe(agent);
    });

    test('returns undefined for unregistered agent', () => {
      const agent = orchestrator.get('nonexistent');
      expect(agent).toBeUndefined();
    });
  });

  describe('execute', () => {
    test('executes registered agent', async () => {
      const agent: Agent<number, number> = {
        name: 'doubler',
        description: 'Doubles input',
        execute: async (input) => successResult(input * 2, 10),
      };

      orchestrator.register(agent);
      const result = await orchestrator.execute<number, number>('doubler', 5);

      expect(result.success).toBe(true);
      expect(result.data).toBe(10);
    });

    test('returns error for unregistered agent', async () => {
      const result = await orchestrator.execute('nonexistent', {});

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('parallel', () => {
    test('executes multiple agents in parallel', async () => {
      const agent1: Agent<number, number> = {
        name: 'adder',
        description: 'Adds 10',
        execute: async (input) => successResult(input + 10, 10),
      };
      const agent2: Agent<number, number> = {
        name: 'multiplier',
        description: 'Multiplies by 2',
        execute: async (input) => successResult(input * 2, 10),
      };

      orchestrator.register(agent1);
      orchestrator.register(agent2);

      const result = await orchestrator.parallel<number>([
        { name: 'adder', input: 5 },
        { name: 'multiplier', input: 5 },
      ]);

      expect(result.results).toHaveLength(2);
      expect(result.successCount).toBe(2);
    });

    test('handles missing agent in parallel execution', async () => {
      const agent: Agent<number, number> = {
        name: 'existing',
        description: 'Exists',
        execute: async () => successResult(1, 10),
      };

      orchestrator.register(agent);

      const result = await orchestrator.parallel([
        { name: 'existing', input: 1 },
        { name: 'missing', input: 2 },
      ]);

      expect(result.failureCount).toBe(1);
    });
  });

  describe('pipeline', () => {
    test('executes pipeline of registered agents', async () => {
      const agent1: Agent<number, number> = {
        name: 'step1',
        description: 'Step 1',
        execute: async (input) => successResult(input + 10, 10),
      };
      const agent2: Agent<number, number> = {
        name: 'step2',
        description: 'Step 2',
        execute: async (input) => successResult(input * 2, 10),
      };

      orchestrator.register(agent1);
      orchestrator.register(agent2);

      const result = await orchestrator.pipeline<number, number>(
        [
          { name: 'Stage 1', agentName: 'step1' },
          { name: 'Stage 2', agentName: 'step2' },
        ],
        5,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe(30); // (5 + 10) * 2
    });

    test('returns error for missing agent in pipeline', async () => {
      const result = await orchestrator.pipeline([{ name: 'Stage', agentName: 'missing' }], {});

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('AGENT_NOT_FOUND');
    });
  });

  describe('context management', () => {
    test('updateContext updates the context', () => {
      orchestrator.updateContext({ quiet: false });

      const context = orchestrator.getContext();
      expect(context.quiet).toBe(false);
    });

    test('getContext returns current context', () => {
      const context = orchestrator.getContext();

      expect(context.cwd).toBe('/test');
      expect(context.quiet).toBe(true);
    });
  });
});

describe('createOrchestrator', () => {
  test('creates new orchestrator instance', () => {
    const orchestrator = createOrchestrator(testContext);

    expect(orchestrator).toBeInstanceOf(AgentOrchestrator);
    expect(orchestrator.getContext()).toBe(testContext);
  });
});
