# Phase 13: Defaults Management - Context

**Gathered:** 2026-01-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Users save wizard choices as reusable defaults for future sessions. When `--quick` flag is used, saved defaults are applied automatically. Supports both role and playbook wizards with separate default configurations. Project-level overrides allow per-project customization while maintaining global defaults.

</domain>

<decisions>
## Implementation Decisions

### Save Prompt Timing
- **Prompt after successful generation**: Only ask "Save as defaults?" when AI generation completes successfully
- **Intelligent prompting**: Only prompt when user's choices differ from existing defaults (not every time)
- **Skip on failure**: Don't prompt to save if generation fails — choices may be invalid
- **Show preview before saving**: Display which values will be saved, then ask for confirmation

### Default Granularity
- **Separate role and playbook defaults**: Independent default sets for role wizard vs playbook wizard
- **Interactive partial overrides**: Users can selectively override specific fields while keeping other defaults
- **Best-effort version compatibility**: Load available defaults, skip unknown fields, prompt for new required fields when schema changes
- **Project-level overrides**: Support `.ansible-craft.toml` in project directories to override global defaults from `~/.config/ansible-craft/config.toml`

### Storage Format
- **Nested TOML sections**: Use `[defaults.role]` and `[defaults.playbook]` structure (Claude's discretion for exact schema)
- **Schema versioning**: Include `defaults_version = 1` field to track schema changes and enable migration
- **Native TOML arrays**: Use `platforms = ["ubuntu", "rhel"]` syntax for array values
- **Auto-generated comments**: Include metadata like `# Saved: 2026-01-23`, `# Last used: role generation`

### Quick Mode Behavior
- **Fallback strategy**: Claude determines best behavior when `--quick` used without defaults (could be interactive fallback, hard-coded defaults, or error with guidance)
- **Silent application**: Apply defaults without showing summary (visible only in `--verbose` mode)
- **Allow selective prompts**: `--quick` can trigger interactive prompts for fields needing updates (supports partial override decision)
- **Config command for updates**: Add `ansible-craft config defaults [role|playbook]` command to update defaults without generation

### Claude's Discretion
- Exact TOML schema structure (mirroring WizardContext interface appropriately)
- Specific fallback behavior when `--quick` finds no defaults
- Config file parser and writer implementation
- Migration logic for schema version changes
- Error messages and user guidance for config issues

</decisions>

<specifics>
## Specific Ideas

- **Save flow**: Generation succeeds → Show preview of values to save → User confirms → Write to config
- **Diff detection**: Compare wizard answers against existing defaults to trigger selective save prompt
- **Project hierarchy**: Check `./.ansible-craft.toml` first, fall back to `~/.config/ansible-craft/config.toml`
- **Config command**: Standalone way to edit defaults without running full generation workflow

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 13-defaults-management*
*Context gathered: 2026-01-23*
