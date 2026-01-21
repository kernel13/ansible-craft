# Project Research Summary

**Project:** ansible-craft v1.1 Plan Mode
**Domain:** CLI interactive wizard for Ansible role/playbook context gathering
**Researched:** 2026-01-21
**Confidence:** HIGH

## Executive Summary

Plan Mode adds an interactive wizard to ansible-craft that gathers structured context before AI generation. The key architectural insight is that the existing codebase already has an unused `clarifications` parameter flowing through `generateRolePlan()` and `buildPlanPrompt()` — the wizard simply needs to populate this existing path rather than requiring new prompt infrastructure. This significantly reduces implementation risk.

The recommended approach is an opt-in wizard triggered by `--plan` flag, keeping the current quick-generation workflow as default. The wizard should be limited to 3-5 questions maximum with sensible defaults, allowing users to Enter through the entire flow if desired. The `@inquirer/prompts` package is already a dependency, so no new packages are needed for the core implementation.

The primary risks are UX-related: destroying the quick path that power users rely on, overwhelming users with too many questions, and losing wizard context when building AI prompts. Prevention strategies include strict opt-in activation, immediate validation per question, TTY detection before prompting, and explicit unit tests mapping wizard answers to prompt sections.

## Key Findings

### Recommended Stack

The existing stack is sufficient for Plan Mode. No new runtime dependencies are required.

**Core technologies (already present):**
- **@inquirer/prompts**: Modern ESM prompt library — already in package.json, provides `input`, `select`, `confirm`, `checkbox`
- **Zod**: Schema validation — use for WizardContext validation and context file parsing
- **ora**: Terminal spinners — extend for wizard step progress display
- **chalk**: Terminal styling — already used for output formatting

**Do NOT add:**
- Legacy `inquirer` package — different API, larger bundle
- Complex state management libraries — simple object state is sufficient
- Template engines for wizard — not needed, prompts are simple strings

### Expected Features

**Must have (table stakes):**
- Step-by-step prompts (one question at a time)
- Progress indicator ("Step 2 of 5")
- Keyboard navigation (arrow keys, Enter)
- Clear exit pathway (Ctrl+C with cleanup)
- Input validation per question
- Default values for all questions
- `--quick` flag to bypass wizard
- Non-interactive mode compatibility

**Should have (differentiators):**
- Save defaults option ("Remember my choices")
- Conditional prompts (show/hide based on previous answers)
- Description enhancement with wizard answers
- Preview before generation (show what AI will receive)
- Role structure selection (which directories to include)
- Platform targeting (RHEL/Ubuntu/Debian/generic)

**Defer (v2+):**
- AI-assisted default values (extra API call)
- Import existing role to pre-fill wizard
- Undo/back navigation (complex state machine)
- Wizard profiles (--profile=minimal, --profile=full)
- Autocomplete for Ansible modules

### Architecture Approach

The wizard integrates as a new module (`src/wizard/`) that runs BEFORE the existing two-phase generation flow. It collects `WizardContext`, formats it to `Record<string, string>`, and passes it to the existing `clarifications` parameter in `generateRolePlan()`. This leverages the already-existing prompt template section for "Additional Context" without requiring system prompt changes.

