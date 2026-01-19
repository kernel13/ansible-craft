# Test Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement comprehensive test suite for ansible-craft CLI with ~100 tests across 4 phases.

**Architecture:** Bottom-up testing approach starting with pure functions (validation, utilities), then I/O operations with light mocking, AI integration with SDK mocking, and finally CLI command integration tests. All tests use Bun's built-in test runner with co-located test files.

**Tech Stack:** Bun test runner, TypeScript, mock functions via `bun:test`

---

## Task 0: Test Infrastructure Setup

### Task 0.1: Add Test Scripts to package.json

**Files:**
- Modify: `package.json:9-13`

**Step 1: Add test scripts**

Edit `package.json` scripts section to add:
```json
{
  "scripts": {
    "dev": "bun run src/cli/index.ts",
    "lint": "biome check .",
    "format": "biome format . --write",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage"
  }
}
```

**Step 2: Verify scripts work**

Run: `bun test`
Expected: "0 tests passed" (no tests yet)

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: add bun test scripts"
```

---

### Task 0.2: Create Test Utilities - Fixture Loader

**Files:**
- Create: `src/__test-utils__/fixtures.ts`

**Step 1: Write fixture loader**

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";

const FIXTURES_DIR = join(import.meta.dir, "fixtures");

/**
 * Load a fixture file as string.
 * @param relativePath - Path relative to fixtures directory (e.g., "yaml/valid-task.yaml")
 */
export function loadFixture(relativePath: string): string {
  const fullPath = join(FIXTURES_DIR, relativePath);
  return readFileSync(fullPath, "utf-8");
}

/**
 * Get the full path to a fixture file.
 */
export function getFixturePath(relativePath: string): string {
  return join(FIXTURES_DIR, relativePath);
}
```

**Step 2: Commit**

```bash
git add src/__test-utils__/fixtures.ts
git commit -m "test: add fixture loader utility"
```

---

### Task 0.3: Create YAML Fixtures

**Files:**
- Create: `src/__test-utils__/fixtures/yaml/valid-task.yaml`
- Create: `src/__test-utils__/fixtures/yaml/valid-tasks-fqcn.yaml`
- Create: `src/__test-utils__/fixtures/yaml/invalid-syntax.yaml`
- Create: `src/__test-utils__/fixtures/yaml/non-fqcn.yaml`
- Create: `src/__test-utils__/fixtures/yaml/non-idempotent-tasks.yaml`
- Create: `src/__test-utils__/fixtures/yaml/idempotent-tasks.yaml`

**Step 1: Create valid task fixture**

`src/__test-utils__/fixtures/yaml/valid-task.yaml`:
```yaml
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
  become: true
```

**Step 2: Create valid tasks with FQCN fixture**

`src/__test-utils__/fixtures/yaml/valid-tasks-fqcn.yaml`:
```yaml
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

- name: Start nginx service
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true

- name: Copy config file
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
```

**Step 3: Create invalid syntax fixture**

`src/__test-utils__/fixtures/yaml/invalid-syntax.yaml`:
```yaml
---
- name: Bad task
  apt:
    name: nginx
    state: [unclosed
```

**Step 4: Create non-FQCN fixture**

`src/__test-utils__/fixtures/yaml/non-fqcn.yaml`:
```yaml
---
- name: Install package
  apt:
    name: nginx
    state: present

- name: Start service
  service:
    name: nginx
    state: started
```

**Step 5: Create non-idempotent tasks fixture**

`src/__test-utils__/fixtures/yaml/non-idempotent-tasks.yaml`:
```yaml
---
- name: Run setup script
  ansible.builtin.shell: ./setup.sh

- name: Execute command
  ansible.builtin.command: echo "hello"

- name: Install package without state
  ansible.builtin.apt:
    name: nginx
```

**Step 6: Create idempotent tasks fixture**

`src/__test-utils__/fixtures/yaml/idempotent-tasks.yaml`:
```yaml
---
- name: Run setup script
  ansible.builtin.shell: ./setup.sh
  args:
    creates: /var/setup-done

- name: Execute command
  ansible.builtin.command: echo "hello"
  changed_when: false

- name: Install package
  ansible.builtin.apt:
    name: nginx
    state: present
```

**Step 7: Commit**

```bash
git add src/__test-utils__/fixtures/yaml/
git commit -m "test: add YAML fixtures for validation tests"
```

---

### Task 0.4: Create Config Fixtures

**Files:**
- Create: `src/__test-utils__/fixtures/config/valid-config.toml`
- Create: `src/__test-utils__/fixtures/config/minimal-config.toml`
- Create: `src/__test-utils__/fixtures/config/invalid-config.toml`

**Step 1: Create valid config fixture**

`src/__test-utils__/fixtures/config/valid-config.toml`:
```toml
[api]
key = "sk-ant-test-key-12345"

[defaults]
model = "sonnet"
complex = false

[output]
format = "plain"
verbose = false
dry_run = false
```

