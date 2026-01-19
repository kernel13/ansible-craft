---
phase: 06-quality-assurance
plan: 01
subsystem: validation
tags: [ansible-lint, sarif, subprocess, syntax-highlighting]

# Dependency graph
requires:
  - phase: 04-role-generation
    provides: yaml-validator, fqcn-checker, idempotency-checker
provides:
  - ansible-lint subprocess wrapper
  - SARIF output parsing
  - ansible-lint availability detection
  - cli-highlight for YAML preview
affects: [06-02, 06-03, 06-04]

# Tech tracking
tech-stack:
  added: [cli-highlight]
  patterns: [Bun.spawn for subprocess execution, SARIF parsing]

key-files:
  created:
    - src/generation/validation/ansible-lint.ts
  modified:
    - src/generation/validation/index.ts
    - package.json

key-decisions:
  - "Bun.spawn over child_process for subprocess calls"
  - "SARIF format for machine-readable lint output"
  - "Defensive JSON parsing with graceful fallbacks"

patterns-established:
  - "Subprocess pattern: spawn with piped stdout, await exited, parse response"
  - "Availability check: run --version, check exitCode === 0"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 06 Plan 01: Ansible-lint Infrastructure Summary

**Ansible-lint subprocess wrapper with SARIF parsing and cli-highlight dependency for YAML preview**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T21:31:48Z
- **Completed:** 2026-01-19T21:33:32Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created ansible-lint.ts with subprocess wrapper using Bun.spawn
- Implemented SARIF output parsing with defensive handling for missing fields
- Added isAnsibleLintAvailable() for detecting ansible-lint installation
- Added formatInstallInstructions() for helpful error messages
- Exported all functions and types from validation/index.ts
- Installed cli-highlight ^2.1.11 for future dry-run preview feature

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ansible-lint subprocess wrapper** - `e486697` (feat)
2. **Task 2: Export from validation index** - `ece41e4` (feat)
3. **Task 3: Add cli-highlight dependency** - `c5c9f12` (chore)

## Files Created/Modified
- `src/generation/validation/ansible-lint.ts` - Subprocess wrapper with SARIF parsing, availability detection, install instructions
- `src/generation/validation/index.ts` - Added re-export for ansible-lint module
- `package.json` - Added cli-highlight ^2.1.11 dependency

## Decisions Made
- Used Bun.spawn (not child_process) per research recommendations for consistency
- SARIF JSON format over text parsing for machine-readable, version-stable output
- Defensive parsing handles empty output, invalid JSON, and missing optional SARIF fields
- Level mapping: SARIF "error" maps to error, all others (warning, note, none) map to warning

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required. Note: Users need ansible-lint installed separately via `pip install ansible-lint` for full functionality.

## Next Phase Readiness
- Ansible-lint infrastructure ready for integration with generation workflow (Plan 02)
- cli-highlight ready for dry-run preview feature (Plan 03)
- All validation modules exportable from single index

---
*Phase: 06-quality-assurance*
*Completed: 2026-01-19*
