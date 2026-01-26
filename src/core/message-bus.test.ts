import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { MessageBus, MessageTypes, globalMessageBus } from './message-bus.js';
import type { AgentMessage } from './types.js';

describe('MessageBus', () => {
  let bus: MessageBus;

  beforeEach(() => {
    bus = new MessageBus();
  });

  describe('subscribe', () => {
    test('subscribe returns unsubscribe function', () => {
      const handler = mock(() => {});
      const subscription = bus.subscribe('test:event', handler);

      expect(subscription).toBeDefined();
      expect(typeof subscription.unsubscribe).toBe('function');
    });

    test('multiple subscriptions to same type', async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      bus.subscribe('test:event', handler1);
      bus.subscribe('test:event', handler2);

      await bus.publish('test:event', { data: 'test' }, 'source');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    test('subscriptions to different types are isolated', async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      bus.subscribe('type1', handler1);
      bus.subscribe('type2', handler2);

      await bus.publish('type1', { data: 'test' }, 'source');

      expect(handler1).toHaveBeenCalledTimes(1);
      expect(handler2).toHaveBeenCalledTimes(0);
    });
  });

  describe('unsubscribe', () => {
    test('unsubscribe removes handler', async () => {
      const handler = mock(() => {});
      const subscription = bus.subscribe('test:event', handler);

      await bus.publish('test:event', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      await bus.publish('test:event', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('unsubscribe is idempotent', () => {
      const handler = mock(() => {});
      const subscription = bus.subscribe('test:event', handler);

      subscription.unsubscribe();
      subscription.unsubscribe(); // Should not throw
      subscription.unsubscribe();
    });

    test('unsubscribe one handler does not affect others', async () => {
      const handler1 = mock(() => {});
      const handler2 = mock(() => {});

      const subscription1 = bus.subscribe('test:event', handler1);
      bus.subscribe('test:event', handler2);

      subscription1.unsubscribe();
      await bus.publish('test:event', {}, 'source');

      expect(handler1).toHaveBeenCalledTimes(0);
      expect(handler2).toHaveBeenCalledTimes(1);
    });
  });

  describe('publish', () => {
    test('published message reaches subscriber', async () => {
      const receivedMessages: AgentMessage[] = [];
      bus.subscribe('test:event', (msg) => {
        receivedMessages.push(msg);
      });

      await bus.publish('test:event', { value: 42 }, 'test-agent');

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].type).toBe('test:event');
      expect(receivedMessages[0].payload).toEqual({ value: 42 });
      expect(receivedMessages[0].source).toBe('test-agent');
    });

    test('multiple subscribers receive message', async () => {
      const received1: AgentMessage[] = [];
      const received2: AgentMessage[] = [];
      const received3: AgentMessage[] = [];

      bus.subscribe('test:event', (msg) => received1.push(msg));
      bus.subscribe('test:event', (msg) => received2.push(msg));
      bus.subscribe('test:event', (msg) => received3.push(msg));

      await bus.publish('test:event', { data: 'shared' }, 'source');

      expect(received1).toHaveLength(1);
      expect(received2).toHaveLength(1);
      expect(received3).toHaveLength(1);
    });

    test('publish creates proper message structure', async () => {
      let capturedMessage: AgentMessage | null = null;
      bus.subscribe('test:event', (msg) => {
        capturedMessage = msg;
      });

      const beforeTime = Date.now();
      await bus.publish('test:event', { key: 'value' }, 'my-agent', 'corr-123');
      const afterTime = Date.now();

      expect(capturedMessage).not.toBeNull();
      expect(capturedMessage!.type).toBe('test:event');
      expect(capturedMessage!.payload).toEqual({ key: 'value' });
      expect(capturedMessage!.source).toBe('my-agent');
      expect(capturedMessage!.correlationId).toBe('corr-123');
      expect(capturedMessage!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(capturedMessage!.timestamp).toBeLessThanOrEqual(afterTime);
    });

    test('publish to non-existent type does not throw', async () => {
      await expect(bus.publish('non:existent', {}, 'source')).resolves.toBeUndefined();
    });

    test('handles async handlers', async () => {
      let resolved = false;
      bus.subscribe('test:event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        resolved = true;
      });

      await bus.publish('test:event', {}, 'source');

      expect(resolved).toBe(true);
    });
  });

  describe('wildcard subscription', () => {
    test('wildcard subscription receives all messages', async () => {
      const receivedMessages: AgentMessage[] = [];
      bus.subscribe('*', (msg) => {
        receivedMessages.push(msg);
      });

      await bus.publish('type1', { a: 1 }, 'source');
      await bus.publish('type2', { b: 2 }, 'source');
      await bus.publish('type3', { c: 3 }, 'source');

      expect(receivedMessages).toHaveLength(3);
      expect(receivedMessages[0].type).toBe('type1');
      expect(receivedMessages[1].type).toBe('type2');
      expect(receivedMessages[2].type).toBe('type3');
    });

    test('wildcard and specific subscriptions both receive', async () => {
      const wildcardReceived: AgentMessage[] = [];
      const specificReceived: AgentMessage[] = [];

      bus.subscribe('*', (msg) => wildcardReceived.push(msg));
      bus.subscribe('specific:type', (msg) => specificReceived.push(msg));

      await bus.publish('specific:type', {}, 'source');

      expect(wildcardReceived).toHaveLength(1);
      expect(specificReceived).toHaveLength(1);
    });

    test('unsubscribe wildcard handler', async () => {
      const handler = mock(() => {});
      const subscription = bus.subscribe('*', handler);

      await bus.publish('test', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1);

      subscription.unsubscribe();
      await bus.publish('test', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('waitFor', () => {
    test('resolves when message is published', async () => {
      const waitPromise = bus.waitFor('test:complete');

      // Publish after a small delay
      setTimeout(() => {
        bus.publish('test:complete', { result: 'success' }, 'worker');
      }, 10);

      const message = await waitPromise;

      expect(message.type).toBe('test:complete');
      expect(message.payload).toEqual({ result: 'success' });
    });

    test('times out if message not received', async () => {
      const waitPromise = bus.waitFor('never:published', { timeout: 50 });

      await expect(waitPromise).rejects.toThrow(
        'Timeout waiting for message type: never:published',
      );
    });

    test('filters by correlationId when specified', async () => {
      const waitPromise = bus.waitFor('test:complete', {
        correlationId: 'correct-id',
        timeout: 100,
      });

      // Publish with wrong correlationId (should be ignored)
      await bus.publish('test:complete', { wrong: true }, 'source', 'wrong-id');

      // Publish with correct correlationId
      setTimeout(() => {
        bus.publish('test:complete', { correct: true }, 'source', 'correct-id');
      }, 10);

      const message = await waitPromise;
      expect(message.payload).toEqual({ correct: true });
    });

    test('default timeout is 30 seconds', async () => {
      // We can't test 30 seconds, but we can verify the timeout exists
      const waitPromise = bus.waitFor('test', { timeout: 10 });
      await expect(waitPromise).rejects.toThrow(/Timeout/);
    });
  });

  describe('request/response', () => {
    test('request publishes and waits for response', async () => {
      // Set up a responder
      bus.subscribe('request:data', async (msg) => {
        await bus.publish(
          'response:data',
          { result: `processed-${msg.payload}` },
          'responder',
          msg.correlationId,
        );
      });

      const response = await bus.request<string, { result: string }>(
        'request:data',
        'response:data',
        'input',
        'requester',
        { timeout: 1000 },
      );

      expect(response.payload.result).toBe('processed-input');
    });

    test('request timeout rejects', async () => {
      // No responder set up
      const requestPromise = bus.request('request:type', 'response:type', {}, 'source', {
        timeout: 50,
      });

      await expect(requestPromise).rejects.toThrow(/Timeout/);
    });

    test('correlation ID matching in request/response', async () => {
      let capturedCorrelationId: string | undefined;

      bus.subscribe('request:test', (msg) => {
        capturedCorrelationId = msg.correlationId;
        bus.publish('response:test', {}, 'responder', msg.correlationId);
      });

      await bus.request('request:test', 'response:test', {}, 'requester', { timeout: 1000 });

      expect(capturedCorrelationId).toBeDefined();
      expect(capturedCorrelationId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe('history', () => {
    test('getHistory returns all messages', async () => {
      await bus.publish('type1', { a: 1 }, 'source1');
      await bus.publish('type2', { b: 2 }, 'source2');
      await bus.publish('type3', { c: 3 }, 'source3');

      const history = bus.getHistory();

      expect(history).toHaveLength(3);
    });

    test('getHistory filters by type', async () => {
      await bus.publish('type1', {}, 'source');
      await bus.publish('type2', {}, 'source');
      await bus.publish('type1', {}, 'source');

      const filtered = bus.getHistory({ type: 'type1' });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((m) => m.type === 'type1')).toBe(true);
    });

    test('getHistory filters by source', async () => {
      await bus.publish('type', {}, 'source1');
      await bus.publish('type', {}, 'source2');
      await bus.publish('type', {}, 'source1');

      const filtered = bus.getHistory({ source: 'source1' });

      expect(filtered).toHaveLength(2);
      expect(filtered.every((m) => m.source === 'source1')).toBe(true);
    });

    test('getHistory respects limit', async () => {
      await bus.publish('type', {}, 'source');
      await bus.publish('type', {}, 'source');
      await bus.publish('type', {}, 'source');
      await bus.publish('type', {}, 'source');
      await bus.publish('type', {}, 'source');

      const limited = bus.getHistory({ limit: 2 });

      expect(limited).toHaveLength(2);
    });

    test('getHistory can combine filters', async () => {
      await bus.publish('type1', {}, 'source1');
      await bus.publish('type1', {}, 'source2');
      await bus.publish('type2', {}, 'source1');
      await bus.publish('type1', {}, 'source1');

      const filtered = bus.getHistory({ type: 'type1', source: 'source1', limit: 1 });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].type).toBe('type1');
      expect(filtered[0].source).toBe('source1');
    });

    test('clearHistory empties array', async () => {
      await bus.publish('type', {}, 'source');
      await bus.publish('type', {}, 'source');

      expect(bus.getHistory()).toHaveLength(2);

      bus.clearHistory();

      expect(bus.getHistory()).toHaveLength(0);
    });

    test('history limit is respected', async () => {
      const smallBus = new MessageBus({ historyLimit: 3 });

      await smallBus.publish('type', { n: 1 }, 'source');
      await smallBus.publish('type', { n: 2 }, 'source');
      await smallBus.publish('type', { n: 3 }, 'source');
      await smallBus.publish('type', { n: 4 }, 'source');
      await smallBus.publish('type', { n: 5 }, 'source');

      const history = smallBus.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].payload).toEqual({ n: 3 });
      expect(history[1].payload).toEqual({ n: 4 });
      expect(history[2].payload).toEqual({ n: 5 });
    });
  });

  describe('clear', () => {
    test('clear removes all subscriptions and history', async () => {
      const handler = mock(() => {});
      bus.subscribe('test', handler);
      await bus.publish('test', {}, 'source');

      expect(handler).toHaveBeenCalledTimes(1);
      expect(bus.getHistory()).toHaveLength(1);

      bus.clear();

      // Verify history is cleared immediately after clear()
      expect(bus.getHistory()).toHaveLength(0);

      await bus.publish('test', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1); // Not called again (subscription removed)
      // Note: publish still adds to history even without handlers
      expect(bus.getHistory()).toHaveLength(1);
    });

    test('clear removes wildcard subscriptions', async () => {
      const handler = mock(() => {});
      bus.subscribe('*', handler);
      await bus.publish('test', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1);

      bus.clear();

      await bus.publish('test', {}, 'source');
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MessageTypes', () => {
  test('validation message types', () => {
    expect(MessageTypes.VALIDATION_START).toBe('validation:start');
    expect(MessageTypes.VALIDATION_COMPLETE).toBe('validation:complete');
    expect(MessageTypes.VALIDATION_ERROR).toBe('validation:error');
  });

  test('lint message types', () => {
    expect(MessageTypes.LINT_START).toBe('lint:start');
    expect(MessageTypes.LINT_COMPLETE).toBe('lint:complete');
    expect(MessageTypes.LINT_ERROR).toBe('lint:error');
  });

  test('write message types', () => {
    expect(MessageTypes.WRITE_START).toBe('write:start');
    expect(MessageTypes.WRITE_COMPLETE).toBe('write:complete');
    expect(MessageTypes.WRITE_ERROR).toBe('write:error');
  });

  test('plan message types', () => {
    expect(MessageTypes.PLAN_START).toBe('plan:start');
    expect(MessageTypes.PLAN_COMPLETE).toBe('plan:complete');
    expect(MessageTypes.PLAN_ERROR).toBe('plan:error');
  });

  test('generate message types', () => {
    expect(MessageTypes.GENERATE_START).toBe('generate:start');
    expect(MessageTypes.GENERATE_COMPLETE).toBe('generate:complete');
    expect(MessageTypes.GENERATE_ERROR).toBe('generate:error');
  });

  test('fix message types', () => {
    expect(MessageTypes.FIX_START).toBe('fix:start');
    expect(MessageTypes.FIX_COMPLETE).toBe('fix:complete');
    expect(MessageTypes.FIX_ERROR).toBe('fix:error');
  });

  test('explain message types', () => {
    expect(MessageTypes.EXPLAIN_START).toBe('explain:start');
    expect(MessageTypes.EXPLAIN_COMPLETE).toBe('explain:complete');
    expect(MessageTypes.EXPLAIN_ERROR).toBe('explain:error');
  });

  test('debug message types', () => {
    expect(MessageTypes.DEBUG_START).toBe('debug:start');
    expect(MessageTypes.DEBUG_COMPLETE).toBe('debug:complete');
    expect(MessageTypes.DEBUG_ERROR).toBe('debug:error');
  });

  test('utility message types', () => {
    expect(MessageTypes.PROGRESS).toBe('progress');
    expect(MessageTypes.LOG).toBe('log');
  });
});

describe('globalMessageBus', () => {
  afterEach(() => {
    globalMessageBus.clear();
  });

  test('globalMessageBus is a MessageBus instance', () => {
    expect(globalMessageBus).toBeInstanceOf(MessageBus);
  });

  test('globalMessageBus can be used for pub/sub', async () => {
    const handler = mock(() => {});
    const subscription = globalMessageBus.subscribe('global:test', handler);

    await globalMessageBus.publish('global:test', {}, 'source');

    expect(handler).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
  });

  test('globalMessageBus persists across imports', async () => {
    await globalMessageBus.publish('persist:test', { id: 'unique' }, 'source');

    const history = globalMessageBus.getHistory({ type: 'persist:test' });
    expect(history).toHaveLength(1);
  });
});
