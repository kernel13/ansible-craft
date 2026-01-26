/**
 * Agent orchestrator for coordinating multi-agent workflows.
 *
 * Provides:
 * - Parallel execution with concurrency limits
 * - Sequential pipelines
 * - Error aggregation and recovery
 * - Progress tracking
 */

import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentError,
  type AgentResult,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Options for parallel execution.
 */
export interface ParallelOptions {
  /** Maximum concurrent operations */
  maxConcurrency?: number;
  /** Stop on first error */
  failFast?: boolean;
  /** Progress callback */
  onProgress?: (completed: number, total: number, agent: string) => void;
}

/**
 * Options for pipeline execution.
 */
export interface PipelineOptions {
  /** Stop on first error */
  failFast?: boolean;
  /** Progress callback */
  onProgress?: (stage: number, total: number, agent: string) => void;
}

/**
 * Result of parallel execution.
 */
export interface ParallelResult<T> {
  /** All results (in order of completion) */
  results: AgentResult<T>[];
  /** Number of successful executions */
  successCount: number;
  /** Number of failed executions */
  failureCount: number;
  /** Total duration in milliseconds */
  duration: number;
}

/**
 * Execute multiple operations in parallel with concurrency limits.
 *
 * @param operations - Array of async operations
 * @param options - Execution options
 * @returns Combined results
 */
