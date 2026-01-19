# Phase 6: Quality Assurance - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate generated code with ansible-lint, show real-time generation progress via streaming output, and provide dry-run preview before writing files. Auto-fix common lint violations. This phase adds quality gates and UX improvements to existing generation commands — no new generation capabilities.

</domain>

<decisions>
## Implementation Decisions

### Lint Integration
- Run ansible-lint **twice**: once on generated content before writing, once after writing files
- **Errors block** file writing; warnings pass through with display
- Display violations **grouped by file** with line numbers and rule IDs
- Claude's discretion: whether to require pre-installed ansible-lint or offer auto-install

### Progress Display
- Show **phase names** during generation (e.g., "Planning role structure...", "Generating tasks...")
- Include **spinner animation** for visual feedback
- Show **elapsed time** during generation
- Use **progressive log** style — new lines appear as phases complete
- Support **--quiet flag** for CI/scripted usage (suppress progress, show only errors and final result)
- On failure: show **clear error with context** — which phase failed and why

### Dry-Run Preview
- Display **full file contents** of what would be written
- Apply **YAML syntax highlighting** for readability
- **Run lint validation** even in dry-run mode — user sees what issues would exist
- After preview, **prompt to proceed**: "Write these files? [y/N]"

### Auto-Fix Behavior
- Default behavior: **prompt before fixing** — show violations, ask "Auto-fix these issues? [y/N]"
- Support **--fix flag** to auto-apply fixes without prompting
- Auto-fixable issue types:
  - FQCN corrections (e.g., `apt` → `ansible.builtin.apt`)
  - Formatting fixes (indentation, trailing whitespace, line length)
  - Naming conventions (task names, variable names)
  - Missing metadata (meta/main.yml fields, README sections)
- For unfixable issues: provide **detailed suggestions with code examples** of correct approach

### Claude's Discretion
- ansible-lint installation/detection strategy
- Exact spinner implementation and colors
- Line length thresholds for formatting fixes
- Error message formatting details

</decisions>

<specifics>
## Specific Ideas

- Progressive log style preferred over single updating line — user can see history of what happened
- Syntax highlighting makes YAML preview much more readable in terminal
- The --fix flag behavior: applies ALL auto-fixable issues without prompts (for scripted usage)
- Default (no flags) prompts for each fix category — user stays in control

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-quality-assurance*
*Context gathered: 2026-01-19*
