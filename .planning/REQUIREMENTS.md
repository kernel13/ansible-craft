# Requirements: Ansible Craft

**Defined:** 2026-01-21
**Core Value:** Generate complete, production-ready Ansible roles from natural language — FQCN compliant, idempotent, ansible-lint passing

## v1.1 Requirements

Requirements for Plan Mode milestone. Each maps to roadmap phases.

### Role Wizard

- [x] **RWIZ-01**: User sees step-by-step prompts with progress indicator (Step 1 of N)
- [x] **RWIZ-02**: User can select role structure directories (tasks, handlers, templates, files, defaults, vars, meta)
- [x] **RWIZ-03**: User can select target platforms (Ubuntu, RHEL, Debian, Windows, Generic)
- [x] **RWIZ-04**: User can select handlers needed (restart, reload, enable, custom)
- [x] **RWIZ-05**: User can skip wizard with --quick flag and use defaults
- [x] **RWIZ-06**: User can exit wizard with Ctrl+C (uses defaults or cancels)

### Playbook Wizard

- [x] **PWIZ-01**: User sees step-by-step prompts for playbook generation
- [x] **PWIZ-02**: User can specify inventory groups to target
- [x] **PWIZ-03**: User can specify whether privilege escalation is needed
- [x] **PWIZ-04**: User can specify whether to include handlers

### Defaults

- [ ] **DFLT-01**: User is asked at end of wizard whether to save choices as defaults
- [ ] **DFLT-02**: Saved defaults are stored in config file

### Integration

- [x] **INTG-01**: Wizard context is passed to AI generation for tailored output
- [x] **INTG-02**: Existing --no-interactive flag bypasses wizard completely

## Future Requirements

Deferred to later milestones. Tracked but not in current roadmap.

### Advanced Wizard Features

- **AWIZ-01**: Conditional prompts (only show handler questions if handlers directory selected)
- **AWIZ-02**: Wizard profiles (--profile=minimal, --profile=full)
- **AWIZ-03**: Load saved defaults on next run
- **AWIZ-04**: Multi-play wizard for playbooks

### Context Detection

- **CTXT-01**: Auto-detect existing project structure and suggest defaults
- **CTXT-02**: AI-assisted default values based on description analysis

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Nested wizards | Confusing UX, hard to track state |
| More than 7 prompts per wizard | Research shows >7 causes abandonment |
| Mandatory wizard | Power users need --quick bypass |
| Variable collection wizard | Let AI infer from description for now |
| GUI-style forms | Terminal limitations, sequential prompts better |
| Undo/back navigation | Medium complexity, defer to v1.2+ |
| Import existing role | High complexity, defer to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| RWIZ-01 | Phase 10: Role Wizard | Complete |
| RWIZ-02 | Phase 10: Role Wizard | Complete |
| RWIZ-03 | Phase 10: Role Wizard | Complete |
| RWIZ-04 | Phase 10: Role Wizard | Complete |
| RWIZ-05 | Phase 12: CLI Integration | Complete |
| RWIZ-06 | Phase 10: Role Wizard | Complete |
| PWIZ-01 | Phase 11: Playbook Wizard | Complete |
| PWIZ-02 | Phase 11: Playbook Wizard | Complete |
| PWIZ-03 | Phase 11: Playbook Wizard | Complete |
| PWIZ-04 | Phase 11: Playbook Wizard | Complete |
| DFLT-01 | Phase 13: Defaults Management | Pending |
| DFLT-02 | Phase 13: Defaults Management | Pending |
| INTG-01 | Phase 12: CLI Integration | Complete |
| INTG-02 | Phase 12: CLI Integration | Complete |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 14
- Unmapped: 0

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-22 — Phase 12 requirements complete (RWIZ-05, INTG-01, INTG-02)*
