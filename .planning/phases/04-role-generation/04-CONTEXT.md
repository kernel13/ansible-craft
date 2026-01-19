# Phase 4: Role Generation - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate complete Ansible roles from natural language descriptions. Users run `ansible-craft new role "description"` and get a production-ready role with proper structure, FQCN compliance, and idempotent tasks.

</domain>

<decisions>
## Implementation Decisions

### Prompt Input
- Natural language description as primary input
- AI asks 3-5 clarifying questions to fill gaps
- Questions cover both technical details (OS, package manager) and intent (service behavior, SSL source)
- `--no-interactive` flag skips questions — AI uses reasonable defaults
- Questions are contextual based on what the AI detects as ambiguous

### Plan Preview
- Before generation, show detailed breakdown of what will be created
- List each task name, variable, template, handler — full inventory
- User can Accept, Modify (provide feedback), or Reject
- Modifications trigger re-planning — unlimited rounds until user says "proceed"
- This is the approval gate before any code generation

### Output Structure
- Full role structure always generated: tasks/, handlers/, defaults/, vars/, templates/, files/, meta/, README.md
- Even empty directories are created for consistency
- molecule/ test scaffold always included
- YAML follows ansible-lint best practices: named tasks, consistent spacing, inline documentation
- README.md is Galaxy-ready: comprehensive with dependencies, platforms, tags, all variables documented, CI badges placeholder

### Generation Feedback
- Stream full generated content as it's created — user sees actual YAML being written
- After completion, display tree view of the generated role structure
- No token usage or stats shown — keep output focused on content

### File Writing
- Default: create role in current working directory (`./role-name/`)
- `--output` flag to specify custom directory
- `--name` flag to set role name, otherwise infer from prompt
- `--dry-run` option to preview without writing files
- If role directory exists: prompt user "Overwrite? [y/N]"
- `--force` flag to overwrite without prompting

### Claude's Discretion
- Exact clarifying questions to ask based on prompt analysis
- How to infer role name from natural language
- YAML formatting details within ansible-lint guidelines
- Template content and Jinja2 patterns
- Molecule test scenario design

</decisions>

<specifics>
## Specific Ideas

- Plan preview is a first-class feature — no code generation without user approval
- Streaming shows the "magic" of AI generation, not just a spinner
- Galaxy-ready README means users could publish immediately if they wanted

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-role-generation*
*Context gathered: 2026-01-19*
