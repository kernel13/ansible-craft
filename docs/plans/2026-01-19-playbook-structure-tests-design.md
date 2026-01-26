# Playbook Structure Tests Design

**Date:** 2026-01-19
**Status:** Approved
**Target:** `src/generation/playbook/structure.test.ts`

## Overview

Add test coverage for `src/generation/playbook/structure.ts` by mirroring the existing test patterns from `src/generation/role/structure.test.ts`.

## Rationale

- `role/structure.ts` has comprehensive tests (12 tests)
- `playbook/structure.ts` exports similar functions but has no tests
- Consistency in test patterns aids maintainability

## Source File Exports

```typescript
// From src/generation/playbook/structure.ts
export const PLAYBOOK_DIRECTORIES = ['group_vars'] as const;
export const REQUIRED_PLAYBOOK_FILES = [
  'playbook.yml',
  'inventory.example',
  'group_vars/all.yml',
  'README.md',
] as const;

export function createPlaybookStructure(options): Promise<PlaybookStructureResult>
export function playbookExists(outputDir, playbookName): boolean
```

## Test Structure

### 1. Setup Pattern

- Use `bun:test` for test framework
- Create temp directory in `beforeEach`
- Clean up in `afterEach`
- Import all exports from source file

### 2. Test Groups

#### createPlaybookStructure - Directory Creation (3 tests)

| Test | Assertion |
|------|-----------|
| should create playbook root directory | `result.playbookDir` equals expected path |
| should create group_vars directory | `readdir` contains "group_vars" |
| should report all created directories | `createdDirs.length` equals 2 |

#### createPlaybookStructure - Dry Run Mode (2 tests)

| Test | Assertion |
|------|-----------|
| should not create directories in dry run | `readdir` fails (dir doesn't exist) |
| should still report what would be created | `createdDirs.length` equals 2 |

#### playbookExists (2 tests)

| Test | Assertion |
|------|-----------|
| should return false for non-existent playbook | returns `false` |
| should return true for existing playbook | returns `true` after creation |

#### Constants (2 tests)

| Test | Assertion |
|------|-----------|
| PLAYBOOK_DIRECTORIES should contain group_vars | contains "group_vars" |
| REQUIRED_PLAYBOOK_FILES should contain essential files | contains all 4 required files |

## Summary

- **Total tests:** 9
- **Pattern:** Mirrors role/structure.test.ts
- **Difference:** No gitkeep tests (playbook structure doesn't create gitkeep files)

## Implementation

Create file: `src/generation/playbook/structure.test.ts`
