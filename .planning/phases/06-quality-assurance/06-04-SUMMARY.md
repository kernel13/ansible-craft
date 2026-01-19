---
phase: 06-quality-assurance
plan: 04
subsystem: validation
tags: [auto-fix, ansible-lint, fqcn, yaml]

# Dependency graph
requires:
  - phase: 06-01
    provides: ansible-lint integration with LintViolation type
provides:
  - Auto-fix module for common lint violations
  - canAutoFix function for detecting fixable rules
  - applyAutoFixes function for programmatic fixes
  - Suggestions for unfixable violations
affects: [06-05, role generation, playbook generation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Line-based string manipulation for YAML fixes"
    - "Descending line order for multi-fix offset handling"

key-files:
  created:
    - src/generation/validation/auto-fix.ts
  modified:
    - src/generation/validation/index.ts

key-decisions:
  - "FQCN_MAP duplicated from fqcn-checker.ts for import simplicity"
  - "Violations processed in descending line order to avoid offset drift"
  - "Suggestions provided via getSuggestion for unfixable rules"

patterns-established:
  - "FixAttemptResult interface for internal fix attempt tracking"
  - "Map-based content modification for efficient multi-file handling"

# Metrics
duration: 2min
completed: 2026-01-19
---

# Phase 06 Plan 04: Auto-fix System Summary

**Auto-fix module for programmatic FQCN, trailing whitespace, newline-at-end, and task name casing fixes with suggestions for unfixable violations**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-19T21:36:48Z
- **Completed:** 2026-01-19T21:38:43Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created auto-fix.ts module with complete fix infrastructure
- Implemented FQCN auto-fixing using BUILTIN_MODULES mapping
- Added formatting fixes for trailing whitespace and missing newlines
- Provided helpful suggestions for unfixable violations
- Exported all types and functions from validation index

## Task Commits

Each task was committed atomically:

1. **Task 1: Create auto-fix module** - `e3196f1` (feat)
2. **Task 2: Export from validation index** - `00562fb` (feat)

## Files Created/Modified

- `src/generation/validation/auto-fix.ts` - Auto-fix module with canAutoFix, applyAutoFixes, and fix implementations
- `src/generation/validation/index.ts` - Re-export for auto-fix module

## Decisions Made

- [06-04-01]: FQCN_MAP duplicated from fqcn-checker.ts - Avoids circular import complexity
- [06-04-02]: Process violations in descending line order - Prevents offset drift during multi-line fixes
- [06-04-03]: getSuggestion provides rule-specific examples - Helpful guidance for manual fixes

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Auto-fix system ready for integration with generation commands
- Can be used standalone or as part of validation pipeline
- Ready for 06-05 (quality improvement loop integration)

---
*Phase: 06-quality-assurance*
*Completed: 2026-01-19*
