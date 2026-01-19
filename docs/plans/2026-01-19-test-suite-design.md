# Test Suite Design for ansible-craft

## Overview

Comprehensive test suite for the ansible-craft CLI using Bun's built-in test runner. Tests serve three purposes: catch regressions, provide comprehensive coverage, and document module behavior.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test runner | Bun built-in | Native to runtime, zero config, fast |
| AI testing | Mock Anthropic SDK | Deterministic, no API costs, can simulate errors |
| Priority | Bottom-up | Build solid foundations before complex mocking |
| Test location | Co-located | Easy to find, clear ownership |
| Shared utilities | `src/__test-utils__/` | Centralized mocks and fixtures |

## Directory Structure

```
src/
├── __test-utils__/
│   ├── mocks/
│   │   ├── anthropic.ts      # Mocked Anthropic SDK client
│   │   ├── file-system.ts    # Mocked fs operations
│   │   └── inquirer.ts       # Mocked interactive prompts
│   ├── fixtures/
│   │   ├── yaml/             # Sample YAML files (valid, invalid)
│   │   ├── roles/            # Sample role structures
│   │   └── config/           # Sample config files
│   └── index.ts              # Barrel export for test utilities
```

## Bun Test Configuration

Add to `package.json`:

```json
{
  "scripts": {
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

## Test File Naming

- Pattern: `*.test.ts` co-located with source
- Example: `src/validation/yaml-validator.test.ts`

## Testing Phases

### Phase 1: Pure Functions (No Mocking)

**Validation module** (`src/generation/validation/`):
- `yaml-validator.test.ts` - Valid/invalid YAML parsing
- `fqcn-checker.test.ts` - Fully qualified collection name detection
- `idempotency-checker.test.ts` - Idempotency pattern validation

**Role utilities** (`src/generation/role/`):
- `sanitize.test.ts` - Role name sanitization rules
- `parser.test.ts` - YAML/JSON parsing edge cases
- `structure.test.ts` - Directory structure creation

**Config utilities** (`src/config/`):
- `paths.test.ts` - Config file path resolution
- `defaults.test.ts` - Default value handling
- `schema.test.ts` - Config validation

### Phase 2: I/O & File Operations (Light Mocking)

- `config/loader.test.ts` - TOML file loading
- `config/writer.test.ts` - Config file writing
- `generation/writer.test.ts` - Role file writing with conflicts

### Phase 3: AI Integration (SDK Mocking)

- `ai/client.test.ts` - Client creation
- `ai/retry.test.ts` - Retry logic, backoff, error classification
- `ai/stream.test.ts` - Streaming response handling
- `ai/errors.test.ts` - Error transformation

### Phase 4: CLI Commands (Integration)

- `cli/commands/config.test.ts` - Config wizard flow
- `cli/commands/new.test.ts` - Role generation workflow

## Mock Implementations

### Anthropic SDK Mock

```typescript
// src/__test-utils__/mocks/anthropic.ts
import { mock } from "bun:test";

// Mock successful streaming response
export const createMockAnthropicClient = (options?: {
  responseText?: string;
  shouldFail?: boolean;
  errorType?: "rate_limit" | "auth" | "server";
}) => ({
  messages: {
    create: mock(async () => {
      if (options?.shouldFail) {
        throw createMockError(options.errorType);
      }
      return createMockStream(options?.responseText ?? "default response");
    }),
  },
});

// Mock stream with configurable content
export const createMockStream = (content: string) => ({
  async *[Symbol.asyncIterator]() {
    yield { type: "content_block_delta", delta: { text: content } };
    yield { type: "message_stop" };
  },
});

// Mock API errors for retry testing
export const createMockError = (type: string) => {
  const errors = {
    rate_limit: { status: 429, message: "Rate limited" },
    auth: { status: 401, message: "Invalid API key" },
    server: { status: 500, message: "Server error" },
  };
  return errors[type];
};
```

### File System Mock

```typescript
// src/__test-utils__/mocks/file-system.ts
export const createMockFs = (files: Record<string, string>) => ({
  readFile: mock((path) => files[path] ?? null),
  writeFile: mock(() => Promise.resolve()),
  exists: mock((path) => path in files),
  mkdir: mock(() => Promise.resolve()),
});
```

## Test Fixtures

### YAML Fixtures

**valid-task.yaml** - Standard Ansible task:
```yaml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
  become: true
