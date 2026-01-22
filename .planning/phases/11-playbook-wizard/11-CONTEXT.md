# Phase 11: Playbook Wizard - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive prompts for playbook generation — target hosts, privilege escalation, and handler configuration. Users can customize playbook generation through step-by-step prompts. This shares no code with the role wizard (independent implementation).

</domain>

<decisions>
## Implementation Decisions

### Host Targeting
- Free text input for host patterns (user types any valid Ansible pattern)
- Multiple groups allowed — comma-separated or Ansible patterns like 'web*:&staging'
- Basic format validation — warn on empty or obviously invalid patterns (special chars)
- **Required input** — no default value, user must specify hosts (prevents accidental 'all' targeting)

### Privilege Escalation
- Yes/No prompt for become, with optional become_user follow-up
- Default: **no** (safer default — user opts into privilege)
- When become=yes: show become_user prompt with hint 'become_user (default: root):'
- Enter skips become_user (defaults to root)
- Basic validation for become_user — warn on empty or obviously invalid input

### Handler Inclusion
- Free text description input — user describes handlers needed
- Example placeholder: 'Handlers (e.g., restart nginx, reload config):'
- **Optional** — user can press Enter to skip (no handlers generated)
- Warn on suspicious input — flag if looks like YAML/code instead of description

### Wizard Flow
- **3 steps**: hosts → become → handlers
- Progress indicator: 'Step 1 of 3' format (consistent with role wizard UX)
- **Independent implementation** — separate prompts module, no shared code with role wizard
- Ctrl+C: clean exit with 'Wizard cancelled' message (same as role wizard)

### Claude's Discretion
- Exact prompt wording and help text
- Input parsing strategy for multi-group patterns
- YAML/code detection heuristics for handler validation

</decisions>

<specifics>
## Specific Ideas

- Host input should feel like Ansible inventory patterns — familiar to Ansible users
- Handlers described in natural language, not YAML — AI interprets intent
- 3-step flow keeps it quick while capturing essential playbook configuration

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-playbook-wizard*
*Context gathered: 2026-01-22*
