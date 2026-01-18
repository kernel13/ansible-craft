# Requirements: Ansible Craft

**Defined:** 2025-01-18
**Core Value:** Generate complete, production-ready Ansible roles from natural language — FQCN compliant, idempotent, ansible-lint passing

## v1 Requirements

Requirements for initial CLI release. Each maps to roadmap phases.

### CLI Framework

- [x] **CLI-01**: CLI displays help with usage examples when invoked with --help or no arguments
- [x] **CLI-02**: CLI displays version when invoked with --version
- [x] **CLI-03**: CLI exits with code 0 on success, code 1 on error
- [x] **CLI-04**: CLI reads defaults from config file (~/.ansible-craft/config.toml)
- [ ] **CLI-05**: CLI provides shell completions for bash, zsh, and fish
- [ ] **CLI-06**: CLI supports --json flag for machine-readable output

### Generation Commands

- [ ] **GEN-01**: User can generate complete Ansible role from natural language description via `new role "description"`
- [ ] **GEN-02**: User can generate Ansible playbook from natural language description via `new playbook "description"`
- [ ] **GEN-03**: User sees generation progress in real-time via streaming output
- [ ] **GEN-04**: User can preview what will be created before writing via --dry-run flag

### Code Quality

- [ ] **QUAL-01**: Generated YAML is valid and parseable by standard YAML parsers
- [ ] **QUAL-02**: Generated roles include proper structure (tasks/, handlers/, defaults/, templates/, meta/, README.md)
- [ ] **QUAL-03**: Generated code uses Fully Qualified Collection Names (ansible.builtin.*)
- [ ] **QUAL-04**: Generated tasks are idempotent (safe to run multiple times)
- [ ] **QUAL-05**: Generated code passes ansible-lint validation before output

### Error Commands

- [ ] **ERR-01**: User can get plain-English explanation of Ansible code via `explain path/to/file.yml`
- [ ] **ERR-02**: User can get error interpretation and fix suggestions via `fix "error message"`
- [ ] **ERR-03**: fix command accepts --playbook flag to provide context from related playbook

### Configuration

- [x] **CFG-01**: CLI reads API key from ANTHROPIC_API_KEY environment variable
- [x] **CFG-02**: User can save default preferences to config file
- [ ] **CFG-03**: User can select Opus model for complex tasks via --complex flag

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Web Integration

- **WEB-01**: User can authenticate CLI with web account
- **WEB-02**: User can sync templates between CLI and web
- **WEB-03**: User can view generation history on web

### Advanced Generation

- **ADV-01**: User can generate Molecule test scaffolding via `test` command
- **ADV-02**: User can generate Jinja2 templates via `template` command
- **ADV-03**: CLI reads existing codebase for context-aware generation
- **ADV-04**: User can have multi-turn refinement conversations

### Enterprise

- **ENT-01**: CLI works with local/offline LLM
- **ENT-02**: CLI supports custom API endpoints

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Web application | Future milestone — validate CLI value first |
| Rails API backend | Not needed for standalone CLI |
| User accounts | Requires backend infrastructure |
| Billing/subscriptions | Requires backend and payment processing |
| Template library persistence | Requires backend storage |
| Team sharing | Requires backend and accounts |
| VS Code extension | Separate product — CLI first |
| MCP server mode | Advanced integration — defer to v2 |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 1: Foundation | Complete |
| CLI-02 | Phase 1: Foundation | Complete |
| CLI-03 | Phase 1: Foundation | Complete |
| CLI-04 | Phase 2: Configuration | Complete |
| CLI-05 | Phase 8: Publishing | Pending |
| CLI-06 | Phase 8: Publishing | Pending |
| GEN-01 | Phase 4: Role Generation | Pending |
| GEN-02 | Phase 5: Playbook Generation | Pending |
| GEN-03 | Phase 6: Quality Assurance | Pending |
| GEN-04 | Phase 6: Quality Assurance | Pending |
| QUAL-01 | Phase 4: Role Generation | Pending |
| QUAL-02 | Phase 4: Role Generation | Pending |
| QUAL-03 | Phase 4: Role Generation | Pending |
| QUAL-04 | Phase 4: Role Generation | Pending |
| QUAL-05 | Phase 6: Quality Assurance | Pending |
| ERR-01 | Phase 7: Error Commands | Pending |
| ERR-02 | Phase 7: Error Commands | Pending |
| ERR-03 | Phase 7: Error Commands | Pending |
| CFG-01 | Phase 2: Configuration | Complete |
| CFG-02 | Phase 2: Configuration | Complete |
| CFG-03 | Phase 7: Error Commands | Pending |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2025-01-18*
*Last updated: 2026-01-18 after Phase 2 completion*