```

**invalid-syntax.yaml** - Malformed YAML for error testing:
```yaml
- name: Bad task
  apt:
    name: nginx
    state: [unclosed
```

**non-idempotent.yaml** - Tasks missing idempotency:
```yaml
- name: Run script
  ansible.builtin.shell: ./setup.sh
```

**non-fqcn.yaml** - Tasks without fully qualified names:
```yaml
- name: Install package
  apt:
    name: nginx
```

### Config Fixtures

**valid-config.toml**:
```toml
[anthropic]
api_key = "sk-ant-test-key"
model = "claude-sonnet-4-20250514"

[defaults]
output_dir = "./roles"
```

**minimal-config.toml** - Only required fields:
```toml
[anthropic]
api_key = "sk-ant-test-key"
```

### Role Fixtures

- `complete-role/` - Full valid role structure
- `minimal-role/` - Just required files
- `invalid-role/` - Missing required components

## Example Test Cases

### Validation Tests

```typescript
// src/generation/validation/yaml-validator.test.ts
import { describe, test, expect } from "bun:test";
import { validateYaml } from "./yaml-validator";
import { loadFixture } from "../../__test-utils__";

describe("validateYaml", () => {
  describe("valid YAML", () => {
    test("should accept well-formed Ansible tasks", () => {
      const yaml = loadFixture("yaml/valid-task.yaml");
      const result = validateYaml(yaml);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("invalid YAML", () => {
    test("should reject malformed syntax with descriptive error", () => {
      const yaml = loadFixture("yaml/invalid-syntax.yaml");
      const result = validateYaml(yaml);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("line");
    });

    test("should handle empty input", () => {
      const result = validateYaml("");
      expect(result.valid).toBe(false);
    });
  });
});
```

### AI Retry Tests

```typescript
// src/ai/retry.test.ts
import { describe, test, expect } from "bun:test";
import { withRetry } from "./retry";
import { createMockAnthropicClient } from "../__test-utils__";

describe("withRetry", () => {
  test("should succeed on first attempt when no errors", async () => {
    const client = createMockAnthropicClient({ responseText: "success" });
    const result = await withRetry(() => client.messages.create({}));
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });

  test("should retry on rate limit with exponential backoff", async () => {
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 3) throw { status: 429 };
      return "success";
    };
    const result = await withRetry(operation, { maxRetries: 3 });
    expect(attempts).toBe(3);
  });

  test("should not retry on auth errors", async () => {
    const client = createMockAnthropicClient({
      shouldFail: true,
      errorType: "auth"
    });
    await expect(withRetry(() => client.messages.create({}))).rejects.toThrow();
    expect(client.messages.create).toHaveBeenCalledTimes(1);
  });
});
```

## Deliverables Summary

| Category | Files | Estimated Tests |
|----------|-------|-----------------|
| Test utilities & mocks | 4 files | - |
| Fixtures | ~10 files | - |
| Phase 1: Pure functions | 9 test files | ~45 tests |
| Phase 2: I/O operations | 3 test files | ~15 tests |
| Phase 3: AI integration | 4 test files | ~25 tests |
| Phase 4: CLI commands | 2 test files | ~15 tests |
| **Total** | **~32 files** | **~100 tests** |

## Implementation Order

1. Set up `src/__test-utils__/` with mocks and fixtures
2. Add test scripts to `package.json`
3. Phase 1 tests (validation, role utilities, config utilities)
4. Phase 2 tests (file I/O with light mocking)
5. Phase 3 tests (AI with SDK mocking)
6. Phase 4 tests (CLI integration)

## Success Criteria

- All tests pass with `bun test`
- Tests serve as documentation (clear naming, arrange-act-assert)
- Edge cases covered (empty input, malformed data, errors)
- Mocks enable deterministic, fast execution
