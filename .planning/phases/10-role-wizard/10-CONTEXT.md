# Phase 10: Role Wizard - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Interactive prompts for role structure, platforms, and handlers. Users customize role generation through step-by-step wizard before AI generation begins. Uses existing @inquirer/prompts dependency and WizardContext types from Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Step flow & pacing
- Linear progression (Step 1 → 2 → 3 → 4)
- Progress bar showing completion percentage
- Back option available at each step to revise previous answers
- Tab-style headers with title for each step

### Option presentation
- Checkbox list for multi-select questions (space to toggle)
- Arrow key navigation for single-select questions
- No final confirmation screen — start generation immediately after last step
- Green for success/selection hints, cyan for prompts (match existing CLI style)

### Directory selection
- Full standard set: tasks, handlers, templates, files, vars, defaults, meta, tests, library, module_utils, lookup_plugins
- `tasks` directory is pre-checked and required (cannot be unchecked)
- No preset combinations — always show full directory list
- Display format: name + hint (e.g., "handlers - service restart/reload actions")

### Platform selection
- Multi-select (role can target multiple platforms)
- Expanded platform set: Ubuntu, Debian, RHEL/CentOS, Amazon Linux, Alpine, Arch, macOS, Windows
- Generic option at bottom of list ("Generic - no platform-specific tasks")
- Generic is mutually exclusive with specific platforms — selecting Generic unselects all others

### Claude's Discretion
- Exact progress bar implementation details
- Keyboard shortcut hints in prompts
- Error message wording for invalid selections
- Handler selection question wording and options (not discussed, part of phase scope)

</decisions>

<specifics>
## Specific Ideas

- Progress bar visual (not just "Step 2 of 4" counter)
- Directory hints help users understand what each directory is for
- Generic platform option allows creating platform-agnostic roles

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-role-wizard*
*Context gathered: 2026-01-21*
