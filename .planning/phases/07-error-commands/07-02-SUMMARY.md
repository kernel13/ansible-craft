---
phase: 07-error-commands
plan: 02
subsystem: ai-prompts
tags: [anthropic, prompts, claude-opus, model-selection, error-analysis]

# Dependency graph
requires:
  - phase: 03-ai-integration
    provides: Anthropic SDK client wrapper with DEFAULT_MODEL constant
provides:
  - System and user prompts for explain command (structured output)
  - System and user prompts for fix command (YAML extraction)
  - Model selection logic with --complex flag and cost warnings
affects: [07-03-explain-command, 07-04-fix-command]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Structured prompt templates with required output sections
    - Context-aware prompt building (--playbook integration)
    - Model selection with user confirmation for cost control

key-files:
  created:
    - src/explain/prompts/explain-prompt.ts
    - src/explain/prompts/fix-prompt.ts
    - src/explain/prompts/index.ts
    - src/ai/models.ts
  modified: []

key-decisions:
  - "EXPLAIN_SYSTEM_PROMPT enforces structured output: Purpose, Tasks, Variables, Dependencies, Issues, Role Structure"
  - "FIX_SYSTEM_PROMPT requires corrected YAML in extractable code blocks"
  - "Temporary ContextExtraction interface defined locally (will be replaced when 07-01 completes)"
  - "OPUS_MODEL uses claude-opus-4-5-20251101 for complex analysis"
  - "selectModel prompts for confirmation only with --complex flag"

patterns-established:
  - "Prompt templates include system prompt (role/format) + builder function (content/context)"
  - "Fix prompts suggest --playbook flag when no context provided"
  - "Model selection returns {model, confirmed} to signal user cancellation"

# Metrics
duration: 2min
completed: 2026-01-20
---

# Phase 07 Plan 02: Error Commands Prompts Summary

**Structured prompt templates for explain/fix commands with model selection logic for --complex flag and cost warnings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-20T08:08:28Z
- **Completed:** 2026-01-20T08:11:07Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- EXPLAIN_SYSTEM_PROMPT with 6 required output sections (Purpose, Tasks, Variables, Dependencies, Issues, Role Structure)
- FIX_SYSTEM_PROMPT with error explanation and corrected YAML in extractable code blocks
- Model selection logic with Opus cost warning and user confirmation
- Context-aware prompt building for --playbook flag integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Explain command prompts** - `2cf5132` (feat)
2. **Task 2: Fix command prompts** - `6629779` (feat)
3. **Task 3: Model selector with cost warning** - `1c49031` (feat)

## Files Created/Modified
- `src/explain/prompts/explain-prompt.ts` - System and user prompts for explain command with structured output sections
- `src/explain/prompts/fix-prompt.ts` - System and user prompts for fix command with YAML extraction format
- `src/explain/prompts/index.ts` - Barrel export for prompt modules
- `src/ai/models.ts` - Model selection logic with OPUS_MODEL, selectModel, confirmOpusUsage

## Decisions Made

**1. Temporary ContextExtraction interface**
- Defined locally in both prompt files since 07-01 hasn't completed yet
- Will be replaced with proper import once context-extractor.ts exists
- Keeps type safety without blocking progress

**2. OPUS_MODEL pinned version**
- Uses claude-opus-4-5-20251101 (latest Opus 4.5)
- Consistent with DEFAULT_MODEL pattern from client.ts

**3. selectModel confirmation behavior**
- Returns {model, confirmed: false} when user declines Opus
- Allows calling code to abort operation rather than silently falling back
- Clear signal that user cancelled intentionally

**4. Prompt structure pattern**
- System prompt defines role and output format
- Builder function adds content and optional context
- Separation makes system prompts reusable across different inputs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Prompt templates ready for explain command implementation (07-03)
- Model selector ready for both explain and fix commands
- Context integration points prepared for --playbook flag
- FQCN and idempotency rules embedded in FIX_SYSTEM_PROMPT

**Note:** ContextExtraction type will need import path update when 07-01 completes.

---
*Phase: 07-error-commands*
*Completed: 2026-01-20*
