---
phase: 04-role-generation
plan: 01
subsystem: generation
tags: [prompts, llm, yaml, fqcn, idempotency, structured-outputs]

# Dependency graph
requires:
  - phase: 03-ai-integration
    provides: Claude API client, streaming, and error handling
provides:
  - ANSIBLE_EXPERT_SYSTEM_PROMPT with FQCN and idempotency patterns
  - buildClarifyPrompt for generating contextual questions
  - buildPlanPrompt for creating structured preview requests
  - buildGeneratePrompt with file marker format for parsing
  - PLAN_PREVIEW_SCHEMA for Anthropic structured outputs beta
affects: [04-02, 04-03, 04-04, 04-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "System prompt with embedded best practices and examples"
    - "File marker format for multi-file output parsing (=== PATH: ... === / === END ===)"
    - "JSON schema for structured outputs beta"

key-files:
  created:
    - src/generation/prompts/system.ts
    - src/generation/prompts/clarify.ts
    - src/generation/prompts/plan.ts
    - src/generation/prompts/generate.ts
    - src/generation/prompts/index.ts
    - src/generation/schemas/plan-preview.ts
  modified: []

key-decisions:
  - "04-01-01: Embed 27 unique FQCN examples in system prompt for coverage"
  - "04-01-02: Use === PATH: ... === / === END === markers for file parsing"
  - "04-01-03: Schema requires all 7 fields with additionalProperties: false for strict validation"

patterns-established:
  - "Prompt templates in src/generation/prompts/ with barrel export"
  - "JSON schemas in src/generation/schemas/ with paired TypeScript interfaces"
  - "File marker format: === PATH: path/to/file.yml === ... === END ==="

# Metrics
duration: 3min
completed: 2026-01-19
---

# Phase 04 Plan 01: Prompt Engineering Foundation Summary

**System prompt with 27 FQCN examples, idempotency patterns, and three prompt builders using file markers for multi-file output parsing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-19T18:23:09Z
- **Completed:** 2026-01-19T18:26:32Z
- **Tasks:** 3
- **Files created:** 6

## Accomplishments

- Comprehensive system prompt with FQCN enforcement (27 unique module examples)
- Idempotency patterns embedded (state:, handlers, creates:)
- Three prompt builders for clarify/plan/generate workflow
- JSON schema ready for Anthropic structured outputs beta
- File marker format for parsing multi-file generation output

## Task Commits

Each task was committed atomically:

1. **Task 1: Create system prompt with FQCN and idempotency patterns** - `6131164` (feat)
2. **Task 2: Create clarifying questions, plan, and generation prompts** - `3298136` (feat)
3. **Task 3: Create JSON schema for plan preview structured outputs** - `c3e9fb5` (feat)

## Files Created

- `src/generation/prompts/system.ts` - ANSIBLE_EXPERT_SYSTEM_PROMPT constant with embedded best practices
- `src/generation/prompts/clarify.ts` - buildClarifyPrompt function for contextual questions
- `src/generation/prompts/plan.ts` - buildPlanPrompt function for structured preview
- `src/generation/prompts/generate.ts` - buildGeneratePrompt function with file markers
- `src/generation/prompts/index.ts` - Barrel export for all prompt functions
- `src/generation/schemas/plan-preview.ts` - PlanPreview interface and JSON schema

## Decisions Made

- **04-01-01**: Embedded 27 unique FQCN module examples directly in system prompt for comprehensive coverage across all common Ansible operations
- **04-01-02**: Used `=== PATH: ... ===` and `=== END ===` markers for file boundaries - simple regex-parseable format that survives streaming
- **04-01-03**: Set `additionalProperties: false` in JSON schema for strict validation - prevents hallucinated fields in structured output

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - TypeScript pre-existing errors in ai/errors.ts and ai/retry.ts were unrelated to this plan's work.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Prompts ready for use in generation pipeline
- Schema ready for structured outputs API calls
- Next plan (04-02) can implement the output parser and YAML validation

---
*Phase: 04-role-generation*
*Completed: 2026-01-19*
