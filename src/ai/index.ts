/**
 * AI integration layer for ansible-craft.
 *
 * Provides Claude API client, streaming, and error handling.
 *
 * @example
 * ```typescript
 * import { createClient, streamMessage, extractText } from './ai/index.js';
 *
 * const client = createClient({ apiKey: process.env.ANTHROPIC_API_KEY! });
 * const message = await streamMessage(client, {
 *   userMessage: 'Write an Ansible task to install nginx',
 *   systemPrompt: 'You are an Ansible expert.',
 * });
 * const text = extractText(message);
 * ```
 */
export * from './types.ts';
export * from './client.ts';
export * from './errors.ts';
export * from './retry.ts';
export * from './stream.ts';
