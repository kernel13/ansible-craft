# Phase 7: Error Commands - Context

**Gathered:** 2026-01-20
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI commands that help users understand existing Ansible code and fix errors. Two commands:
- `ansible-craft explain <path>` — plain-English explanation of Ansible files/roles
- `ansible-craft fix "<error>"` — interpret Ansible errors and provide fix suggestions

Context awareness via `--playbook` flag. Model selection via `--complex` flag for Claude Opus.

</domain>

<decisions>
## Implementation Decisions

### Explain command output
- Full breakdown: purpose, each task explained, variables used, dependencies, potential issues
- Structured sections format with clear headings (Purpose, Tasks, Variables, Handlers, etc.)
- Works on both single files AND directories (roles) — `explain my-role/` explains the whole role structure
- Always flag issues proactively (non-FQCN, non-idempotent tasks) alongside explanation

### Fix command workflow
- Input method: quoted argument only — `ansible-craft fix "FAILED! => {...}"`
- Output includes: explanation of why it failed + corrected YAML code
- Prompt to apply fix: show fix, then ask "Apply this fix? [y/N]" with file path
- Incomplete errors: best effort analysis with what's provided, note limitations in output

### Context awareness (--playbook)
- Smart extraction: extract relevant vars, handlers, and the failing task's surroundings (not full file dump)
- Accepts both files and directories — `--playbook my-role/` reads role structure for context
- No auto-detection: only use context when explicitly provided via flag
- Same `--playbook` flag works on both explain and fix commands

### Model selection (--complex)
- Auto-suggest: if Sonnet's response shows uncertainty/hedging, suggest "Try --complex for this one"
- Works on both explain and fix commands
- Trigger for suggestion: low confidence markers in Sonnet's response
- Always show cost warning: "Using Claude Opus (higher cost). Continue? [Y/n]"

### Claude's Discretion
- Exact section structure for different file types (tasks vs handlers vs playbooks)
- How to format the corrected code output
- What constitutes "low confidence" for --complex suggestion
- Smart extraction algorithm for --playbook context

</decisions>

<specifics>
## Specific Ideas

- Explain output should be scannable — clear headings let users jump to what they need
- Fix command is the "killer differentiator" — cryptic Ansible errors are a major pain point
- The --playbook context should help with variable scoping issues (one of the top complaints)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-error-commands*
*Context gathered: 2026-01-20*