**Major components:**
1. **src/wizard/types.ts** — WizardContext and WizardStep interfaces
2. **src/wizard/runner.ts** — Wizard orchestration using @inquirer/prompts
3. **src/wizard/steps/** — Step definitions for environment, components, security
4. **src/wizard/formatter.ts** — Convert WizardContext to clarifications format
5. **src/cli/commands/new.ts** (modified) — Add --plan flag, invoke wizard before generation

### Critical Pitfalls

1. **Destroying the Quick Path (W1)** — Wizard MUST be opt-in via `--plan` flag. Never intercept the default `new role "description"` workflow. Power users must never feel slowed down.

2. **Question Overload (W2)** — Limit to 3-5 essential questions. Provide sensible defaults for every question so users can Enter through the entire wizard if desired.

3. **TTY Detection Failure (T1)** — Check `process.stdin.isTTY` before any prompts. Fail fast with helpful message if wizard requested in non-interactive environment. Never hang in CI/CD.

4. **Context Lost to AI (I1)** — Map every wizard answer to a specific prompt section. Unit test: "Given wizard answers X, prompt contains Y". Log final prompt at debug level for verification.

5. **Wizard + JSON Mode Conflict (I4)** — These flags are mutually exclusive. Detect and error immediately: "Cannot use --wizard with --json". Offer `--context <file>` alternative.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Types and formatter have no internal dependencies, can be built and tested in isolation. This establishes the data contracts before any user-facing work.
**Delivers:** Core type definitions and context formatting logic
**Addresses:** WizardContext interface, formatForPrompt() function
**Avoids:** I3 (context format lock-in) — version the schema from day one

### Phase 2: Wizard Engine
**Rationale:** Depends on Phase 1 types. Build prompting infrastructure before CLI integration to enable isolated testing.
**Delivers:** Working wizard flow that returns WizardContext
**Uses:** @inquirer/prompts (already a dependency)
**Implements:** runner.ts with step orchestration, state management, Ctrl+C handling
**Avoids:** T2 (state lost on back), T4 (Ctrl+C orphaned state)

### Phase 3: CLI Integration
**Rationale:** Depends on Phase 2 wizard engine. This is where user-facing changes happen.
**Delivers:** `--plan` flag working end-to-end
**Implements:** Modified new.ts command, TTY detection, flag validation
**Avoids:** W1 (destroying quick path), T1 (TTY failure), I4 (wizard + JSON conflict)

### Phase 4: Context Enhancement
**Rationale:** After basic integration works, improve AI output quality through better context.
**Delivers:** Richer prompts, better generation results
**Implements:** Context-to-prompt mapping tests, playbook clarifications support
**Avoids:** I1 (context lost to AI)

### Phase 5: Polish
**Rationale:** User experience refinements after core functionality is stable
**Delivers:** Save defaults, conditional prompts, progress display improvements
**Addresses:** Differentiator features from FEATURES.md

### Phase Ordering Rationale

- **Types first:** Establishes contracts for all subsequent work
- **Wizard before CLI:** Enables unit testing without end-to-end complexity
- **Integration before polish:** Get working system early, refine later
- **Context enhancement separate:** Can A/B test generation quality

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Context Enhancement):** May need prompt engineering experimentation to optimize wizard-to-prompt formatting

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Standard TypeScript types and formatting
- **Phase 2 (Wizard Engine):** @inquirer/prompts has extensive documentation
- **Phase 3 (CLI Integration):** Commander.js patterns are well-established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All dependencies already present; verified against package.json |
| Features | HIGH | CLI UX guidelines and @inquirer/prompts docs are comprehensive |
| Architecture | HIGH | Analyzed existing codebase; unused clarifications path confirmed |
| Pitfalls | HIGH | Multiple authoritative sources; patterns verified against real issues |

**Overall confidence:** HIGH

### Gaps to Address

- **Question Set Finalization:** Research suggests 3-5 questions, but exact questions need user validation during Phase 2 design
- **Smart Defaults from Description:** Whether to analyze description with AI to pre-populate defaults is deferred to v2+, but may warrant experimentation
- **Context File Format:** If implementing --context file loading, needs schema design (suggest versioned YAML)

## Sources

### Primary (HIGH confidence)
- @inquirer/prompts v7.x documentation — prompt patterns, ESM usage
- clig.dev CLI guidelines — interactive mode principles, escape hatches
- Existing ansible-craft codebase — clarifications parameter, prompt templates
- Bun v1.3.6 documentation — native TypeScript, env handling

### Secondary (MEDIUM confidence)
- Evil Martians CLI UX — progress display patterns
- Yeoman generator docs — store option pattern for saving defaults
- OWASP prompt injection guide — input sanitization patterns

### Tertiary (LOW confidence)
- Wizard UI Pattern studies — question count recommendations (5-7 optimal)

---
*Research completed: 2026-01-21*
*Ready for roadmap: yes*
