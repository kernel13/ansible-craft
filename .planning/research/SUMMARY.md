# Project Research Summary

**Project:** Ansible Craft
**Domain:** TypeScript CLI with Claude AI integration for Ansible code generation
**Researched:** 2026-01-18
**Confidence:** HIGH

## Executive Summary

Ansible Craft is an AI-powered CLI tool that generates Ansible roles and playbooks from natural language descriptions. The recommended approach uses Bun as the runtime (native TypeScript, built-in .env support), Commander.js for CLI parsing, and the official Anthropic SDK for Claude integration. This stack eliminates several traditional dependencies while providing faster execution and simpler tooling.

The architecture follows a 6-layer design: CLI Layer (command parsing) -> Configuration Layer -> Application Layer (orchestration) -> AI Service Layer (Claude API) -> Generator Layer (Ansible output) -> Output Layer (file system). This separation ensures clean boundaries between concerns and enables testing at each layer. The build order must respect these dependencies, starting with types and config schemas before building up to CLI commands.

Key risks center on three areas: (1) Rate limiting cascade failures from Claude API 429 errors, (2) LLM output parsing fragility where AI-generated YAML has subtle errors, and (3) ESM/CJS module system compatibility for npm distribution. All three must be addressed in the foundation phase to avoid costly retrofits. The `fix` command (interpreting Ansible errors and generating fixes) is the killer differentiator that sets this apart from generic AI tools.

## Key Findings

### Recommended Stack

Bun 1.3.6+ provides native TypeScript execution, .env support, and fast package management, eliminating dotenv, ts-node, and reducing tooling complexity. Commander.js v14 is the standard for CLI parsing with first-class TypeScript support. The official Anthropic SDK v0.71.2 handles Claude API integration with streaming support essential for long code generation operations.

**Core technologies:**
- **Bun ^1.3.6**: Runtime, bundler, package manager — native TS, fastest option, eliminates tooling
- **Commander.js ^14.0.2**: CLI framework — industry standard, TypeScript types, zero dependencies
- **@anthropic-ai/sdk ^0.71.2**: Claude API client — official SDK, streaming support, token tracking
- **Zod ^4.1.12**: Validation — TypeScript inference, zero deps, validates CLI input and AI responses
- **@inquirer/prompts ^7.x**: Interactive prompts — modern ESM rewrite of inquirer
- **Biome ^2.0**: Lint + format — replaces ESLint + Prettier, 10-25x faster

### Expected Features

**Must have (table stakes):**
- Natural language to Ansible code generation
- Valid YAML output with proper role structure (tasks/, handlers/, defaults/)
- FQCN module names (ansible.builtin.*)
- Clear error messages and progress indicators
- Configuration file support (~/.ansible-craft.yaml)
- Help/version commands, proper exit codes

**Should have (competitive):**
- `fix` command — parse Ansible errors and generate fixes (killer differentiator)
- ansible-lint integration — auto-validate before output
- Streaming output — real-time generation feedback
- Dry-run preview — show what will be created before writing
- Best practices enforcement — FQCN, naming conventions

**Defer (v2+):**
- Context-aware generation (reading existing codebase) — high complexity
- Offline/local LLM support — separate infrastructure
- Molecule test scaffolding — nice-to-have
- Interactive refinement sessions — needs conversation state

### Architecture Approach

The 6-layer architecture separates CLI concerns from AI integration and code generation. Each layer has clear boundaries and translates errors for the layer above. Services follow a consistent pattern: Input Validation -> AI Prompt Building -> Claude API Call -> Response Parsing -> Code Generation -> File Writing.

