---
phase: 07-error-commands
plan: 01
subsystem: cli-utilities
tags: [file-io, yaml, context-extraction, nlp, confidence-detection]

# Dependency graph
requires:
  - phase: 04-role-generation
    provides: Role directory structure patterns (ROLE_DIRECTORIES)
  - phase: 06-quality-assurance
    provides: YAML validation patterns
provides:
  - Recursive file reader for Ansible roles and playbooks
  - Smart context extraction for --playbook flag
  - Confidence detection for LLM response uncertainty
affects: [07-02-explain-command, 07-03-fix-command]

# Tech tracking
tech-stack:
  added: []
  patterns: [recursive-directory-reading, context-extraction, linguistic-uncertainty-detection]

key-files:
  created:
    - src/explain/file-reader.ts
    - src/explain/context-extractor.ts
    - src/explain/confidence-detector.ts
    - src/explain/index.ts
  modified: []

key-decisions:
  - "inferFileType defaults to 'playbook' for standalone YAML files"
  - "Task context extraction: ±5 lines or full task if >15 lines"
  - "Confidence threshold: 2+ uncertainty markers or specific strong phrases"
  - "Higher uncertainty threshold (4+) when certainty language present"
  - "Multiple regex patterns for Ansible error parsing to handle format diversity"

patterns-established:
  - "RoleFile interface: path, content, type for unified file handling"
  - "ContextExtraction interface: variables, handlers, taskContext, roleStructure"
  - "Error parsing with fallback patterns for different Ansible error formats"
  - "Linguistic hedging detection for LLM confidence assessment"

# Metrics
duration: 3min
completed: 2026-01-20
---

# Phase 7 Plan 1: Error Commands Infrastructure Summary

**Recursive file reading for Ansible roles, smart context extraction with ±5 line task windows, and linguistic uncertainty detection with 20 hedging markers**

## Performance

- **Duration:** 3 min (172 seconds)
- **Started:** 2026-01-20T19:41:51Z
- **Completed:** 2026-01-20T19:44:43Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- File reader handles both single files and role directories with graceful error handling
- Context extractor parses 5 different Ansible error formats to locate failing tasks
- Confidence detector identifies hedging language with balanced thresholds
- Barrel export enables clean imports: `import { readAnsiblePath, extractContext } from './explain'`

## Task Commits

Each task was committed atomically:

1. **Task 1: File reader for Ansible files and roles** - (skipped - already committed in 2cf5132 as part of 07-02)
2. **Task 2: Context extractor for --playbook flag** - `9469b60` (feat)
3. **Task 3: Confidence detector and barrel export** - `587544b` (feat)

**Note:** Task 1 was already completed and committed as part of an earlier commit (2cf5132) which included both file-reader.ts and explain-prompt.ts. This plan's execution created Tasks 2 and 3.

## Files Created/Modified

- `src/explain/file-reader.ts` - Recursive reader for Ansible files and role directories (already existed)
- `src/explain/context-extractor.ts` - Smart context extraction with task location and variable parsing
- `src/explain/confidence-detector.ts` - Linguistic uncertainty detection with 20 hedging markers
- `src/explain/index.ts` - Barrel export for clean module imports

## Decisions Made

### inferFileType defaults to 'playbook'
For standalone YAML files outside role structure, defaulting to 'playbook' type provides sensible classification when path doesn't contain known subdirs (tasks/, handlers/, etc.)

### Task context extraction strategy
Extract ±5 lines around failing task for standard cases, but include full task body + 3 lines before/after for long tasks (>15 lines). This balances context richness with token efficiency.

### Confidence detection thresholds
Standard threshold of 2+ uncertainty markers detects hedging effectively. Higher threshold (4+) when certainty language present prevents false positives when LLM is genuinely confident despite minor hedging.

### Multiple error format patterns
Ansible errors vary widely (TASK [name], JSON format, undefined var format, fatal errors, handler execution). Five regex patterns with fallback provide robust parsing across versions and error types.

### High certainty phrases
Phrases like "definitely", "certainly", "clearly" indicate confidence despite hedging markers. Requiring more hedges (4+) when these appear prevents over-flagging confident responses.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all utilities built without complications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Infrastructure complete for explain and fix commands. Ready for:
- 07-02: explain command implementation (uses readAnsiblePath, extractContext, suggestComplexIfNeeded)
- 07-03: fix command implementation (uses extractFixContext, parseTaskNameFromError, detectLowConfidence)

**Key integration points:**
- `readAnsiblePath(path)` → reads file or directory recursively
- `extractContext(playbookPath)` → extracts variables, handlers, role structure
- `extractFixContext(errorMessage, playbookPath)` → finds failing task and surrounding context
- `suggestComplexIfNeeded(response, usedComplex)` → prints tip when Sonnet shows uncertainty

---
*Phase: 07-error-commands*
*Completed: 2026-01-20*
