/**
 * CLI helper utilities for agent integration.
 *
 * Provides consistent patterns for:
 * - Creating agent contexts from CLI options
 * - Handling agent failures with proper error display
 * - Displaying agent warnings
 */

export { createAgentContext, type CreateAgentContextOptions } from './agent-context.js';
export {
  displayAgentWarnings,
  handleAgentFailure,
  type AgentFailureOptions,
} from './agent-errors.js';
