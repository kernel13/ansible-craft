# Phase 8: Publishing - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Publish ansible-craft to npm and provide professional CLI UX features. Package is installable via `npm install -g ansible-craft` and works via npx/bunx/pnpx without global install. Shell completions for bash, zsh, and fish. JSON output mode for machine-readable results.

</domain>

<decisions>
## Implementation Decisions

### Package identity
- Unscoped package name: `ansible-craft` (no @org/ prefix)
- MIT license
- Keywords covering both domains: ansible, automation, infrastructure, devops, configuration, ai, claude, code-generation, llm, anthropic
- Self-contained README with full quick-start guide, usage examples, and feature list

### Shell completions
- Tab-only completion trigger (standard behavior)
- Complete subcommands (new, explain, fix, config) and flags (--help, --dry-run, etc.)
- Manual installation via command: `ansible-craft completions bash >> ~/.bashrc` (or zsh/fish equivalent)
- Include descriptions next to completions where shell supports them (zsh, fish)

### JSON output mode
- Support --json flag on generation commands only (`new role`, `new playbook`)
- JSON structure includes: list of created files, lint warnings, success/failure status
- Structured error format: `{"error": {"code": "...", "message": "...", "details": {...}}}`
- JSON output to stdout, spinners/progress to stderr — pipe-friendly design

### npx/bunx experience
- First run without config: warn user to run config command, display the command to run
- Version check requires full package download (standard npx behavior)
- No behavioral difference between global install and npx/bunx execution
- Explicitly support and test: npx, bunx, pnpx (all major package runners)

### Claude's Discretion
- Exact package.json structure and fields
- ESM/CJS dual publishing approach
- Completion script implementation details
- Error code naming conventions

</decisions>

<specifics>
## Specific Ideas

- Package should feel professional and discoverable on npm
- Completions should work out-of-the-box after simple manual setup
- JSON mode enables CI/CD integration and scripting
- Same experience whether user installs globally or runs via npx

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-publishing*
*Context gathered: 2026-01-21*
