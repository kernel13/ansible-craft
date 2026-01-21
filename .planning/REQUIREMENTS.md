# Requirements: Ansible Craft

**Defined:** 2026-01-21
**Core Value:** Generate complete, production-ready Ansible roles from natural language — FQCN compliant, idempotent, ansible-lint passing

## v1.1 Requirements

Requirements for Plan Mode milestone. Each maps to roadmap phases.

### Role Wizard

- [ ] **RWIZ-01**: User sees step-by-step prompts with progress indicator (Step 1 of N)
- [ ] **RWIZ-02**: User can select role structure directories (tasks, handlers, templates, files, defaults, vars, meta)
- [ ] **RWIZ-03**: User can select target platforms (Ubuntu, RHEL, Debian, Windows, Generic)
- [ ] **RWIZ-04**: User can select handlers needed (restart, reload, enable, custom)
- [ ] **RWIZ-05**: User can skip wizard with --quick flag and use defaults
- [ ] **RWIZ-06**: User can exit wizard with Ctrl+C (uses defaults or cancels)

### Playbook Wizard

- [ ] **PWIZ-01**: User sees step-by-step prompts for playbook generation
- [ ] **PWIZ-02**: User can specify inventory groups to target
- [ ] **PWIZ-03**: User can specify whether privilege escalation is needed
- [ ] **PWIZ-04**: User can specify whether to include handlers

### Defaults

- [ ] **DFLT-01**: User is asked at end of wizard whether to save choices as defaults
- [ ] **DFLT-02**: Saved defaults are stored in config file

### Integration

- [ ] **INTG-01**: Wizard context is passed to AI generation for tailored output
- [ ] **INTG-02**: Existing --no-interactive flag bypasses wizard completely

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
| RWIZ-01 | TBD | Pending |
| RWIZ-02 | TBD | Pending |
| RWIZ-03 | TBD | Pending |
| RWIZ-04 | TBD | Pending |
| RWIZ-05 | TBD | Pending |
| RWIZ-06 | TBD | Pending |
| PWIZ-01 | TBD | Pending |
| PWIZ-02 | TBD | Pending |
| PWIZ-03 | TBD | Pending |
| PWIZ-04 | TBD | Pending |
| DFLT-01 | TBD | Pending |
| DFLT-02 | TBD | Pending |
| INTG-01 | TBD | Pending |
| INTG-02 | TBD | Pending |

**Coverage:**
- v1.1 requirements: 14 total
- Mapped to phases: 0
- Unmapped: 14

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after initial definition*
