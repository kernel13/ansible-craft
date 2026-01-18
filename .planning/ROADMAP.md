# Roadmap: Ansible Craft

## Overview

Ansible Craft delivers an AI-powered CLI that generates production-ready Ansible roles and playbooks from natural language. The roadmap progresses from foundational CLI infrastructure through core generation capabilities, quality validation, and error assistance (the killer differentiator), culminating in npm publication. Eight phases deliver a complete standalone tool that fills the gap between expensive enterprise solutions and generic AI.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - CLI skeleton with help, version, and proper exit codes
- [x] **Phase 2: Configuration** - Config file management and API key handling
- [x] **Phase 3: AI Integration** - Claude API client with rate limiting and streaming
- [ ] **Phase 4: Role Generation** - Generate complete Ansible roles from natural language
- [ ] **Phase 5: Playbook Generation** - Generate Ansible playbooks from natural language
- [ ] **Phase 6: Quality Assurance** - ansible-lint validation, dry-run preview, streaming UX
- [ ] **Phase 7: Error Commands** - explain and fix commands with context awareness
- [ ] **Phase 8: Publishing** - npm package, shell completions, JSON output

## Phase Details

### Phase 1: Foundation
**Goal**: Users can invoke the CLI and get proper help, version info, and exit codes
**Depends on**: Nothing (first phase)
**Requirements**: CLI-01, CLI-02, CLI-03
**Success Criteria** (what must be TRUE):
  1. User can run `ansible-craft --help` and see usage examples
  2. User can run `ansible-craft --version` and see the version number
  3. CLI exits with code 0 on success and code 1 on error
  4. CLI displays error messages to stderr, not stdout
**Plans**: 3 plans in 3 waves (sequential)

Plans:
- [x] 01-01-PLAN.md — Project scaffolding and CLI entry point (Wave 1)
- [x] 01-02-PLAN.md — Help and version commands (Wave 2)
- [x] 01-03-PLAN.md — Exit code handling and error display (Wave 3)

### Phase 2: Configuration
**Goal**: Users can configure the CLI with API key and persistent preferences
**Depends on**: Phase 1
**Requirements**: CFG-01, CFG-02, CLI-04
**Success Criteria** (what must be TRUE):
  1. CLI reads ANTHROPIC_API_KEY from environment variable
  2. CLI reads defaults from ~/.ansible-craft/config.toml
  3. User can save preferences to config file
  4. CLI fails gracefully with clear message when API key is missing
**Plans**: 3 plans in 3 waves (sequential)

Plans:
- [x] 02-01-PLAN.md — Config loading infrastructure (Wave 1)
- [x] 02-02-PLAN.md — API key validation and error display (Wave 2)
- [x] 02-03-PLAN.md — Config save command with interactive wizard (Wave 3)

### Phase 3: AI Integration
**Goal**: Foundation for all AI-powered features with proper error handling
**Depends on**: Phase 2
**Requirements**: (internal foundation - enables GEN-01 through GEN-04, ERR-01 through ERR-03)
**Success Criteria** (what must be TRUE):
  1. Claude API calls succeed with valid API key
  2. Rate limit errors (429) trigger exponential backoff with jitter
  3. API errors display user-friendly messages (not raw stack traces)
  4. Streaming responses work for long-running generation
**Plans**: 3 plans in 3 waves (sequential)

Plans:
- [x] 03-01-PLAN.md — Anthropic SDK client wrapper (Wave 1)
- [x] 03-02-PLAN.md — Rate limiting and retry logic (Wave 2)
- [x] 03-03-PLAN.md — Streaming response handler (Wave 3)

### Phase 4: Role Generation
**Goal**: Users can generate complete Ansible roles from natural language descriptions
**Depends on**: Phase 3
**Requirements**: GEN-01, QUAL-01, QUAL-02, QUAL-03, QUAL-04
**Success Criteria** (what must be TRUE):
  1. User can run `ansible-craft new role "install nginx with SSL"` and get a complete role
  2. Generated role has proper structure (tasks/, handlers/, defaults/, templates/, meta/, README.md)
  3. Generated YAML is valid and parseable
  4. Generated code uses Fully Qualified Collection Names (ansible.builtin.*)
  5. Generated tasks are idempotent (safe to run multiple times)
