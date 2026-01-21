# Roadmap: Ansible Craft v1.1 Plan Mode

## Milestones

- [x] **v1.0 MVP** - Phases 1-8 (shipped 2026-01-21)
- [ ] **v1.1 Plan Mode** - Phases 9-13 (in progress)

## Overview

v1.1 adds an interactive wizard system to ansible-craft that gathers structured context before AI generation. The wizard provides step-by-step prompts for role and playbook customization, with options to bypass via --quick flag or save choices as defaults. This enhances generation quality through user-provided context while maintaining the fast workflow power users expect.

## Phases

**Phase Numbering:**
- Integer phases (9, 10, 11...): Planned milestone work
- Decimal phases (10.1, 10.2): Urgent insertions (marked with INSERTED)

- [ ] **Phase 9: Foundation** - Type definitions and context schema for wizard system
- [ ] **Phase 10: Role Wizard** - Interactive prompts for role structure, platforms, handlers
- [ ] **Phase 11: Playbook Wizard** - Interactive prompts for playbook hosts, escalation, handlers
- [ ] **Phase 12: CLI Integration** - --quick flag, TTY detection, context passing to AI
- [ ] **Phase 13: Defaults Management** - Save and load wizard choices as defaults

## Phase Details

<details>
<summary>v1.0 MVP (Phases 1-8) - SHIPPED 2026-01-21</summary>

See `.planning/milestones/v1.0-ROADMAP.md` for complete v1.0 phase details.

**Summary:**
- 8 phases, 32 plans, 21 requirements
- AI-powered role and playbook generation
- Quality validation (FQCN, idempotency, ansible-lint)
- Explain and fix commands
- npm package published

</details>

### v1.1 Plan Mode (In Progress)

**Milestone Goal:** Add interactive context-gathering wizard before generation for more tailored, user-controlled output.

#### Phase 9: Foundation
**Goal**: Establish type definitions and context schema that all wizard components depend on
**Depends on**: Nothing (first phase of v1.1)
**Requirements**: None directly (enables INTG-01)
**Success Criteria** (what must be TRUE):
  1. WizardContext TypeScript interface exists with typed fields for all wizard questions
  2. Zod schema validates WizardContext at runtime
  3. formatForPrompt() function converts WizardContext to clarifications format
  4. Unit tests verify schema validation and formatting
**Plans**: 1 plan

Plans:
- [ ] 09-01-PLAN.md — Wizard types, Zod schemas, and formatForPrompt utilities

#### Phase 10: Role Wizard
**Goal**: Users can interactively customize role generation through step-by-step prompts
**Depends on**: Phase 9 (needs WizardContext types)
**Requirements**: RWIZ-01, RWIZ-02, RWIZ-03, RWIZ-04, RWIZ-06
**Success Criteria** (what must be TRUE):
  1. User sees "Step 1 of N" progress indicator during wizard
  2. User can select which role directories to include (tasks, handlers, templates, etc.)
  3. User can select target platforms (Ubuntu, RHEL, Debian, Windows, Generic)
  4. User can select which handlers to generate (restart, reload, enable, custom)
  5. User can exit wizard with Ctrl+C and see clean cancellation message
**Plans**: TBD

Plans:
- [ ] 10-01: Role wizard prompts and runner
- [ ] 10-02: Role wizard state management and Ctrl+C handling

#### Phase 11: Playbook Wizard
**Goal**: Users can interactively customize playbook generation through step-by-step prompts
**Depends on**: Phase 10 (shares wizard infrastructure)
**Requirements**: PWIZ-01, PWIZ-02, PWIZ-03, PWIZ-04
**Success Criteria** (what must be TRUE):
  1. User sees step-by-step prompts for playbook generation
  2. User can specify inventory groups to target (webservers, databases, etc.)
  3. User can specify whether privilege escalation (become: yes) is needed
  4. User can specify whether to include handlers in generated playbook
**Plans**: TBD

Plans:
- [ ] 11-01: Playbook wizard prompts and runner

#### Phase 12: CLI Integration
**Goal**: Wizard integrates seamlessly with existing CLI, with bypass options
**Depends on**: Phase 11 (needs both wizards working)
**Requirements**: RWIZ-05, INTG-01, INTG-02
**Success Criteria** (what must be TRUE):
  1. User can skip wizard with --quick flag and use defaults
  2. Wizard context is passed to AI generation (visible in improved output quality)
  3. --no-interactive flag bypasses wizard completely (non-TTY environments)
  4. Wizard detects non-TTY stdin and skips prompts automatically
**Plans**: TBD

Plans:
- [ ] 12-01: CLI flag integration and TTY detection
- [ ] 12-02: Context passing to generation prompts

#### Phase 13: Defaults Management
**Goal**: Users can save wizard choices for reuse in future sessions
**Depends on**: Phase 12 (needs wizard working end-to-end)
**Requirements**: DFLT-01, DFLT-02
**Success Criteria** (what must be TRUE):
  1. User is asked at end of wizard "Save these choices as defaults?"
  2. Saved defaults are stored in config file (~/.config/ansible-craft/config.toml)
  3. --quick flag uses saved defaults when available
**Plans**: TBD

Plans:
- [ ] 13-01: Defaults save prompt and config storage

## Progress

**Execution Order:**
Phases execute in numeric order: 9 -> 10 -> 11 -> 12 -> 13

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-8 | v1.0 | 32/32 | Complete | 2026-01-21 |
| 9. Foundation | v1.1 | 0/1 | Planned | - |
| 10. Role Wizard | v1.1 | 0/2 | Not started | - |
| 11. Playbook Wizard | v1.1 | 0/1 | Not started | - |
| 12. CLI Integration | v1.1 | 0/2 | Not started | - |
| 13. Defaults Management | v1.1 | 0/1 | Not started | - |

---
*Roadmap created: 2026-01-21*
*Last updated: 2026-01-21*
