# Phase 12: CLI Integration - Context

**Gathered:** 2026-01-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Wire wizard system into CLI with bypass options for power users and non-interactive environments. Users can skip wizard with --quick flag, and non-TTY environments auto-skip. Wizard context is passed to AI generation through a temp file.

</domain>

<decisions>
## Implementation Decisions

### Flag behavior
- Wizard is **opt-out** (runs by default, --quick skips it)
- --quick and --no-interactive are **aliases** (same behavior, different discoverability)
- --quick skips wizard entirely, goes straight to generation with no context
- If both --plan and --quick are passed, **--plan wins silently** (wizard runs)

### TTY detection
- **Lazy detection** — check TTY status when wizard is about to start
- Non-TTY environments **silently skip** wizard (no message, proceed with defaults)
- If user explicitly passes --plan but stdin is not TTY → **error and exit** with clear message
- No alternative input methods for non-TTY (no JSON config, no CLI flags for wizard answers)

### Context passing
- Wizard generates a **temp file** with structured context
- File format: Claude's discretion (YAML or JSON based on ecosystem fit)
- File auto-deleted after generation completes
- Context is **hidden from user** (not shown in CLI output)
- No --context flag to provide external context file

### Existing workflow integration
- Wizard runs **before plan generation**: Wizard → Plan preview → Accept/Modify → Generate
- --yes flag **only affects plan preview** (wizard still runs unless --quick)
- Wizard applies to **both 'new role' and 'new playbook'** commands
- Wizard cancellation (Ctrl+C) **aborts entirely** with clean exit message

### Claude's Discretion
- Temp file format choice (YAML vs JSON)
- Exact error message wording for TTY conflicts
- Internal implementation of context passing to prompt

</decisions>

<specifics>
## Specific Ideas

- Keep wizard invisible to user — context passes silently to AI
- Wizard should feel like a natural extension, not a separate step that users notice

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-cli-integration*
*Context gathered: 2026-01-22*
