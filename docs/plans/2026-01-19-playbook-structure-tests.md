# Playbook Structure Tests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive test coverage for `src/generation/playbook/structure.ts` mirroring the existing role structure tests.

**Architecture:** Create a single test file using bun:test that validates directory creation, dry-run mode, existence checking, and exported constants. Uses temp directories for isolation.

**Tech Stack:** Bun test runner, Node.js fs/promises, bun:test assertions

---

## Task 1: Create Test File with Imports and Setup

**Files:**
- Create: `src/generation/playbook/structure.test.ts`

**Step 1: Create test file with imports**

```typescript
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPlaybookStructure,
  playbookExists,
  PLAYBOOK_DIRECTORIES,
  REQUIRED_PLAYBOOK_FILES,
} from "./structure.js";
```

**Step 2: Run to verify imports work**

Run: `bun test src/generation/playbook/structure.test.ts`
Expected: 0 tests, no import errors

**Step 3: Commit**

```bash
git add src/generation/playbook/structure.test.ts
git commit -m "test(playbook): add structure test file with imports"
```

---

## Task 2: Directory Creation Tests

**Files:**
- Modify: `src/generation/playbook/structure.test.ts`

**Step 1: Write the failing tests for directory creation**

Add after imports:

```typescript
describe("createPlaybookStructure", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ansible-craft-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("directory creation", () => {
    test("should create playbook root directory", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      expect(result.playbookDir).toBe(join(tempDir, "test-playbook"));
      expect(result.createdDirs).toContain(result.playbookDir);
    });

    test("should create group_vars directory", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      const dirs = await readdir(result.playbookDir);
      expect(dirs).toContain("group_vars");
    });

    test("should report all created directories", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      // Root + group_vars = 2 directories
      expect(result.createdDirs.length).toBe(2);
    });
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/generation/playbook/structure.test.ts`
Expected: 3 tests PASS (implementation already exists)

**Step 3: Commit**

```bash
git add src/generation/playbook/structure.test.ts
git commit -m "test(playbook): add directory creation tests"
```

---

## Task 3: Dry Run Mode Tests

**Files:**
- Modify: `src/generation/playbook/structure.test.ts`

**Step 1: Write dry run tests**

Add inside the `createPlaybookStructure` describe block, after the directory creation describe block:

```typescript
  describe("dry run mode", () => {
    test("should not create directories in dry run", async () => {
      const result = await createPlaybookStructure({
        playbookName: "dry-run-playbook",
        outputDir: tempDir,
        dryRun: true,
      });

      const dirExists = await readdir(result.playbookDir).then(
        () => true,
        () => false
      );

      expect(dirExists).toBe(false);
    });

    test("should still report what would be created", async () => {
      const result = await createPlaybookStructure({
        playbookName: "dry-run-playbook",
        outputDir: tempDir,
        dryRun: true,
      });

      // Should report root + group_vars even though not created
      expect(result.createdDirs.length).toBe(2);
      expect(result.playbookDir).toBe(join(tempDir, "dry-run-playbook"));
    });
  });
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/generation/playbook/structure.test.ts`
Expected: 5 tests PASS

**Step 3: Commit**

```bash
git add src/generation/playbook/structure.test.ts
git commit -m "test(playbook): add dry run mode tests"
```

---

## Task 4: playbookExists Tests

**Files:**
- Modify: `src/generation/playbook/structure.test.ts`

**Step 1: Write playbookExists tests**

Add after the `createPlaybookStructure` describe block (outside it):

```typescript
describe("playbookExists", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ansible-craft-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  test("should return false for non-existent playbook", () => {
    expect(playbookExists(tempDir, "nonexistent")).toBe(false);
  });

  test("should return true for existing playbook", async () => {
    await createPlaybookStructure({
      playbookName: "existing-playbook",
      outputDir: tempDir,
    });

    expect(playbookExists(tempDir, "existing-playbook")).toBe(true);
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/generation/playbook/structure.test.ts`
Expected: 7 tests PASS

**Step 3: Commit**

```bash
git add src/generation/playbook/structure.test.ts
git commit -m "test(playbook): add playbookExists tests"
```

---

## Task 5: Constants Validation Tests

**Files:**
- Modify: `src/generation/playbook/structure.test.ts`

**Step 1: Write constants tests**

Add after the `playbookExists` describe block:

```typescript
describe("constants", () => {
  test("PLAYBOOK_DIRECTORIES should contain group_vars", () => {
    expect(PLAYBOOK_DIRECTORIES).toContain("group_vars");
  });

  test("REQUIRED_PLAYBOOK_FILES should contain essential playbook files", () => {
    expect(REQUIRED_PLAYBOOK_FILES).toContain("playbook.yml");
    expect(REQUIRED_PLAYBOOK_FILES).toContain("inventory.example");
    expect(REQUIRED_PLAYBOOK_FILES).toContain("group_vars/all.yml");
    expect(REQUIRED_PLAYBOOK_FILES).toContain("README.md");
  });
});
```

**Step 2: Run all tests to verify they pass**

Run: `bun test src/generation/playbook/structure.test.ts`
Expected: 9 tests PASS

**Step 3: Run full test suite to verify no regressions**

Run: `bun test`
Expected: All 160 tests PASS (151 existing + 9 new)

**Step 4: Commit**

```bash
git add src/generation/playbook/structure.test.ts
git commit -m "test(playbook): add constants validation tests"
```

---

## Task 6: Final Verification

**Step 1: Run full test suite with coverage**

Run: `bun test --coverage`
Expected: All tests pass, `src/generation/playbook/structure.ts` shows coverage

**Step 2: Run linter**

Run: `bun run lint`
Expected: No errors

**Step 3: Final commit if any formatting changes**

```bash
git add -A
git commit -m "chore: format playbook structure tests"
```

---

## Summary

| Task | Tests Added | Cumulative |
|------|-------------|------------|
| 1. Setup | 0 | 0 |
| 2. Directory creation | 3 | 3 |
| 3. Dry run mode | 2 | 5 |
| 4. playbookExists | 2 | 7 |
| 5. Constants | 2 | 9 |
| 6. Verification | 0 | 9 |

**Total: 9 new tests across 6 tasks**