**Step 2: Create minimal config fixture**

`src/__test-utils__/fixtures/config/minimal-config.toml`:
```toml
[api]
key = "sk-ant-test-key-minimal"
```

**Step 3: Create invalid config fixture**

`src/__test-utils__/fixtures/config/invalid-config.toml`:
```toml
[api
key = "missing bracket"
```

**Step 4: Commit**

```bash
git add src/__test-utils__/fixtures/config/
git commit -m "test: add config fixtures"
```

---

### Task 0.5: Create Anthropic SDK Mock

**Files:**
- Create: `src/__test-utils__/mocks/anthropic.ts`

**Step 1: Write Anthropic mock**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/__test-utils__/mocks/anthropic.ts
git commit -m "test: add Anthropic SDK mock"
```

---

### Task 0.6: Create Barrel Export

**Files:**
- Create: `src/__test-utils__/index.ts`

**Step 1: Write barrel export**

```typescript
// Fixture utilities
export { loadFixture, getFixturePath } from "./fixtures.js";

// Mocks
export {
  createMockAnthropicClient,
  createMockApiError,
  createMockMessage,
  createMockStream,
  type MockClientOptions,
  type MockErrorType,
} from "./mocks/anthropic.js";
```

**Step 2: Verify setup works**

Run: `bun test`
Expected: "0 tests passed" (infrastructure ready, no tests yet)

**Step 3: Commit**

```bash
git add src/__test-utils__/index.ts
git commit -m "test: add barrel export for test utilities"
```

---

## Phase 1: Pure Function Tests (No Mocking)

### Task 1.1: YAML Validator Tests

**Files:**
- Create: `src/generation/validation/yaml-validator.test.ts`
- Test: `src/generation/validation/yaml-validator.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { validateYamlSyntax, type YamlValidationError } from "./yaml-validator.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("validateYamlSyntax", () => {
  describe("valid YAML", () => {
    test("should return null for valid YAML syntax", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/valid-task.yaml"),
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test("should return null for valid multi-task YAML", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/valid-tasks-fqcn.yaml"),
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });

  describe("invalid YAML", () => {
    test("should return error for malformed syntax", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/invalid-syntax.yaml"),
      };

      const result = validateYamlSyntax(file);
      expect(result).not.toBeNull();
      expect(result?.type).toBe("yaml-syntax");
      expect(result?.path).toBe("tasks/main.yml");
      expect(result?.message).toBeDefined();
    });

    test("should include line number in error when available", () => {
      const file: GeneratedFile = {
        path: "tasks/broken.yml",
        content: "key: [unclosed",
      };

      const result = validateYamlSyntax(file);
      expect(result).not.toBeNull();
      expect(result?.line).toBeDefined();
    });
  });

  describe("non-YAML files", () => {
    test("should skip non-YAML files and return null", () => {
      const file: GeneratedFile = {
        path: "README.md",
        content: "# This is markdown [with [brackets",
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test("should skip .j2 template files", () => {
      const file: GeneratedFile = {
        path: "templates/config.conf.j2",
        content: "{{ invalid_jinja",
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    test("should handle empty YAML file", () => {
      const file: GeneratedFile = {
        path: "tasks/empty.yml",
        content: "",
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull(); // Empty is valid YAML
    });

    test("should handle YAML with only comments", () => {
      const file: GeneratedFile = {
        path: "tasks/comments.yml",
        content: "# Just a comment\n# Another comment",
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test("should accept .yaml extension", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yaml",
        content: "key: value",
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/generation/validation/yaml-validator.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/validation/yaml-validator.test.ts
git commit -m "test: add yaml-validator tests"
```

---

### Task 1.2: FQCN Checker Tests

**Files:**
- Create: `src/generation/validation/fqcn-checker.test.ts`
- Test: `src/generation/validation/fqcn-checker.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { checkFqcnCompliance, type FqcnWarning } from "./fqcn-checker.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("checkFqcnCompliance", () => {
  describe("FQCN-compliant files", () => {
    test("should return empty array for files using FQCN", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/valid-tasks-fqcn.yaml"),
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });

    test("should return empty array for community modules", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Use community module
  community.general.docker_container:
    name: mycontainer
    state: started`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("non-FQCN modules", () => {
    test("should detect short module names", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/non-fqcn.yaml"),
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe("fqcn");
    });

    test("should provide correct suggestion for apt", () => {
      const file: GeneratedFile = {
        path: "tasks/install.yml",
        content: `---
- name: Install nginx
  apt:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].module).toBe("apt");
      expect(warnings[0].suggestion).toBe("ansible.builtin.apt");
      expect(warnings[0].line).toBe(3);
    });

    test("should detect multiple non-FQCN modules", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Install
  apt:
    name: nginx
- name: Start
  service:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBe(2);
      expect(warnings[0].module).toBe("apt");
      expect(warnings[1].module).toBe("service");
    });
  });

  describe("non-YAML files", () => {
    test("should skip non-YAML files", () => {
      const file: GeneratedFile = {
        path: "README.md",
        content: "apt: this is just text",
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    test("should not flag apt in comments", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
# Use apt: to install packages
- name: Install nginx
  ansible.builtin.apt:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });

    test("should handle empty file", () => {
      const file: GeneratedFile = {
        path: "tasks/empty.yml",
        content: "",
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/validation/fqcn-checker.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/validation/fqcn-checker.test.ts
git commit -m "test: add fqcn-checker tests"
```

---

### Task 1.3: Idempotency Checker Tests

**Files:**
- Create: `src/generation/validation/idempotency-checker.test.ts`
- Test: `src/generation/validation/idempotency-checker.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { checkIdempotencyPatterns, type IdempotencyWarning } from "./idempotency-checker.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("checkIdempotencyPatterns", () => {
  describe("idempotent tasks", () => {
    test("should return empty array for properly idempotent tasks", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/idempotent-tasks.yaml"),
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should accept shell with creates argument", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Run setup
  ansible.builtin.shell: ./setup.sh
  args:
    creates: /var/setup-done`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should accept command with changed_when", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Check version
  ansible.builtin.command: cat /etc/version
  changed_when: false`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("non-idempotent tasks", () => {
    test("should detect shell without creates/removes/changed_when", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Run script
  ansible.builtin.shell: ./setup.sh`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].type).toBe("idempotency");
      expect(warnings[0].module).toBe("ansible.builtin.shell");
    });

    test("should detect apt without state parameter", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].issue).toContain("without state");
    });

    test("should detect multiple idempotency issues", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/non-idempotent-tasks.yaml"),
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBeGreaterThan(1);
    });
  });

  describe("file filtering", () => {
    test("should only check files in tasks/ directory", () => {
      const file: GeneratedFile = {
        path: "defaults/main.yml",
        content: `---
nginx_package: nginx`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should skip non-YAML files", () => {
      const file: GeneratedFile = {
        path: "tasks/README.md",
        content: "shell: run this",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    test("should handle invalid YAML gracefully", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: "invalid: [yaml",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should handle empty tasks file", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: "---",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/validation/idempotency-checker.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/validation/idempotency-checker.test.ts
git commit -m "test: add idempotency-checker tests"
```

---

### Task 1.4: Role Name Sanitization Tests

**Files:**
- Create: `src/generation/role/sanitize.test.ts`
- Test: `src/generation/role/sanitize.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { sanitizeRoleName, inferRoleName, validateRoleName } from "./sanitize.js";

describe("sanitizeRoleName", () => {
  describe("basic sanitization", () => {
    test("should lowercase input", () => {
      expect(sanitizeRoleName("MyRole")).toBe("myrole");
    });

    test("should replace spaces with hyphens", () => {
      expect(sanitizeRoleName("my role")).toBe("my-role");
    });

    test("should replace underscores with hyphens", () => {
      expect(sanitizeRoleName("my_role")).toBe("my-role");
    });

    test("should remove special characters", () => {
      expect(sanitizeRoleName("my@role!")).toBe("myrole");
    });

    test("should collapse multiple hyphens", () => {
      expect(sanitizeRoleName("my--role")).toBe("my-role");
    });

    test("should remove leading/trailing hyphens", () => {
      expect(sanitizeRoleName("-my-role-")).toBe("my-role");
    });
  });

  describe("length limits", () => {
    test("should truncate to 50 characters", () => {
      const longName = "a".repeat(60);
      const result = sanitizeRoleName(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test("should not leave trailing hyphen after truncation", () => {
      const name = "a".repeat(49) + "-b";
      const result = sanitizeRoleName(name);
      expect(result.endsWith("-")).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle empty string", () => {
      expect(sanitizeRoleName("")).toBe("");
    });

    test("should handle string with only special chars", () => {
      expect(sanitizeRoleName("@#$%")).toBe("");
    });
  });
});

describe("inferRoleName", () => {
  describe("action word stripping", () => {
    test("should strip 'install' prefix", () => {
      expect(inferRoleName("install nginx")).toBe("nginx");
    });

    test("should strip 'configure' prefix", () => {
      expect(inferRoleName("configure apache")).toBe("apache");
    });

    test("should strip 'setup' prefix", () => {
      expect(inferRoleName("setup docker")).toBe("docker");
    });

    test("should strip 'set up' prefix", () => {
      expect(inferRoleName("set up kubernetes")).toBe("kubernetes");
    });
  });

  describe("filler word removal", () => {
    test("should remove articles", () => {
      expect(inferRoleName("install a nginx server")).toBe("nginx-server");
    });

    test("should remove prepositions", () => {
      expect(inferRoleName("nginx with ssl")).toBe("nginx-ssl");
    });
  });

  describe("word limiting", () => {
    test("should take first 3 meaningful words", () => {
      const result = inferRoleName("nginx server with ssl and monitoring");
      const words = result.split("-");
      expect(words.length).toBeLessThanOrEqual(3);
    });
  });

  describe("edge cases", () => {
    test("should return 'role' for empty description", () => {
      expect(inferRoleName("")).toBe("role");
    });

    test("should return 'role' for only filler words", () => {
      expect(inferRoleName("a the an")).toBe("role");
    });
  });
});

describe("validateRoleName", () => {
  describe("valid names", () => {
    test("should accept simple lowercase name", () => {
      expect(validateRoleName("nginx")).toBeUndefined();
    });

    test("should accept name with hyphens", () => {
      expect(validateRoleName("my-nginx-role")).toBeUndefined();
    });

    test("should accept name with numbers", () => {
      expect(validateRoleName("nginx2")).toBeUndefined();
    });

    test("should accept single character name", () => {
      expect(validateRoleName("a")).toBeUndefined();
    });
  });

  describe("invalid names", () => {
    test("should reject empty name", () => {
      expect(validateRoleName("")).toBeDefined();
    });

    test("should reject name starting with number", () => {
      expect(validateRoleName("2nginx")).toBeDefined();
    });

    test("should reject name starting with hyphen", () => {
      expect(validateRoleName("-nginx")).toBeDefined();
    });

    test("should reject name ending with hyphen", () => {
      expect(validateRoleName("nginx-")).toBeDefined();
    });

    test("should reject name with consecutive hyphens", () => {
      expect(validateRoleName("my--role")).toBeDefined();
    });

    test("should reject name over 50 characters", () => {
      expect(validateRoleName("a".repeat(51))).toBeDefined();
    });

    test("should reject uppercase letters", () => {
      expect(validateRoleName("MyRole")).toBeDefined();
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/role/sanitize.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/role/sanitize.test.ts
git commit -m "test: add role name sanitization tests"
```

---

### Task 1.5: Parser Tests

**Files:**
- Create: `src/generation/role/parser.test.ts`
- Test: `src/generation/role/parser.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import {
  parseGeneratedFiles,
  hasFileMarkers,
  countFiles,
  type GeneratedFile,
} from "./parser.js";

describe("parseGeneratedFiles", () => {
  describe("valid output parsing", () => {
    test("should parse single file block", () => {
      const output = `
=== PATH: tasks/main.yml ===
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].path).toBe("tasks/main.yml");
      expect(files[0].content).toContain("Install nginx");
    });

    test("should parse multiple file blocks", () => {
      const output = `
=== PATH: tasks/main.yml ===
- name: Task 1
=== END ===

=== PATH: defaults/main.yml ===
nginx_port: 80
=== END ===

=== PATH: handlers/main.yml ===
- name: Restart nginx
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(3);
      expect(files.map(f => f.path)).toEqual([
        "tasks/main.yml",
        "defaults/main.yml",
        "handlers/main.yml",
      ]);
    });

    test("should trim whitespace from content", () => {
      const output = `
=== PATH: tasks/main.yml ===

  content here

=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files[0].content).toBe("content here");
    });
  });

  describe("security filtering", () => {
    test("should skip paths with directory traversal", () => {
      const output = `
=== PATH: ../../../etc/passwd ===
malicious content
=== END ===

=== PATH: tasks/main.yml ===
safe content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].path).toBe("tasks/main.yml");
    });

    test("should skip absolute paths", () => {
      const output = `
=== PATH: /etc/passwd ===
malicious content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(0);
    });

    test("should skip empty paths", () => {
      const output = `
=== PATH:  ===
content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("should return empty array for no markers", () => {
      const output = "Just some text without markers";
      const files = parseGeneratedFiles(output);
      expect(files).toEqual([]);
    });

    test("should return empty array for empty string", () => {
      const files = parseGeneratedFiles("");
      expect(files).toEqual([]);
    });

    test("should handle nested content with special chars", () => {
      const output = `
=== PATH: templates/config.yml.j2 ===
{{ nginx_port }}
{% if ssl_enabled %}
ssl: true
{% endif %}
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].content).toContain("{{ nginx_port }}");
    });
  });
});

describe("hasFileMarkers", () => {
  test("should return true for output with markers", () => {
    expect(hasFileMarkers("=== PATH: tasks/main.yml ===")).toBe(true);
  });

  test("should return false for output without markers", () => {
    expect(hasFileMarkers("Just regular text")).toBe(false);
  });

  test("should return false for empty string", () => {
    expect(hasFileMarkers("")).toBe(false);
  });
});

describe("countFiles", () => {
  test("should count file markers correctly", () => {
    const output = `
=== PATH: file1.yml ===
content
=== END ===
=== PATH: file2.yml ===
content
=== END ===
=== PATH: file3.yml ===
content
=== END ===
`;

    expect(countFiles(output)).toBe(3);
  });

  test("should return 0 for no markers", () => {
    expect(countFiles("no markers here")).toBe(0);
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/role/parser.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/role/parser.test.ts
git commit -m "test: add parser tests"
```

---

### Task 1.6: Config Paths Tests

**Files:**
- Create: `src/config/paths.test.ts`
- Test: `src/config/paths.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { getConfigDir, getConfigPath, CONFIG_DIR, CONFIG_PATH } from "./paths.js";

describe("getConfigDir", () => {
  test("should return path under home directory", () => {
    const result = getConfigDir();
    expect(result).toBe(join(homedir(), ".ansible-craft"));
  });

  test("should return consistent results", () => {
    expect(getConfigDir()).toBe(getConfigDir());
  });
});

describe("getConfigPath", () => {
  test("should return config.toml path under config dir", () => {
    const result = getConfigPath();
    expect(result).toBe(join(homedir(), ".ansible-craft", "config.toml"));
  });

  test("should be child of config dir", () => {
    expect(getConfigPath().startsWith(getConfigDir())).toBe(true);
  });
});

describe("exported constants", () => {
  test("CONFIG_DIR should match getConfigDir()", () => {
    expect(CONFIG_DIR).toBe(getConfigDir());
  });

  test("CONFIG_PATH should match getConfigPath()", () => {
    expect(CONFIG_PATH).toBe(getConfigPath());
  });
});
```

**Step 2: Run tests**

Run: `bun test src/config/paths.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/config/paths.test.ts
git commit -m "test: add config paths tests"
```

---

### Task 1.7: Config Defaults Tests

**Files:**
- Create: `src/config/defaults.test.ts`
- Test: `src/config/defaults.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { Config } from "./schema.js";

describe("DEFAULT_CONFIG", () => {
  test("should have undefined api key", () => {
    expect(DEFAULT_CONFIG.api.key).toBeUndefined();
  });

  test("should have sonnet as default model", () => {
    expect(DEFAULT_CONFIG.defaults.model).toBe("sonnet");
  });

  test("should have complex mode disabled", () => {
    expect(DEFAULT_CONFIG.defaults.complex).toBe(false);
  });

  test("should have plain output format", () => {
    expect(DEFAULT_CONFIG.output.format).toBe("plain");
  });

  test("should have verbose disabled", () => {
    expect(DEFAULT_CONFIG.output.verbose).toBe(false);
  });

  test("should have dry_run disabled", () => {
    expect(DEFAULT_CONFIG.output.dry_run).toBe(false);
  });

  test("should be a complete Config object", () => {
    const config: Config = DEFAULT_CONFIG;
    expect(config).toBeDefined();
    expect(config.api).toBeDefined();
    expect(config.defaults).toBeDefined();
    expect(config.output).toBeDefined();
  });
});
```

**Step 2: Run tests**

Run: `bun test src/config/defaults.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/config/defaults.test.ts
git commit -m "test: add config defaults tests"
```

---

### Task 1.8: Validation Index Tests

**Files:**
- Create: `src/generation/validation/index.test.ts`
- Test: `src/generation/validation/index.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import {
  validateGeneratedFiles,
  type ValidationReport,
} from "./index.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("validateGeneratedFiles", () => {
  describe("valid files", () => {
    test("should return valid report for compliant files", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/valid-tasks-fqcn.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    test("should allow warnings on valid files", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/non-fqcn.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true); // Warnings don't invalidate
      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("invalid files", () => {
    test("should return invalid report for syntax errors", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/invalid-syntax.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    test("should skip further checks on files with syntax errors", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: "invalid: [yaml",
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      // Should not have FQCN/idempotency warnings since YAML is invalid
      expect(report.warnings.filter(w => w.type === "fqcn")).toHaveLength(0);
    });
  });

  describe("multiple files", () => {
    test("should validate all files in array", () => {
      const files: GeneratedFile[] = [
        { path: "tasks/main.yml", content: "---\n- name: Task" },
        { path: "defaults/main.yml", content: "nginx_port: 80" },
        { path: "handlers/main.yml", content: "---\n- name: Handler" },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true);
    });

    test("should collect errors from multiple files", () => {
      const files: GeneratedFile[] = [
        { path: "tasks/main.yml", content: "invalid: [yaml" },
        { path: "handlers/main.yml", content: "also: [broken" },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBe(2);
    });
  });

  describe("empty input", () => {
    test("should handle empty file array", () => {
      const report = validateGeneratedFiles([]);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/validation/index.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/validation/index.test.ts
git commit -m "test: add validation index tests"
```

---

## Phase 2: I/O Operations Tests (Light Mocking)

### Task 2.1: Config Writer Tests

**Files:**
- Create: `src/config/writer.test.ts`
- Test: `src/config/writer.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { generateConfigToml } from "./writer.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { Config } from "./schema.js";

describe("generateConfigToml", () => {
  describe("with API key", () => {
    test("should include API key in output", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        api: { key: "sk-ant-test-key" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('key = "sk-ant-test-key"');
    });
  });

  describe("without API key", () => {
    test("should have commented key placeholder", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        api: { key: undefined },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('# key = "sk-ant-');
    });
  });

  describe("defaults section", () => {
    test("should include model setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        defaults: { ...DEFAULT_CONFIG.defaults, model: "opus" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('model = "opus"');
    });

    test("should include complex setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        defaults: { ...DEFAULT_CONFIG.defaults, complex: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("complex = true");
    });
  });

  describe("output section", () => {
    test("should include format setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, format: "json" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('format = "json"');
    });

    test("should include verbose setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, verbose: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("verbose = true");
    });

    test("should include dry_run setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, dry_run: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("dry_run = true");
    });
  });

  describe("comments", () => {
    test("should include header comment", () => {
      const toml = generateConfigToml(DEFAULT_CONFIG);
      expect(toml).toContain("# ansible-craft configuration");
    });

    test("should include section comments", () => {
      const toml = generateConfigToml(DEFAULT_CONFIG);
      expect(toml).toContain("[api]");
      expect(toml).toContain("[defaults]");
      expect(toml).toContain("[output]");
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/config/writer.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/config/writer.test.ts
git commit -m "test: add config writer tests"
```

---

### Task 2.2: Role Structure Tests

**Files:**
- Create: `src/generation/role/structure.test.ts`
- Test: `src/generation/role/structure.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createRoleStructure,
  roleExists,
  ROLE_DIRECTORIES,
  REQUIRED_FILES,
} from "./structure.js";

describe("createRoleStructure", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ansible-craft-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("directory creation", () => {
    test("should create role root directory", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      expect(result.roleDir).toBe(join(tempDir, "test-role"));
      expect(result.createdDirs).toContain(result.roleDir);
    });

    test("should create all standard role directories", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      const dirs = await readdir(result.roleDir);
      expect(dirs).toContain("tasks");
      expect(dirs).toContain("handlers");
      expect(dirs).toContain("defaults");
      expect(dirs).toContain("vars");
      expect(dirs).toContain("templates");
      expect(dirs).toContain("files");
      expect(dirs).toContain("meta");
      expect(dirs).toContain("molecule");
    });

    test("should create molecule/default subdirectory", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      const moleculeDir = join(result.roleDir, "molecule");
      const moleculeContents = await readdir(moleculeDir);
      expect(moleculeContents).toContain("default");
    });
  });

  describe("gitkeep files", () => {
    test("should create .gitkeep in templates directory", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      const templatesDir = join(result.roleDir, "templates");
      const contents = await readdir(templatesDir);
      expect(contents).toContain(".gitkeep");
    });

    test("should create .gitkeep in files directory", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      const filesDir = join(result.roleDir, "files");
      const contents = await readdir(filesDir);
      expect(contents).toContain(".gitkeep");
    });

    test("should report created gitkeep files", async () => {
      const result = await createRoleStructure({
        roleName: "test-role",
        outputDir: tempDir,
      });

      expect(result.createdGitkeeps.length).toBe(2);
    });
  });

  describe("dry run mode", () => {
    test("should not create directories in dry run", async () => {
      const result = await createRoleStructure({
        roleName: "dry-run-role",
        outputDir: tempDir,
        dryRun: true,
      });

      const exists = await readdir(tempDir).then(
        () => true,
        () => false
      );
      const roleExists = await readdir(result.roleDir).then(
        () => true,
        () => false
      );

      expect(roleExists).toBe(false);
    });

    test("should still report what would be created", async () => {
      const result = await createRoleStructure({
        roleName: "dry-run-role",
        outputDir: tempDir,
        dryRun: true,
      });

      expect(result.createdDirs.length).toBeGreaterThan(0);
      expect(result.createdGitkeeps.length).toBe(2);
    });
  });
});

describe("roleExists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ansible-craft-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("should return false for non-existent role", () => {
    expect(roleExists(tempDir, "nonexistent")).toBe(false);
  });

  test("should return true for existing role", async () => {
    await createRoleStructure({
      roleName: "existing-role",
      outputDir: tempDir,
    });

    expect(roleExists(tempDir, "existing-role")).toBe(true);
  });
});

describe("constants", () => {
  test("ROLE_DIRECTORIES should contain standard Ansible directories", () => {
    expect(ROLE_DIRECTORIES).toContain("tasks");
    expect(ROLE_DIRECTORIES).toContain("handlers");
    expect(ROLE_DIRECTORIES).toContain("defaults");
    expect(ROLE_DIRECTORIES).toContain("meta");
  });

  test("REQUIRED_FILES should contain essential role files", () => {
    expect(REQUIRED_FILES).toContain("tasks/main.yml");
    expect(REQUIRED_FILES).toContain("defaults/main.yml");
    expect(REQUIRED_FILES).toContain("meta/main.yml");
    expect(REQUIRED_FILES).toContain("README.md");
  });
});
```

**Step 2: Run tests**

Run: `bun test src/generation/role/structure.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/generation/role/structure.test.ts
git commit -m "test: add role structure tests"
```

---

## Phase 3: AI Integration Tests (SDK Mocking)

### Task 3.1: AI Client Tests

**Files:**
- Create: `src/ai/client.test.ts`
- Test: `src/ai/client.ts`

**Step 1: Write the tests**

```typescript
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
```

**Step 2: Run tests**

Run: `bun test src/ai/client.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ai/client.test.ts
git commit -m "test: add AI client tests"
```

---

### Task 3.2: Retry Logic Tests

**Files:**
- Create: `src/ai/retry.test.ts`
- Test: `src/ai/retry.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect, mock } from "bun:test";
import { parseRetryAfter } from "./retry.js";

describe("parseRetryAfter", () => {
  describe("seconds format", () => {
    test("should parse integer seconds", () => {
      expect(parseRetryAfter("30")).toBe(30);
    });

    test("should parse single digit", () => {
      expect(parseRetryAfter("5")).toBe(5);
    });

    test("should return undefined for zero", () => {
      expect(parseRetryAfter("0")).toBeUndefined();
    });

    test("should return undefined for negative", () => {
      expect(parseRetryAfter("-5")).toBeUndefined();
    });
  });

  describe("null/undefined input", () => {
    test("should return undefined for null", () => {
      expect(parseRetryAfter(null)).toBeUndefined();
    });

    test("should return undefined for undefined", () => {
      expect(parseRetryAfter(undefined)).toBeUndefined();
    });

    test("should return undefined for empty string", () => {
      expect(parseRetryAfter("")).toBeUndefined();
    });
  });

  describe("HTTP date format", () => {
    test("should parse future HTTP date", () => {
      // Create a date 60 seconds in the future
      const futureDate = new Date(Date.now() + 60000).toUTCString();
      const result = parseRetryAfter(futureDate);
      expect(result).toBeGreaterThan(50);
      expect(result).toBeLessThanOrEqual(60);
    });

    test("should return undefined for past HTTP date", () => {
      const pastDate = new Date(Date.now() - 60000).toUTCString();
      expect(parseRetryAfter(pastDate)).toBeUndefined();
    });
  });

  describe("invalid input", () => {
    test("should return undefined for non-numeric string", () => {
      expect(parseRetryAfter("abc")).toBeUndefined();
    });

    test("should return undefined for float string", () => {
      // parseInt handles this, but verify behavior
      expect(parseRetryAfter("30.5")).toBe(30);
    });
  });
});
```

**Step 2: Run tests**

Run: `bun test src/ai/retry.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ai/retry.test.ts
git commit -m "test: add retry logic tests"
```

---

### Task 3.3: AI Errors Tests

**Files:**
- Create: `src/ai/errors.test.ts`
- Test: `src/ai/errors.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
import { transformApiError, getErrorDetails } from "./errors.js";
import { CLIError } from "../errors/cli-error.js";

// Helper to create mock API errors
function createMockApiError(status: number, message: string): Anthropic.APIError {
  const error = new Error(message) as Anthropic.APIError;
  (error as any).status = status;
  (error as any).headers = { "request-id": "req_test_123" };
  (error as any).error = { type: "api_error" };
  return error;
}

describe("transformApiError", () => {
  describe("API errors", () => {
    test("should transform 401 to auth error", () => {
      const apiError = createMockApiError(401, "Invalid API key");
      const result = transformApiError(apiError);

      expect(result).toBeInstanceOf(CLIError);
      expect(result.code).toBe("API_401");
      expect(result.message).toContain("Authentication failed");
    });

    test("should transform 403 to permission error", () => {
      const apiError = createMockApiError(403, "Forbidden");
      const result = transformApiError(apiError);

      expect(result.code).toBe("API_403");
      expect(result.message).toContain("Permission denied");
    });

    test("should transform 429 to rate limit error", () => {
      const apiError = createMockApiError(429, "Rate limited");
      const result = transformApiError(apiError);

      expect(result.code).toBe("API_429");
      expect(result.message).toContain("Rate limit");
    });

    test("should transform 500 to internal error", () => {
      const apiError = createMockApiError(500, "Internal error");
      const result = transformApiError(apiError);

      expect(result.code).toBe("API_500");
      expect(result.message).toContain("internal error");
    });

    test("should transform 529 to overloaded error", () => {
      const apiError = createMockApiError(529, "Overloaded");
      const result = transformApiError(apiError);

      expect(result.code).toBe("API_529");
      expect(result.message).toContain("overloaded");
    });
  });

  describe("network errors", () => {
    test("should transform fetch errors", () => {
      const error = new Error("fetch failed");
      const result = transformApiError(error);

      expect(result.code).toBe("NETWORK_ERROR");
    });

    test("should transform network errors", () => {
      const error = new Error("network error");
      const result = transformApiError(error);

      expect(result.code).toBe("NETWORK_ERROR");
    });

    test("should transform timeout errors", () => {
      const error = new Error("Request timeout");
      const result = transformApiError(error);

      expect(result.code).toBe("TIMEOUT");
    });
  });

  describe("unknown errors", () => {
    test("should handle non-Error objects", () => {
      const result = transformApiError("string error");
      expect(result.code).toBe("UNKNOWN");
    });

    test("should handle generic errors", () => {
      const error = new Error("Something went wrong");
      const result = transformApiError(error);

      expect(result.code).toBe("UNKNOWN");
      expect(result.message).toBe("Something went wrong");
    });
  });

  describe("suggestions", () => {
    test("should include suggestion for auth errors", () => {
      const apiError = createMockApiError(401, "Invalid key");
      const result = transformApiError(apiError);

      expect(result.suggestion).toBeDefined();
      expect(result.suggestion).toContain("ansible-craft config");
    });

    test("should include suggestion for rate limit", () => {
      const apiError = createMockApiError(429, "Rate limited");
      const result = transformApiError(apiError);

      expect(result.suggestion).toContain("Wait");
    });
  });
});

describe("getErrorDetails", () => {
  test("should extract status code", () => {
    const error = createMockApiError(401, "Unauthorized");
    const details = getErrorDetails(error);

    expect(details.status).toBe(401);
  });

  test("should extract message", () => {
    const error = createMockApiError(500, "Server error");
    const details = getErrorDetails(error);

    expect(details.message).toBe("Server error");
  });

  test("should extract request ID when present", () => {
    const error = createMockApiError(500, "Error");
    const details = getErrorDetails(error);

    expect(details.requestId).toBe("req_test_123");
  });
});
```

**Step 2: Run tests**

Run: `bun test src/ai/errors.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ai/errors.test.ts
git commit -m "test: add AI errors tests"
```

---

### Task 3.4: Stream Utility Tests

**Files:**
- Create: `src/ai/stream.test.ts`
- Test: `src/ai/stream.ts`

**Step 1: Write the tests**

```typescript
import { describe, test, expect } from "bun:test";
import { extractText } from "./stream.js";
import type Anthropic from "@anthropic-ai/sdk";

describe("extractText", () => {
  test("should extract text from single text block", () => {
    const message: Anthropic.Message = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5-20250929",
      content: [{ type: "text", text: "Hello world" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe("Hello world");
  });

  test("should concatenate multiple text blocks", () => {
    const message: Anthropic.Message = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5-20250929",
      content: [
        { type: "text", text: "Hello " },
        { type: "text", text: "world" },
      ],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe("Hello world");
  });

  test("should handle empty content array", () => {
    const message: Anthropic.Message = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5-20250929",
      content: [],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 0 },
    };

    expect(extractText(message)).toBe("");
  });

  test("should filter out non-text blocks", () => {
    const message: Anthropic.Message = {
      id: "msg_123",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-4-5-20250929",
      content: [
        { type: "text", text: "Text content" },
        { type: "tool_use", id: "tool_1", name: "test", input: {} } as any,
      ],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    expect(extractText(message)).toBe("Text content");
  });
});
```

**Step 2: Run tests**

Run: `bun test src/ai/stream.test.ts`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/ai/stream.test.ts
git commit -m "test: add stream utility tests"
```

---

## Phase 4: Run All Tests

### Task 4.1: Run Full Test Suite

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass

**Step 2: Run tests with coverage**

Run: `bun test --coverage`
Expected: Coverage report generated

**Step 3: Final commit**

```bash
git add -A
git commit -m "test: complete Phase 1-3 test implementation

- Phase 1: Pure function tests (validation, sanitization, parsing)
- Phase 2: I/O tests (config writer, role structure)
- Phase 3: AI integration tests (client, retry, errors, stream)

Total: ~60 tests covering core functionality"
```

---

## Summary

| Phase | Test Files | Estimated Tests |
|-------|------------|-----------------|
| Setup | 6 files (utilities, fixtures, mocks) | - |
| Phase 1 | 8 test files | ~45 tests |
| Phase 2 | 2 test files | ~15 tests |
| Phase 3 | 4 test files | ~20 tests |
| **Total** | **20 files** | **~80 tests** |

Phase 4 (CLI command tests) is deferred - those require more complex integration testing with mocked inquirer prompts and would add another ~20 tests.
