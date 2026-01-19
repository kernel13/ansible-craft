---
phase: 05-playbook-generation
plan: 02
subsystem: prompts
tags: [ai, prompts, playbook, generation]

dependency-graph:
  requires: [04-prompts]
  provides: [playbook-prompts, playbook-plan-prompt, playbook-generate-prompt]
  affects: [05-03-orchestration, 05-04-cli]

tech-stack:
  added: []
  patterns: [two-phase-generation, file-markers]

key-files:
  created:
    - src/generation/prompts/playbook-system.ts
    - src/generation/prompts/playbook-plan.ts
    - src/generation/prompts/playbook-generate.ts
  modified:
    - src/generation/prompts/index.ts

decisions:
  - id: 05-02-01
    choice: "Local PlaybookPlanPreview type in generate prompt"
    rationale: "Schema module from 05-01 not yet created; local type unblocks development"
  - id: 05-02-02
    choice: "FQCN section copied verbatim from role system prompt"
    rationale: "Same 27 modules apply to both roles and playbooks"
  - id: 05-02-03
    choice: "Export PlaybookPlanPreview type from prompts/index.ts"
    rationale: "Allow downstream consumers to use type until schema module exists"

metrics:
  duration: ~3min
  completed: 2026-01-19
---

# Phase 5 Plan 2: Playbook Prompt Templates Summary

**One-liner:** Playbook system prompt with FQCN, play organization, group_vars structure plus plan/generate prompts using file marker format.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create playbook system prompt | 2f3b01e | playbook-system.ts |
| 2 | Create playbook plan and generate prompts | d87fc14 | playbook-plan.ts, playbook-generate.ts |
| 3 | Update prompts index exports | 4686772 | index.ts |

## Key Deliverables

### ANSIBLE_PLAYBOOK_SYSTEM_PROMPT
- 27 FQCN module examples (same as role prompt)
- Idempotency patterns section
- YAML formatting rules
- **Playbook-specific sections:**
  - Playbook project structure (playbook.yml, inventory.example, group_vars/, README.md)
  - Play organization (pre_tasks, tasks, handlers, post_tasks)
  - Inline tasks with role extraction hints
  - group_vars organization with section headers
  - inventory.example INI format
  - Multi-host patterns (become per task, serial as comment)
  - Content depth (validation in pre_tasks, verification in post_tasks)

### buildPlaybookPlanPrompt
- Takes description and optional clarifications
- Instructs AI to plan plays by host group
- Emphasizes pre_tasks validation with assert/fail
- Requires FQCN for all task modules
- Returns structured JSON per PlaybookPlanPreview schema

### buildPlaybookGeneratePrompt
- Takes approved plan and original description
- Formats plays with tasks, handlers, pre/post_tasks flags
- Formats group_vars by group
- Uses `=== PATH: ... ===` / `=== END ===` file markers
- Lists required files: playbook.yml, inventory.example, group_vars/*.yml, README.md
- Reminders for FQCN, handlers per-play, become per task

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Local PlaybookPlanPreview type**
- **Found during:** Task 2
- **Issue:** Plan instructed to import from `../schemas/playbook-plan.js` but that file doesn't exist (created by 05-01 which hasn't run)
- **Fix:** Defined PlaybookPlanPreview interface locally in playbook-generate.ts
- **Files modified:** src/generation/prompts/playbook-generate.ts
- **Commit:** d87fc14
- **Note:** When 05-01 runs and creates the schema, the import can be updated

## Verification Results

- [x] All four files exist with expected exports
- [x] System prompt has FQCN section (27+ modules)
- [x] System prompt has playbook-specific sections (Play Organization, group_vars, inventory.example)
- [x] Generate prompt uses file marker format (`=== PATH: ... ===` / `=== END ===`)
- [x] Plan prompt mentions pre_tasks validation
- [x] All exports importable from prompts/index.ts

## Technical Notes

### File Marker Format
Same format as role generation for parser reuse:
```
=== PATH: playbook.yml ===
---
content here
=== END ===
```

### Type Export Strategy
PlaybookPlanPreview is exported from playbook-generate.ts and re-exported from index.ts. This allows:
1. Downstream code to use the type immediately
2. Easy refactor to schema import when 05-01 completes

### Prompt Organization
Prompts index now has comments separating:
- Role generation prompts (ANSIBLE_EXPERT_SYSTEM_PROMPT, buildClarifyPrompt, etc.)
- Playbook generation prompts (ANSIBLE_PLAYBOOK_SYSTEM_PROMPT, buildPlaybookPlanPrompt, etc.)

## Next Phase Readiness

**Ready for 05-03:** Orchestration can now use:
- `ANSIBLE_PLAYBOOK_SYSTEM_PROMPT` as system prompt
- `buildPlaybookPlanPrompt(description)` for Phase 1 planning
- `buildPlaybookGeneratePrompt(plan, description)` for Phase 2 generation
- `PlaybookPlanPreview` type for plan typing

**Dependency on 05-01:** When schema module is created, update playbook-generate.ts to import PlaybookPlanPreview from `../schemas/playbook-plan.js` instead of defining locally.
