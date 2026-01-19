import { mock } from "bun:test";
import type Anthropic from "@anthropic-ai/sdk";

export type MockErrorType = "rate_limit" | "auth" | "server" | "overloaded";

export interface MockClientOptions {
  responseText?: string;
  shouldFail?: boolean;
  errorType?: MockErrorType;
  stopReason?: Anthropic.Message["stop_reason"];
}

/**
 * Create a mock Anthropic API error.
 */
export function createMockApiError(
  type: MockErrorType
): Anthropic.APIError {
  const errorConfigs: Record<MockErrorType, { status: number; message: string }> = {
    rate_limit: { status: 429, message: "Rate limited" },
    auth: { status: 401, message: "Invalid API key" },
    server: { status: 500, message: "Internal server error" },
    overloaded: { status: 529, message: "API overloaded" },
  };

  const config = errorConfigs[type];
  const error = new Error(config.message) as Anthropic.APIError;
  (error as any).status = config.status;
  (error as any).headers = type === "rate_limit" ? { "retry-after": "5" } : {};
  return error;
}

/**
 * Create a mock Anthropic message response.
 */
export function createMockMessage(
  text: string,
  stopReason: Anthropic.Message["stop_reason"] = "end_turn"
): Anthropic.Message {
  return {
    id: "msg_mock_123",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-4-5-20250929",
    content: [{ type: "text", text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

/**
 * Create a mock async iterator for streaming responses.
 */
export function createMockStream(content: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      };
      yield {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: content },
      };
      yield { type: "content_block_stop", index: 0 };
      yield { type: "message_stop" };
    },
    on: mock((event: string, callback: (data: any) => void) => {
      if (event === "text") {
        callback(content);
      }
    }),
    finalMessage: mock(async () => createMockMessage(content)),
  };
}

/**
 * Create a mock Anthropic client for testing.
 */
export function createMockAnthropicClient(options: MockClientOptions = {}) {
  const { responseText = "Mock response", shouldFail = false, errorType } = options;

  const mockCreate = mock(async () => {
    if (shouldFail && errorType) {
      throw createMockApiError(errorType);
    }
    return createMockMessage(responseText, options.stopReason);
  });

  const mockStream = mock(() => {
    if (shouldFail && errorType) {
      throw createMockApiError(errorType);
    }
    return createMockStream(responseText);
  });

  return {
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
  };
}
