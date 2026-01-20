# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2025-01-18)

**Core value:** Generate complete, production-ready Ansible roles from natural language — FQCN compliant, idempotent, ansible-lint passing
**Current focus:** Phase 6 - Quality Assurance (VERIFIED COMPLETE)

## Current Position

Phase: 7 of 8 (Error Commands)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-01-20 — Completed 07-02-PLAN.md

Progress: [██████████████████░░] ~77%

## Performance Metrics

**Velocity:**
- Total plans completed: 25
- Average duration: ~3.1 minutes
- Total execution time: ~78 minutes

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 3/3 | ~12min | ~4min |
| 02-configuration | 3/3 | ~11min | ~4min |
| 03-ai-integration | 3/3 | ~7min | ~2min |
| 04-role-generation | 5/5 | ~17min | ~3.5min |
| 05-playbook-generation | 4/4 | ~15min | ~4min |
| 06-quality-assurance | 5/5 | ~11min | ~2min |
| 07-error-commands | 2/4 | ~5min | ~2.5min |

**Recent Trend:**
- Last 5 plans: 06-03 (~2min), 06-04 (~2min), 06-05 (~3min), 07-01 (~3min), 07-02 (~2min)
- Trend: Consistent ~2-3min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Standalone CLI before backend — ship value fast, validate with real users
- [Init]: User provides own API key — no backend needed for v1
- [Init]: Bun over Node — faster builds, modern tooling
- [01-01-01]: Node shebang for npm compatibility — Bun still executes fast
- [01-01-02]: Single-quote style — modern TypeScript convention
- [01-01-03]: 2-space indentation — standard for TS/JS
- [01-02-01]: Custom Help class over configuring built-in — better section control
- [01-02-02]: handleSpecialFlags before parseAsync — custom version display
- [01-02-03]: handleNoArguments after parseAsync — show help when no args
- [01-03-01]: formatError for inline Commander errors — simpler output
- [01-03-02]: exitOverride for help/version — exit 0 for non-errors
- [01-03-03]: showHelpAfterError — guide users to help on error
- [02-01-01]: smol-toml for TOML parsing — lightweight, modern ESM library
- [02-01-02]: Env var takes precedence over config file — common CLI pattern
- [02-01-03]: Error on API key conflict — both sources have different values
- [02-02-01]: Token counting endpoint for validation — no token consumption
- [02-02-02]: Mask pattern sk-ant-api0***...***xxxx — shows enough for identification
- [02-02-03]: requireApiKey returns null vs throwing — allows graceful handling
- [02-03-01]: Individual @inquirer imports — tree-shaking optimization
- [02-03-02]: Template-based TOML generation — preserves inline comments
- [02-03-03]: Deep merge config updates — preserves existing values
- [02-03-04]: File permissions 0o600 — API key security
- [03-01-01]: Pinned model claude-sonnet-4-5-20250929 — reproducibility
- [03-01-02]: 3 retries default with noRetry option — fail-fast support
- [03-01-03]: 2-minute timeout default — long generation support
- [03-02-01]: GitHub repo URL for error docs — no separate docs site yet
- [03-02-02]: Match boxen styling from config/errors.ts — consistency
- [03-02-03]: 2-minute max wait time for rate limits — reasonable upper bound
- [03-02-04]: 30s default when Retry-After header missing — common practice
- [03-03-01]: Spinner on stderr — keep stdout clean for piping
- [03-03-02]: Dots spinner with cyan color — professional CLI aesthetics
- [03-03-03]: Newline before error if partial output — clean error display
- [03-03-04]: import type for Anthropic — SDK used only for type annotations
- [04-01-01]: 27 FQCN examples in system prompt — comprehensive coverage
- [04-01-02]: File markers === PATH: / === END === — simple parsing format
- [04-01-03]: additionalProperties: false in schema — strict validation
- [04-02-01]: yaml package for YAML parsing — lightweight, well-maintained
- [04-02-02]: File marker format === PATH: ... === — parsing generated output
- [04-02-03]: FQCN and idempotency checks are warnings, not errors
- [04-02-04]: .gitkeep files for templates/ and files/ directories
- [04-03-01]: output_format with schema (not response_format) — SDK uses output_format param
- [04-03-02]: 8192 max tokens for code generation — large roles need more tokens
- [04-03-03]: Warn on fewer files than expected — non-blocking feedback
- [04-04-01]: YAMLParseError for line/column extraction — precise error locations
- [04-04-02]: YAML errors are blocking, FQCN/idempotency are warnings — quality guidance without blocking
- [04-04-03]: Check args: key for command idempotency — Ansible supports both inline and args
- [04-05-01]: Confirm prompt for existing directory — safe default prevents data loss
- [04-05-02]: Accept/Modify/Reject workflow for plan — user control over generation
- [04-05-03]: Show next steps after generation — guide to ansible-lint and molecule test
- [05-01-01]: has_pre_tasks/has_post_tasks as required booleans — ensures AI considers these
- [05-01-02]: PLAYBOOK_DIRECTORIES only includes group_vars — simpler than roles
- [05-01-03]: inferPlaybookName returns 'playbook' as fallback — consistent with role pattern
- [05-02-01]: Local PlaybookPlanPreview type in generate prompt — schema module not yet created
- [05-02-02]: FQCN section copied verbatim from role system prompt — same 27 modules apply
- [05-02-03]: Export PlaybookPlanPreview type from prompts/index.ts — downstream access
- [05-03-01]: Detect plays via 'hosts' key — distinguishes plays from tasks in idempotency checker
- [05-03-02]: Check pre_tasks and post_tasks in idempotency checker — complete coverage of play task sections
- [05-03-03]: Expected minimum files = 4 + non-all groups — playbook.yml + inventory.example + group_vars/all.yml + README.md plus per-group vars
- [05-04-01]: Reuse sanitizeRoleName for playbook names — same validation rules apply
- [05-04-02]: Wildcard export for writer.js — all functions automatically exported
- [06-01-01]: Bun.spawn over child_process — consistent with project patterns
- [06-01-02]: SARIF format for ansible-lint output — machine-readable, version-stable
- [06-01-03]: Defensive JSON parsing — graceful fallbacks for invalid/missing data
- [06-02-01]: Use stopAndPersist over stop() — persistent log lines showing completed phases
- [06-02-02]: Elapsed time in dim color — visual hierarchy keeps focus on phase name
- [06-02-03]: No-op tracker for quiet mode — same interface, all methods empty functions
- [06-03-01]: Detect language by file extension for highlighting — yaml, md, json, sh, py
- [06-03-02]: Group lint violations by file for readability — Map<file, violations[]>
- [06-03-03]: Default confirmation to false for safety — user must explicitly approve writes
- [06-04-01]: FQCN_MAP duplicated from fqcn-checker.ts — avoids circular import complexity
- [06-04-02]: Process violations in descending line order — prevents offset drift during multi-line fixes
- [06-04-03]: getSuggestion provides rule-specific examples — helpful guidance for manual fixes
- [06-05-01]: Pass quiet: true to inner functions when PhaseTracker handles progress
- [06-05-02]: Temp file approach for ansible-lint validation — lint requires files on disk
- [06-05-03]: Auto-fix confirmation default true — safe fixes encouraged
- [07-01-01]: inferFileType defaults to 'playbook' — sensible classification for standalone YAML files
- [07-01-02]: Task context ±5 lines or full task if >15 lines — balances context with token efficiency
- [07-01-03]: Confidence threshold 2+ uncertainty markers — detects hedging effectively
- [07-01-04]: Higher threshold (4+) with certainty language — prevents false positives
- [07-01-05]: Multiple error format patterns — handles Ansible error diversity across versions
- [07-02-01]: EXPLAIN_SYSTEM_PROMPT enforces 6 structured sections — Purpose, Tasks, Variables, Dependencies, Issues, Role Structure
- [07-02-02]: FIX_SYSTEM_PROMPT requires corrected YAML in extractable code blocks — enables automated fix application
- [07-02-03]: Temporary ContextExtraction interface in prompts — will update import when 07-01 completes
- [07-02-04]: OPUS_MODEL uses claude-opus-4-5-20251101 — complex analysis option
- [07-02-05]: selectModel returns {model, confirmed} — signals user cancellation vs silent fallback

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-01-20
Stopped at: Completed 07-02-PLAN.md
Resume file: None
Next: 07-03 (Explain command) or 07-04 (Fix command)

---
*State initialized: 2025-01-18*
*Last updated: 2026-01-20*
