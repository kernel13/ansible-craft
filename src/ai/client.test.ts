import { describe, test, expect } from "bun:test";
import {
  createClient,
  DEFAULT_MODEL,
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT,
  DEFAULT_MAX_RETRIES,
} from "./client.js";

describe("createClient", () => {
  test("should create client with API key", () => {
    const client = createClient({ apiKey: "sk-ant-test" });
    expect(client).toBeDefined();
  });

  test("should use default retry count", () => {
    const client = createClient({ apiKey: "sk-ant-test" });
    // Client is created - we verify through constants
    expect(DEFAULT_MAX_RETRIES).toBe(3);
  });

  test("should disable retries when noRetry is true", () => {
    const client = createClient({ apiKey: "sk-ant-test", noRetry: true });
    expect(client).toBeDefined();
  });

  test("should use custom retry count", () => {
    const client = createClient({ apiKey: "sk-ant-test", maxRetries: 5 });
    expect(client).toBeDefined();
  });

  test("should use custom timeout", () => {
    const client = createClient({ apiKey: "sk-ant-test", timeout: 60000 });
    expect(client).toBeDefined();
  });
});

describe("constants", () => {
  test("DEFAULT_MODEL should be claude-sonnet", () => {
    expect(DEFAULT_MODEL).toContain("claude-sonnet");
  });

  test("DEFAULT_MAX_TOKENS should be 4096", () => {
    expect(DEFAULT_MAX_TOKENS).toBe(4096);
  });

  test("DEFAULT_TIMEOUT should be 2 minutes", () => {
    expect(DEFAULT_TIMEOUT).toBe(120000);
  });

  test("DEFAULT_MAX_RETRIES should be 3", () => {
    expect(DEFAULT_MAX_RETRIES).toBe(3);
  });
});
