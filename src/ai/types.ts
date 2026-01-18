/**
 * Type definitions for AI integration layer.
 */

/**
 * Configuration options for creating an Anthropic client.
 */
export interface ClientOptions {
  apiKey: string;
  maxRetries?: number; // Default: 3 (from CONTEXT.md)
  timeout?: number; // Default: 120000 (2 min)
  noRetry?: boolean; // --no-retry flag sets this true
}

/**
 * Options for creating a message.
 */
export interface MessageOptions {
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  userMessage: string;
  quiet?: boolean; // --quiet flag
  verbose?: boolean; // --verbose flag
  noRetry?: boolean; // --no-retry flag
}
