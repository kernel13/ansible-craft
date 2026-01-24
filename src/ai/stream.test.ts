import { describe, expect, test } from 'bun:test';
import type Anthropic from '@anthropic-ai/sdk';
import { extractText } from './stream.js';

describe('extractText', () => {
  test('should extract text from single text block', () => {
    const message: Anthropic.Message = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [{ type: 'text', text: 'Hello world' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe('Hello world');
  });

  test('should concatenate multiple text blocks', () => {
    const message: Anthropic.Message = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [
        { type: 'text', text: 'Hello ' },
        { type: 'text', text: 'world' },
      ],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe('Hello world');
  });

  test('should handle empty content array', () => {
    const message: Anthropic.Message = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    };

    expect(extractText(message)).toBe('');
  });

  test('should filter out non-text blocks', () => {
    const message: Anthropic.Message = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5-20250929',
      content: [
        { type: 'text', text: 'Text content' },
        { type: 'tool_use', id: 'tool_1', name: 'test', input: {} } as any,
      ],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe('Text content');
  });
});
