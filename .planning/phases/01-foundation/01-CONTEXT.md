# Phase 1: Foundation - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

CLI skeleton with help, version, and proper exit codes. Users can invoke `ansible-craft --help` and `ansible-craft --version` and get useful output. Errors go to stderr with code 1, success exits with code 0.

Configuration, API integration, and generation commands belong in later phases.

</domain>

<decisions>
## Implementation Decisions

### Help output style
- Commands grouped by category (Generation, Analysis, Config, etc.)
- Include 2-3 inline usage examples in help output
- Colored output with headers and highlights (respect NO_COLOR env var)
- Style inspired by gh (GitHub CLI) — clean, grouped, colored headers, brief descriptions

### Error messaging
- Friendly and helpful tone — "Couldn't find X. Try running Y."
- Always suggest fixes when possible — every error includes a suggested command or action
- Errors displayed in a bordered box/banner for visibility
- Stack traces available via --verbose flag for debugging
- Normal errors stay clean and user-friendly

### Command structure
- Generation pattern: `ansible-craft new <type>` (new role, new playbook)
- Common commands have short aliases (n = new, e = explain, etc.)
- Global flags support both short and long forms (-v/--verbose, -h/--help, -V/--version)
- CLI name is `ansible-craft` only — no shortened aliases like acraft or ac

### Version display
- Full environment info: version, runtime (Bun), OS, Node version
- Human readable multi-line format:
  ```
  ansible-craft version 1.0.0
  Runtime: bun 1.x.x
  OS: darwin-arm64
  ```
- Update check notification when newer version available (can be disabled in config)

### Claude's Discretion
- Git commit hash in dev builds (standard versioning practices)
- Exact color scheme and ANSI codes
- Help text line wrapping and terminal width handling
- Specific aliases for commands beyond the pattern established

</decisions>

<specifics>
## Specific Ideas

- "Style inspired by gh (GitHub CLI)" — clean, organized, colored headers, brief command descriptions
- Errors in bordered box for visibility — stands out from normal output
- Update checks can be disabled — respects user preference for offline operation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-18*
