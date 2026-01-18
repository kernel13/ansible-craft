# Phase 2: Configuration - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can configure the CLI with API key and persistent preferences. This includes:
- Reading ANTHROPIC_API_KEY from environment variable
- Reading defaults from config file
- Saving preferences via config save command
- Graceful failure with clear messages when API key is missing

Out of scope: API calls themselves (Phase 3), model selection logic beyond storage (Phase 4+).

</domain>

<decisions>
## Implementation Decisions

### Config file format
- **Location:** `~/.ansible-craft/config.toml` (home directory, not XDG)
- **Structure:** Grouped by domain using TOML sections
  - `[api]` for credentials
  - `[defaults]` for model preferences
  - `[output]` for format preferences
- **Settings stored:** API key, default model (sonnet/opus), complex flag default, output format defaults (JSON, verbose, dry-run)
- **Comments:** Include explanatory comments with examples for each setting

### API key handling
- **Precedence:** Error on conflict if both env var and config file have different API keys
- **Validation:** Make a lightweight API call to verify key works (not just format check)
- **Missing key message:** Multi-line guided setup explaining where to get key, both storage options, and link to docs
- **Security:** Always mask key in all output (sk-ant-***...***), even in verbose mode

### Save command UX
- **Command:** `ansible-craft config save`
- **Modes:** Interactive prompts by default, flag-based for scripting (`--api-key=xxx --model=sonnet`)
- **Existing config:** Merge specified values into existing config, but ask for confirmation before writing
- **Validation:** Validate API key against API before saving
- **Success output:** Show path + summary list of settings saved

### Missing config behavior
- **First run:** Offer to run interactive config save wizard automatically
- **Help/version:** Always work without any config (no errors, no warnings)
- **Partial config:** Require complete config — error if any required setting is missing
- **Directory creation:** Auto-create `~/.ansible-craft/` with informational message

### Claude's Discretion
- TOML library choice
- Exact error message wording (following patterns established)
- Config file permissions (0600 recommended for security)
- Interactive prompt styling and colors

</decisions>

<specifics>
## Specific Ideas

- Config should feel like a standard CLI tool (kubectl, gh, terraform patterns)
- Validation API call should be lightweight — just verify credentials work, don't burn tokens
- Merge with confirmation strikes balance between safety and not being annoying

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-configuration*
*Context gathered: 2026-01-18*