**Major components:**
1. **CLI Layer** (cli/commands/*.ts) — Command parsing, user interaction, fail-fast validation
2. **AI Service Layer** (ai/client.ts, ai/prompts/*) — Claude API wrapper, prompt templates, response parsing
3. **Generator Layer** (generators/role.ts) — Transform AI output to Ansible-compliant files, YAML validation
4. **Output Layer** (output/writer.ts) — File system operations, conflict handling, tree display

### Critical Pitfalls

1. **Rate Limiting Cascade (P1)** — Claude API 429 errors can cause 14+ retry cascades. Implement exponential backoff with jitter from day one, read retry-after headers, add request queuing.

2. **LLM Output Parsing Fragility (P2)** — AI-generated YAML fails parsing 20-40% of time without guardrails. Use Claude's structured outputs API, validate with Zod, implement repair logic for common issues.

3. **YAML/Jinja2 Template Corruption (P3)** — AI doesn't understand YAML whitespace sensitivity or Jinja2 quoting. Quote all `{{ variable }}` expressions, validate with ansible-lint, test edge cases.

4. **ESM/CJS Module System (P4)** — TypeScript publishing has ESM/CJS friction. Use tsup for dual publishing, proper package.json exports, test in both ESM and CJS projects in CI.

5. **Token Cost Explosion (P5)** — Context accumulation burns tokens exponentially. Track tokens per request, implement context windowing, cache common patterns (target >60% hit rate).

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation
**Rationale:** Core infrastructure must be correct from start — module system, rate limiting, TypeScript strictness are architectural decisions that are costly to retrofit
**Delivers:** Working CLI skeleton, config loading, Claude API client with proper error handling
**Addresses:** Basic CLI framework (help, version, config), API key management
**Avoids:** P4 (module system), P1 (rate limiting foundation), M3 (TypeScript any creep)

### Phase 2: Core Generation
**Rationale:** The primary value proposition — cannot ship without working code generation
**Delivers:** `new role` and `new playbook` commands that generate valid Ansible code
**Uses:** Anthropic SDK streaming, Zod validation, Handlebars templates
**Implements:** AI Service Layer, Generator Layer
**Avoids:** P2 (output parsing), P3 (YAML/Jinja2), M1 (FQCN)

### Phase 3: Validation & Quality
**Rationale:** Quality differentiates from generic AI tools — must validate before users see output
**Delivers:** ansible-lint integration, dry-run preview, proper progress indicators
**Addresses:** Streaming output, best practices enforcement, error messages
**Avoids:** M2 (silent progress), M4 (unhelpful errors), M5 (unvalidated output)

### Phase 4: Fix Command
**Rationale:** Killer differentiator — parse Ansible errors and generate fixes. Depends on solid generation pipeline
**Delivers:** `fix` command that interprets Ansible error output and suggests/generates fixes
**Uses:** Error pattern matching, context-aware generation
**Implements:** Fixer service, error interpretation logic

### Phase 5: Polish & Publishing
**Rationale:** Distribution quality — npm package must work in all environments
**Delivers:** Published npm package, shell completions, final documentation
**Addresses:** npm publishing, JSON output mode, quiet mode
**Avoids:** M6 (.npmignore issues), P4 (module system verification)

### Phase Ordering Rationale

- **Foundation first:** Module system and rate limiting are architectural — retrofitting causes rewrites
- **Generation before validation:** Can't validate what doesn't exist, but separation allows parallel work
- **Fix command late:** Requires solid generation pipeline and error pattern knowledge — high complexity
- **Publishing last:** Only publish when quality is verified, prevents reputation damage

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Core Generation):** Prompt engineering for Ansible-specific output requires iteration and testing
- **Phase 4 (Fix Command):** Ansible error pattern catalog needs research — limited documentation on programmatic error interpretation

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Well-documented Bun + Commander.js + Anthropic SDK patterns
- **Phase 3 (Validation):** ansible-lint has clear API, ora/progress are standard
- **Phase 5 (Publishing):** npm publishing is well-documented, straightforward

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official docs verified, versions confirmed, production-ready |
| Features | HIGH | Competitor analysis + market research, clear differentiation |
| Architecture | HIGH | Established CLI patterns, official SDK documentation |
| Pitfalls | HIGH | Multiple authoritative sources, real-world failure modes |

**Overall confidence:** HIGH

### Gaps to Address

- **Ansible error pattern catalog:** Limited documentation on Ansible error formats for `fix` command. Will need to build catalog during Phase 4 development through testing.
- **ansible-lint API stability:** Using subprocess call rather than programmatic API. May need adjustment if ansible-lint changes output format.
- **Multi-model support deferral:** v1 is Claude-only. Architecture should allow future OpenAI/local model support without rewrite.

## Sources

### Primary (HIGH confidence)
- [Bun Documentation](https://bun.sh/docs) — runtime, .env support, build
- [Anthropic SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript) — API patterns, streaming
- [Commander.js GitHub](https://github.com/tj/commander.js) — CLI patterns
- [Zod Documentation](https://zod.dev/) — validation patterns
- [Claude API Errors](https://platform.claude.com/docs/en/api/errors) — rate limiting, error handling
- [Ansible Lint Documentation](https://ansible-lint.readthedocs.io) — validation patterns

### Secondary (MEDIUM confidence)
- [TypeScript ESM/CJS Publishing 2025](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) — module system patterns
- [State of AI Code Quality 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/) — LLM output reliability
- [CLI UX Best Practices](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays) — progress display patterns

### Tertiary (LOW confidence)
- Ansible error pattern formats — needs validation through testing, limited programmatic documentation

---
*Research completed: 2026-01-18*
*Ready for roadmap: yes*
