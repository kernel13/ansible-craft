/**
 * Agent context creation utility for CLI commands.
 *
 * Provides a consistent way to create AgentContext from CLI options.
 */

import type { AgentContext } from '../../core/types.js';
import type { Config } from '../../config/index.js';

/**
 * Options for creating an agent context.
 */
export interface CreateAgentContextOptions {
  /** Application configuration */
  config: Config;
  /** Suppress output */
  quiet?: boolean;
  /** Output in JSON format */
  json?: boolean;
  /** Working directory override */
  cwd?: string;
}

/**
 * Create an AgentContext from CLI options.
 *
 * @param options - CLI options to convert
 * @returns AgentContext for agent execution
 *
 * @example
 * ```typescript
 * const context = createAgentContext({
 *   config: await loadConfig(),
 *   quiet: options.quiet,
 *   json: options.json,
 * });
 * const result = await agent.execute(input, context);
 * ```
 */
export function createAgentContext(options: CreateAgentContextOptions): AgentContext {
  return {
    config: options.config,
    quiet: options.quiet ?? false,
    jsonMode: options.json ?? false,
    cwd: options.cwd ?? process.cwd(),
  };
}
