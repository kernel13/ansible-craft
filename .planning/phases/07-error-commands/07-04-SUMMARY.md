---
phase: 07-error-commands
plan: 04
subsystem: error-handling
tags: [anthropic, claude, yaml, ansible, error-analysis, fix-automation]

# Dependency graph
requires:
  - phase: 07-01
    provides: Context extraction from playbooks/roles
  - phase: 07-02
    provides: Fix prompts and system instructions
  - phase: 07-03
    provides: Explain command patterns and confidence detection
  - phase: 03-ai-integration
    provides: API client, streaming, error handling
  - phase: 06-quality-assurance
    provides: YAML validation
provides:
  - Fix command with error interpretation
  - YAML extraction and validation from Claude responses
  - Safe fix application with backups
  - Target file detection from error messages
affects: [08-polish-deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fix application with validation → display → confirm → backup → apply"
    - "YAML code block extraction from markdown responses"
    - "Target file location from error message patterns"

key-files:
  created:
    - src/explain/fix-applier.ts
    - src/cli/commands/fix.ts
  modified:
    - src/cli/program.ts
    - src/explain/prompts/fix-prompt.ts

key-decisions:
  - "[07-04-01]: extractYamlFromResponse supports with/without language specifier"
  - "[07-04-02]: validateFixSyntax uses yaml.parse for comprehensive validation"
  - "[07-04-03]: applyFix default confirm=false (safety first)"
  - "[07-04-04]: locateTargetFile uses multiple regex patterns for error diversity"
  - "[07-04-05]: Fix command skips confirmation only with --apply flag"

patterns-established:
  - "Fix applier validates before displaying (fail fast on bad YAML)"
  - "Backup creation before applying any changes"
  - "Context extraction as warning not error (continue without context)"
  - "Target file detection optional (show tip if missing)"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 7 Plan 4: Fix Command Summary

**Fix command interprets Ansible errors with AI analysis, extracts corrected YAML, validates syntax, and safely applies fixes with backups**

## Performance

- **Duration:** 3min 14s
- **Started:** 2026-01-20T09:08:12Z
- **Completed:** 2026-01-20T09:11:26Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Fix applier validates YAML, displays with highlighting, confirms with user (default=false), creates backup
- Fix command analyzes errors, extracts YAML, offers to apply with safety checks
- Target file detection from multiple error message patterns
- Complete integration with explain command patterns (--playbook, --complex, streaming)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix applier with safety checks** - `105a4a2` (feat)
2. **Task 2: Fix command implementation** - `e5c6559` (feat)
3. **Task 3: Register fix command and end-to-end testing** - `1e639a9` (feat)

## Files Created/Modified
- `src/explain/fix-applier.ts` - Fix application logic with YAML validation, display, confirmation, backup
- `src/cli/commands/fix.ts` - Fix command with error analysis and apply workflow
- `src/cli/program.ts` - Registered fix command after explain
- `src/explain/prompts/fix-prompt.ts` - Updated to import ContextExtraction from context-extractor

## Decisions Made

- **[07-04-01]**: extractYamlFromResponse regex matches ```yaml and ``` blocks — handles responses with/without language specifier
- **[07-04-02]**: validateFixSyntax uses yaml.parse for comprehensive validation — catches all syntax errors before apply
- **[07-04-03]**: applyFix confirmation default=false (safety first) — user must explicitly approve changes
- **[07-04-04]**: locateTargetFile uses multiple regex patterns — handles diverse Ansible error formats across versions
- **[07-04-05]**: Fix command only skips confirmation with --apply flag — explicit opt-in to auto-apply

## Deviations from Plan

**Auto-fixed Issues:**

**1. [Rule 2 - Missing Critical] Updated fix-prompt.ts to import ContextExtraction**
- **Found during:** Task 2 (Fix command implementation)
- **Issue:** fix-prompt.ts had temporary local ContextExtraction interface (from 07-02)
- **Fix:** Replaced local interface with import from context-extractor.js
- **Files modified:** src/explain/prompts/fix-prompt.ts
- **Verification:** Compilation succeeds, types match
- **Committed in:** e5c6559 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential cleanup from phase 07-02 temporary workaround. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Phase 07 Complete:**
- Both explain and fix commands fully functional
- Context extraction works with --playbook flag
- Claude Opus support with --complex flag
- Safe fix application with validation and backups
- All phase success criteria met:
  1. ✅ explain command explains Ansible code in plain English
  2. ✅ fix command interprets errors and suggests fixes
  3. ✅ --playbook flag provides context for better analysis
  4. ✅ --complex flag uses Claude Opus for difficult analysis

**Ready for Phase 08 (Polish & Deployment):**
- CLI commands complete and tested
- Error handling patterns established
- Safe operation patterns (validation, confirmation, backups)
- No blockers for polish phase

---
*Phase: 07-error-commands*
*Completed: 2026-01-20*
