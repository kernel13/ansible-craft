---
phase: 04-role-generation
plan: 03
subsystem: generation
tags: [anthropic-api, structured-outputs, streaming, orchestration]

dependency_graph:
  requires: ["04-01", "04-02"]
  provides: ["role-generation-orchestration", "two-phase-generation"]
  affects: ["04-04", "04-05"]

tech_stack:
  added: []
  patterns:
    - "Two-phase generation: plan preview then streaming code"
    - "Structured outputs beta for guaranteed JSON schema"
    - "Spinner-to-stream transition for visual feedback"

key_files:
  created:
    - src/generation/generate-role.ts
    - src/generation/index.ts
  modified: []

decisions:
  - id: "04-03-01"
    decision: "output_format with schema (not response_format)"
    reason: "SDK uses output_format param, response_format is OpenAI pattern"
  - id: "04-03-02"
    decision: "8192 max tokens for code generation"
    reason: "Ansible roles can be large with multiple files"
  - id: "04-03-03"
    decision: "Warn on fewer files than expected"
    reason: "Non-blocking feedback; generation may be valid with fewer files"

metrics:
  duration: "~2min"
  completed: "2026-01-19"
---

# Phase 04 Plan 03: Role Generation Orchestration Summary

Two-phase role generation with structured outputs beta and streaming YAML output.

## What Was Built

### Task 1: Plan Preview Generation (a55fbaa)

Created `generateRolePlan` function that uses Anthropic's structured-outputs-2025-11-13 beta:

```typescript
const response = await client.beta.messages.create({
  model: DEFAULT_MODEL,
  max_tokens: 4096,
  betas: ['structured-outputs-2025-11-13'],
  system: ANSIBLE_EXPERT_SYSTEM_PROMPT,
  messages: [{ role: 'user', content: prompt }],
  output_format: {
    type: 'json_schema',
    schema: PLAN_PREVIEW_SCHEMA,
  },
});
```

**Key features:**
- Spinner shows "Generating role plan..." during API call
- Guaranteed JSON response matching PlanPreview schema
- Error handling with transformApiError/displayApiError
- Support for quiet mode and noRetry options

### Task 2: Streaming Code Generation (21cde09)

Created `generateRoleCode` function for streaming YAML generation:

```typescript
const message = await streamMessage(client, {
  userMessage: prompt,
  systemPrompt: ANSIBLE_EXPERT_SYSTEM_PROMPT,
  maxTokens: 8192,  // Large roles
}, { quiet, noRetry });

const files = parseGeneratedFiles(extractText(message));
```

**Key features:**
- Uses existing streamMessage for visual streaming
- Automatic spinner-to-output transition
- Parses output into GeneratedFile array
- Warns if fewer files than expected

### Barrel Export (index.ts)

Clean public API exporting all generation utilities:
- Prompt builders
- Plan preview schema
- Role structure utilities
- Generation functions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] SDK parameter naming**

- **Found during:** Task 1
- **Issue:** Plan specified `response_format` with nested `json_schema`, but SDK uses `output_format` with simpler structure
- **Fix:** Changed to `output_format: { type: 'json_schema', schema: PLAN_PREVIEW_SCHEMA }`
- **Files modified:** src/generation/generate-role.ts
- **Commit:** a55fbaa

## Verification Results

1. TypeScript compilation: No errors in new files (pre-existing errors in other files)
2. All exports accessible from `src/generation/index.ts`
3. `betas: ['structured-outputs-2025-11-13']` present
4. `streamMessage` used for streaming with spinner
5. `maxTokens: 8192` for large roles
6. `parseGeneratedFiles` called on streaming output

## Integration Points

**Connects to:**
- `src/ai/stream.ts` - streamMessage for YAML output
- `src/ai/errors.ts` - transformApiError, displayApiError
- `src/ai/retry.ts` - withRetry for resilience
- `src/generation/prompts/` - buildPlanPrompt, buildGeneratePrompt
- `src/generation/role/` - parseGeneratedFiles

**Used by (next plans):**
- 04-04: Output validation pipeline
- 04-05: File writing and CLI integration

## Next Phase Readiness

Ready for 04-04 (Output Validation Pipeline):
- GeneratedFile array ready for validation
- Plan preview available for expected file count checks
- Clean module boundaries for validation integration

Blockers: None
