# Ansible Craft

## What This Is

An AI-powered CLI tool that generates production-ready Ansible roles and playbooks from natural language descriptions. Targets DevOps engineers and sysadmins who spend hours writing boilerplate Ansible code — giving them correct syntax, best practices, and ansible-lint compliance in seconds instead.

Positioned in the gap between expensive enterprise solutions (Red Hat Ansible Lightspeed) and generic AI that lacks Ansible-specific knowledge.

## Core Value

Generate complete, production-ready Ansible roles from natural language descriptions — properly structured, FQCN compliant, idempotent, and passing ansible-lint.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] CLI can generate complete Ansible roles from natural language descriptions
- [ ] CLI can generate Ansible playbooks from natural language descriptions
- [ ] CLI can explain what existing Ansible code does
- [ ] CLI can interpret Ansible errors and provide solutions with corrected code
- [ ] Generated content uses Fully Qualified Collection Names (FQCN)
- [ ] Generated content passes ansible-lint
- [ ] Generated content is idempotent (safe to run multiple times)
- [ ] Generated roles include proper structure (tasks, handlers, defaults, templates, meta, README)
- [ ] CLI works standalone with user's Anthropic API key
- [ ] CLI published to npm (bunx/npx compatible)

### Out of Scope

- Web application — future milestone after CLI validated
- Rails API backend — future milestone, not needed for standalone CLI
- User authentication/accounts — requires backend
- Billing/subscriptions — requires backend
- Template library — future feature requiring persistence
- Team features — requires backend and accounts
- Molecule test generation — defer to v2
- MCP server mode — defer to v2
- VS Code extension — defer to v2

## Context

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
| Standalone CLI before backend | Ship value fast, validate with real users before building infrastructure | — Pending |
| User provides own API key | No backend needed, no billing complexity for v1 | — Pending |
| Bun over Node | Faster builds, modern tooling, simpler bundling | — Pending |
| Sonnet as default model | Good quality/cost balance, Opus available for complex tasks | — Pending |
| FQCN always | Future-proof, ansible-lint compliant, professional output | — Pending |

---
*Last updated: 2025-01-18 after initialization*