export async function executeParallel<T>(
  operations: Array<() => Promise<AgentResult<T>>>,
  options?: ParallelOptions,
): Promise<ParallelResult<T>> {
  const startTime = Date.now();
  const maxConcurrency = options?.maxConcurrency ?? 5;
  const failFast = options?.failFast ?? false;
  const onProgress = options?.onProgress;

  const results: AgentResult<T>[] = [];
  let completed = 0;
  let successCount = 0;
  let failureCount = 0;
  let aborted = false;

  // Process in batches
  const total = operations.length;

  for (let i = 0; i < total; i += maxConcurrency) {
    if (aborted) break;

    const batch = operations.slice(i, i + maxConcurrency);
    const batchPromises = batch.map(async (op, batchIndex) => {
      if (aborted) {
        return failureResult<T>(
          [createAgentError('orchestrator', 'ABORTED', 'Operation aborted', { recoverable: true })],
          0,
        );
      }

      try {
        const result = await op();
        completed++;

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          if (failFast) {
            aborted = true;
          }
        }

        onProgress?.(completed, total, `batch-${i + batchIndex}`);
        return result;
      } catch (error) {
        completed++;
        failureCount++;
        if (failFast) {
          aborted = true;
        }
        onProgress?.(completed, total, `batch-${i + batchIndex}`);
        return failureResult<T>(
          [
            createAgentError('orchestrator', 'EXECUTION_ERROR', String(error), {
              cause: error instanceof Error ? error : undefined,
              recoverable: false,
            }),
          ],
          Date.now() - startTime,
        );
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return {
    results,
    successCount,
    failureCount,
    duration: Date.now() - startTime,
  };
}

/**
 * Pipeline stage definition.
 */
export interface PipelineStage<TIn, TOut> {
  /** Stage name for logging */
  name: string;
  /** Agent to execute */
  agent: Agent<TIn, TOut>;
  /** Transform output to next stage input (optional) */
  transform?: (output: TOut) => unknown;
}

/**
 * Execute a pipeline of agents sequentially.
 *
 * @param stages - Array of pipeline stages
 * @param initialInput - Input for the first stage
 * @param context - Agent context
 * @param options - Pipeline options
 * @returns Final pipeline result
 */
export async function executePipeline<TInitial, TFinal>(
  stages: PipelineStage<unknown, unknown>[],
  initialInput: TInitial,
  context: AgentContext,
  options?: PipelineOptions,
): Promise<AgentResult<TFinal>> {
  const startTime = Date.now();
  const failFast = options?.failFast ?? true;
  const onProgress = options?.onProgress;

  let currentInput: unknown = initialInput;
  const allErrors: AgentError[] = [];
  const allWarnings: string[] = [];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    onProgress?.(i + 1, stages.length, stage.name);

    // Publish progress message
    await globalMessageBus.publish(
      MessageTypes.PROGRESS,
      { stage: i + 1, total: stages.length, name: stage.name },
      'orchestrator',
    );

    const result = await stage.agent.execute(currentInput, context);

    // Collect warnings
    if (result.warnings) {
      allWarnings.push(...result.warnings);
    }

    // Handle errors
    if (!result.success) {
      if (result.errors) {
        allErrors.push(...result.errors);
      }
      if (failFast) {
        return failureResult<TFinal>(allErrors, Date.now() - startTime, allWarnings);
      }
    }

    // Transform output for next stage
    if (result.data !== undefined) {
      currentInput = stage.transform ? stage.transform(result.data) : result.data;
    }
  }

  if (allErrors.length > 0) {
    return failureResult<TFinal>(allErrors, Date.now() - startTime, allWarnings);
  }

  return successResult(currentInput as TFinal, Date.now() - startTime, allWarnings);
}

/**
 * Execute multiple agents concurrently and combine results.
 *
 * @param agents - Map of agent name to agent/input tuple
 * @param context - Agent context
 * @param options - Parallel options
 * @returns Map of agent name to result
 */
export async function executeConcurrent<T extends Record<string, AgentResult<unknown>>>(
  agents: Array<{
    name: string;
    agent: Agent<unknown, unknown>;
    input: unknown;
  }>,
  context: AgentContext,
  options?: ParallelOptions,
): Promise<{ results: Map<string, AgentResult<unknown>>; duration: number }> {
  const startTime = Date.now();

  const operations = agents.map(({ name, agent, input }) => async () => {
    const result = await agent.execute(input, context);
    return { name, result };
  });

  const parallelResult = await executeParallel(operations, options);

  const resultsMap = new Map<string, AgentResult<unknown>>();
  for (const result of parallelResult.results) {
    if (result.data) {
      const { name, result: agentResult } = result.data as {
        name: string;
        result: AgentResult<unknown>;
      };
      resultsMap.set(name, agentResult);
    }
  }

  return {
    results: resultsMap,
    duration: Date.now() - startTime,
  };
}

/**
 * Orchestrator class for managing complex agent workflows.
 */
export class AgentOrchestrator {
  private context: AgentContext;
  private agents: Map<string, Agent<unknown, unknown>> = new Map();

  constructor(context: AgentContext) {
    this.context = context;
  }

  /**
   * Register an agent with the orchestrator.
   */
  register<TIn, TOut>(agent: Agent<TIn, TOut>): void {
    this.agents.set(agent.name, agent as Agent<unknown, unknown>);
  }

  /**
   * Get a registered agent by name.
   */
  get<TIn, TOut>(name: string): Agent<TIn, TOut> | undefined {
    return this.agents.get(name) as Agent<TIn, TOut> | undefined;
  }

  /**
   * Execute a single agent.
   */
  async execute<TIn, TOut>(agentName: string, input: TIn): Promise<AgentResult<TOut>> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      return failureResult<TOut>(
        [createAgentError('orchestrator', 'AGENT_NOT_FOUND', `Agent not found: ${agentName}`)],
        0,
      );
    }

    return agent.execute(input, this.context) as Promise<AgentResult<TOut>>;
  }

  /**
   * Execute multiple agents in parallel.
   */
  async parallel<T>(
    executions: Array<{ name: string; input: unknown }>,
    options?: ParallelOptions,
  ): Promise<ParallelResult<T>> {
    const operations = executions.map(({ name, input }) => async () => {
      const agent = this.agents.get(name);
      if (!agent) {
        return failureResult<T>(
          [createAgentError('orchestrator', 'AGENT_NOT_FOUND', `Agent not found: ${name}`)],
          0,
        );
      }
      return agent.execute(input, this.context) as Promise<AgentResult<T>>;
    });

    return executeParallel(operations, options);
  }

  /**
   * Execute a pipeline of agents.
   */
  async pipeline<TInitial, TFinal>(
    stageNames: Array<{
      name: string;
      agentName: string;
      transform?: (output: unknown) => unknown;
    }>,
    initialInput: TInitial,
    options?: PipelineOptions,
  ): Promise<AgentResult<TFinal>> {
    const stages: PipelineStage<unknown, unknown>[] = [];

    for (const { name, agentName, transform } of stageNames) {
      const agent = this.agents.get(agentName);
      if (!agent) {
        return failureResult<TFinal>(
          [createAgentError('orchestrator', 'AGENT_NOT_FOUND', `Agent not found: ${agentName}`)],
          0,
        );
      }
      stages.push({ name, agent, transform });
    }

    return executePipeline<TInitial, TFinal>(stages, initialInput, this.context, options);
  }

  /**
   * Update the context.
   */
  updateContext(updates: Partial<AgentContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Get current context.
   */
  getContext(): AgentContext {
    return this.context;
  }
}

/**
 * Create an orchestrator with default configuration.
 */
export function createOrchestrator(context: AgentContext): AgentOrchestrator {
  return new AgentOrchestrator(context);
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Batch items into groups of specified size.
 */
export function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

/**
 * Execute with timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out',
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    return result;
  } catch (error) {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    throw error;
  }
}

/**
 * Retry an operation with exponential backoff.
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 1000;
  const maxDelayMs = options?.maxDelayMs ?? 30000;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