**Plans**: TBD

Plans:
- [ ] 04-01: Role generation prompt engineering
- [ ] 04-02: Role structure scaffolding
- [ ] 04-03: YAML generation and FQCN enforcement
- [ ] 04-04: Idempotency patterns and validation
- [ ] 04-05: File writing and conflict handling

### Phase 5: Playbook Generation
**Goal**: Users can generate Ansible playbooks from natural language descriptions
**Depends on**: Phase 4
**Requirements**: GEN-02
**Success Criteria** (what must be TRUE):
  1. User can run `ansible-craft new playbook "deploy LAMP stack"` and get a playbook
  2. Generated playbook includes proper YAML structure with hosts, tasks, handlers
  3. Generated playbook uses FQCN and follows idempotency patterns
**Plans**: TBD

Plans:
- [ ] 05-01: Playbook generation prompt engineering
- [ ] 05-02: Playbook structure templates
- [ ] 05-03: Multi-play and include handling

### Phase 6: Quality Assurance
**Goal**: Generated code is validated and users see progress in real-time
**Depends on**: Phase 5
**Requirements**: QUAL-05, GEN-03, GEN-04
**Success Criteria** (what must be TRUE):
  1. Generated code passes ansible-lint validation before output
  2. User sees generation progress in real-time via streaming output
  3. User can preview what will be created before writing via --dry-run flag
  4. Lint violations are fixed automatically or reported with suggestions
**Plans**: TBD

Plans:
- [ ] 06-01: ansible-lint integration
- [ ] 06-02: Streaming progress display
- [ ] 06-03: Dry-run preview mode
- [ ] 06-04: Auto-fix for common lint issues

### Phase 7: Error Commands
**Goal**: Users can understand existing code and fix Ansible errors (killer differentiator)
**Depends on**: Phase 6
**Requirements**: ERR-01, ERR-02, ERR-03, CFG-03
**Success Criteria** (what must be TRUE):
  1. User can run `ansible-craft explain path/to/file.yml` and get plain-English explanation
  2. User can run `ansible-craft fix "error message"` and get interpretation with fix suggestions
  3. User can provide playbook context via --playbook flag for better fix suggestions
  4. User can use --complex flag to invoke Claude Opus for difficult problems
**Plans**: TBD

Plans:
- [ ] 07-01: Explain command implementation
- [ ] 07-02: Error pattern recognition
- [ ] 07-03: Fix command with context awareness
- [ ] 07-04: Model selection (--complex flag)

### Phase 8: Publishing
**Goal**: CLI is published to npm and provides professional UX features
**Depends on**: Phase 7
**Requirements**: CLI-05, CLI-06
**Success Criteria** (what must be TRUE):
  1. Package is published to npm and installable via `npm install -g ansible-craft`
  2. CLI works via bunx/npx/pnpx without global install
  3. Shell completions work for bash, zsh, and fish
  4. CLI supports --json flag for machine-readable output
**Plans**: TBD

Plans:
- [ ] 08-01: npm package configuration
- [ ] 08-02: ESM/CJS dual publishing
- [ ] 08-03: Shell completion scripts
- [ ] 08-04: JSON output mode
- [ ] 08-05: Final documentation and README

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-18 |
| 2. Configuration | 3/3 | Complete | 2026-01-18 |
| 3. AI Integration | 3/3 | Complete | 2026-01-18 |
| 4. Role Generation | 0/5 | Not started | - |
| 5. Playbook Generation | 0/3 | Not started | - |
| 6. Quality Assurance | 0/4 | Not started | - |
| 7. Error Commands | 0/4 | Not started | - |
| 8. Publishing | 0/5 | Not started | - |

---
*Roadmap created: 2025-01-18*
*Phase 1 planned: 2025-01-18*
*Phase 1 completed: 2026-01-18*
*Phase 2 planned: 2026-01-18*
*Phase 2 completed: 2026-01-18*
*Phase 3 planned: 2026-01-18*
*Phase 3 completed: 2026-01-18*
*Total phases: 8 | Total plans: 30 | v1 requirements: 21 mapped*
