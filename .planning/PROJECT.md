# Ansible Craft

## What This Is

An AI-powered CLI tool that generates production-ready Ansible roles and playbooks from natural language descriptions. Shipped v1.0 with complete generation pipeline, quality validation (FQCN, idempotency, ansible-lint), and error assistance commands. Targets DevOps engineers and sysadmins who spend hours writing boilerplate Ansible code — giving them correct syntax, best practices, and ansible-lint compliance in seconds.

Positioned in the gap between expensive enterprise solutions (Red Hat Ansible Lightspeed) and generic AI that lacks Ansible-specific knowledge.

## Core Value

Generate complete, production-ready Ansible roles from natural language descriptions — properly structured, FQCN compliant, idempotent, and passing ansible-lint.

## Requirements

### Validated

- **v1.0:** CLI can generate complete Ansible roles from natural language descriptions
- **v1.0:** CLI can generate Ansible playbooks from natural language descriptions
- **v1.0:** CLI can explain what existing Ansible code does
- **v1.0:** CLI can interpret Ansible errors and provide solutions with corrected code
- **v1.0:** Generated content uses Fully Qualified Collection Names (FQCN)
- **v1.0:** Generated content passes ansible-lint
- **v1.0:** Generated content is idempotent (safe to run multiple times)
- **v1.0:** Generated roles include proper structure (tasks, handlers, defaults, templates, meta, README)
- **v1.0:** CLI works standalone with user's Anthropic API key
- **v1.0:** CLI published to npm (bunx/npx compatible)

### Active

**v1.1 Plan Mode:**
- Interactive wizard flow for context gathering before generation
- Structured questions covering code organization, components, variable strategy
- Applies to both role and playbook generation
- Option to save choices as defaults for future sessions
- `--quick` flag to bypass wizard and use defaults

### Out of Scope

- Web application — future milestone after CLI validated
- Backend API — future milestone, not needed for standalone CLI
- User authentication/accounts — requires backend
- Billing/subscriptions — requires backend
- Template library — future feature requiring persistence
- Team features — requires backend and accounts
- Molecule test generation — may include basic scaffolding in v1.1 plan mode questions
- MCP server mode — defer to v2
- VS Code extension — defer to v2

## Context

**Current State (v1.0 shipped):**
- 8,170 lines of TypeScript source code
- 1,529 lines of test code (156 tests passing)
- Tech stack: TypeScript + Bun + Commander.js + Anthropic SDK
- Distribution: npm package (ESM-only, 132KB bundle)
- All 21 v1 requirements satisfied

**Market opportunity:**
- 37,396 companies using Ansible globally
- 35% are small companies (<$50M revenue) — primary target
- DevOps automation market: $12.54B (2024) → $72.81B (2032)
- CLI tools fit DevOps workflow better than web-only solutions

**Competitive gap:**
- Red Hat Ansible Lightspeed: Enterprise pricing, too expensive for individuals/small teams
- Generic AI (ChatGPT/Claude): No Ansible-specific knowledge, inconsistent output quality
- Steampunk Spotter: Linting only, no generation

**Pain points addressed:**
- Jinja2 templating complexity (33.1% of Ansible complaints)
- YAML quoting issues (22.4%)
- Variable scoping confusion (20.4%)
- Cryptic error messages
- Boilerplate repetition

## Constraints

- **Tech stack**: TypeScript + Bun + Commander — fast builds, modern tooling
- **Distribution**: npm package — universal access via bunx/npx/pnpx
- **AI provider**: Claude API (Anthropic) — best code generation quality
- **Default model**: Claude Sonnet — balance of quality and cost
- **Complex tasks**: Claude Opus via --complex flag
- **Standalone first**: No backend dependency for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Standalone CLI before backend | Ship value fast, validate with real users before building infrastructure | ✓ Good — shipped in 4 days |
| User provides own API key | No backend needed, no billing complexity for v1 | ✓ Good — zero infrastructure |
| Bun over Node | Faster builds, modern tooling, simpler bundling | ✓ Good — 132KB ESM bundle |
| Sonnet as default model | Good quality/cost balance, Opus available for complex tasks | ✓ Good — cost-effective |
| FQCN always | Future-proof, ansible-lint compliant, professional output | ✓ Good — clean output |
| ESM-only build | CJS incompatible with top-level await in codebase | ✓ Good — simpler build |
| SARIF lint format | Machine-readable, version-stable parsing | ✓ Good — reliable integration |
| Warnings not errors for FQCN/idempotency | Quality guidance without blocking generation | ✓ Good — better UX |

## Current Milestone: v1.1 Plan Mode

**Goal:** Add interactive context-gathering wizard before generation for more tailored, user-controlled output.

**Target features:**
- Wizard flow with step-by-step questions and progress indicators
- Questions covering: code structure, component inclusion, variable strategy
- Both `new role` and `new playbook` commands support wizard
- Option to save choices as defaults at end of wizard
- `--quick` flag to skip wizard and use saved/built-in defaults
- Temporary context file passed to generation (not persisted unless saved as defaults)

---
*Last updated: 2026-01-21 after v1.1 milestone started*
