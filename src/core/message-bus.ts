/**
 * Message bus for agent communication.
 *
 * Provides publish/subscribe messaging between agents with
 * type-safe message handling and correlation tracking.
 */

import { type AgentMessage, createMessage } from './types.js';

/**
 * Message handler function type.
 */
export type MessageHandler<T = unknown> = (message: AgentMessage<T>) => void | Promise<void>;

/**
 * Subscription handle for unsubscribing.
 */
export interface Subscription {
  /** Unsubscribe from the message type */
  unsubscribe(): void;
}

/**
 * Simple in-memory message bus for agent communication.
 *
 * Supports:
 * - Publish/subscribe messaging
 * - Message type filtering
 * - Correlation ID tracking for request/response
 * - Async message handling
 */
export class MessageBus {
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private wildcardHandlers: Set<MessageHandler> = new Set();
  private messageHistory: AgentMessage[] = [];
  private historyLimit: number;

  constructor(options?: { historyLimit?: number }) {
    this.historyLimit = options?.historyLimit ?? 100;
  }

  /**
   * Subscribe to messages of a specific type.
   *
   * @param messageType - The message type to subscribe to, or '*' for all messages
   * @param handler - Function to handle received messages
   * @returns Subscription handle for unsubscribing
   */
  subscribe<T = unknown>(messageType: string, handler: MessageHandler<T>): Subscription {
    if (messageType === '*') {
      this.wildcardHandlers.add(handler as MessageHandler);
      return {
        unsubscribe: () => {
          this.wildcardHandlers.delete(handler as MessageHandler);
        },
      };
    }

    let handlers = this.handlers.get(messageType);
    if (!handlers) {
      handlers = new Set();
      this.handlers.set(messageType, handlers);
    }
    handlers.add(handler as MessageHandler);

    return {
      unsubscribe: () => {
        handlers?.delete(handler as MessageHandler);
        if (handlers?.size === 0) {
          this.handlers.delete(messageType);
        }
      },
    };
  }

  /**
   * Publish a message to all subscribers.
   *
   * @param type - Message type
   * @param payload - Message payload
   * @param source - Source agent name
   * @param correlationId - Optional correlation ID
   */
  async publish<T>(
    type: string,
    payload: T,
    source: string,
    correlationId?: string,
  ): Promise<void> {
    const message = createMessage(type, payload, source, correlationId);

    // Store in history
    this.messageHistory.push(message as AgentMessage);
    if (this.messageHistory.length > this.historyLimit) {
      this.messageHistory.shift();
    }

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      const promises: Promise<void>[] = [];
      for (const handler of typeHandlers) {
        const result = handler(message as AgentMessage);
        if (result instanceof Promise) {
          promises.push(result);
        }
      }
      await Promise.all(promises);
    }

    // Notify wildcard handlers
    const wildcardPromises: Promise<void>[] = [];
    for (const handler of this.wildcardHandlers) {
      const result = handler(message as AgentMessage);
      if (result instanceof Promise) {
        wildcardPromises.push(result);
      }
    }
    await Promise.all(wildcardPromises);
  }

  /**
   * Wait for a message matching the given criteria.
   *
   * @param type - Message type to wait for
   * @param options - Wait options
   * @returns The received message
   */
  waitFor<T>(
    type: string,
    options?: { timeout?: number; correlationId?: string },
  ): Promise<AgentMessage<T>> {
    const timeout = options?.timeout ?? 30000;
    const correlationId = options?.correlationId;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error(`Timeout waiting for message type: ${type}`));
      }, timeout);

      const subscription = this.subscribe<T>(type, (message) => {
        if (correlationId && message.correlationId !== correlationId) {
          return;
        }
        clearTimeout(timer);
        subscription.unsubscribe();
        resolve(message);
      });
    });
  }

  /**
   * Request/response pattern with correlation tracking.
   *
   * @param requestType - Request message type
   * @param responseType - Expected response message type
   * @param payload - Request payload
   * @param source - Source agent name
   * @param options - Request options
   * @returns Response message
   */
  async request<TReq, TRes>(
    requestType: string,
    responseType: string,
    payload: TReq,
    source: string,
    options?: { timeout?: number },
  ): Promise<AgentMessage<TRes>> {
    const correlationId = crypto.randomUUID();

    // Start waiting before publishing to avoid race condition
    const responsePromise = this.waitFor<TRes>(responseType, {
      timeout: options?.timeout,
      correlationId,
    });

    // Publish the request
    await this.publish(requestType, payload, source, correlationId);

    // Wait for response
    return responsePromise;
  }

  /**
   * Get messages from history.
   *
   * @param filter - Optional filter criteria
   * @returns Matching messages
   */
  getHistory(filter?: { type?: string; source?: string; limit?: number }): AgentMessage[] {
    let messages = [...this.messageHistory];

    if (filter?.type) {
      messages = messages.filter((m) => m.type === filter.type);
    }
    if (filter?.source) {
      messages = messages.filter((m) => m.source === filter.source);
    }
    if (filter?.limit) {
      messages = messages.slice(-filter.limit);
    }

    return messages;
  }

  /**
   * Clear message history.
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * Clear all subscriptions.
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers.clear();
    this.messageHistory = [];
  }
}

/**
 * Global message bus instance for the application.
 * Agents can import this directly for communication.
 */
export const globalMessageBus = new MessageBus();

// ============================================================
// Standard Message Types
// ============================================================

/**
 * Standard message types used by agents.
 */
export const MessageTypes = {
  // Validation messages
  VALIDATION_START: 'validation:start',
  VALIDATION_COMPLETE: 'validation:complete',
  VALIDATION_ERROR: 'validation:error',

  // Linting messages
  LINT_START: 'lint:start',
  LINT_COMPLETE: 'lint:complete',
  LINT_ERROR: 'lint:error',

  // Writing messages
  WRITE_START: 'write:start',
  WRITE_COMPLETE: 'write:complete',
  WRITE_ERROR: 'write:error',

  // Planning messages
  PLAN_START: 'plan:start',
  PLAN_COMPLETE: 'plan:complete',
  PLAN_ERROR: 'plan:error',

  // Generation messages
  GENERATE_START: 'generate:start',
  GENERATE_COMPLETE: 'generate:complete',
  GENERATE_ERROR: 'generate:error',

  // Fix messages
  FIX_START: 'fix:start',
  FIX_COMPLETE: 'fix:complete',
  FIX_ERROR: 'fix:error',

  // Explain messages
  EXPLAIN_START: 'explain:start',
  EXPLAIN_COMPLETE: 'explain:complete',
  EXPLAIN_ERROR: 'explain:error',

  // Debug messages
  DEBUG_START: 'debug:start',
  DEBUG_COMPLETE: 'debug:complete',
  DEBUG_ERROR: 'debug:error',

  // Progress messages
  PROGRESS: 'progress',
  LOG: 'log',
} as const;

export type MessageType = (typeof MessageTypes)[keyof typeof MessageTypes];
