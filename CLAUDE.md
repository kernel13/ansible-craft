# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

- Do not assume when I ask a question or a task that it is wrong or right. Always analyze based on fact.
- Do not jump into conclusion and analyze different options
- When you propose a solution make sure that you have checked the existing code
- Keep things simple, do not generate extra code and each code should be production-ready
- Verify existing code to avoid duplicate and propose refactoring if this is the case

## Project Overview

ansible-craft is a set of Claude Code skills and agents for generating production-ready Ansible roles and playbooks from natural language descriptions. Distributed via npm with a postinstall hook that copies skills and agents to `~/.claude/`.

## Project Structure

```
ansible-craft/
├── .claude/                    # Claude Code IDE configuration (DO NOT MOVE)
├── cc/                         # Claude Code distributable integration
│   ├── agents/                 # Agent definitions (ac-*.md)
│   ├── skills/ac/              # Slash command skills
│   ├── common/references/      # Shared reference documentation
│   └── scripts/                # Installation scripts
├── docs/                       # Documentation
│   ├── architecture/           # Ansible best practices reference
│   └── examples/               # Generated role/playbook showcases
├── package.json
├── biome.json
├── README.md
├── CONTRIBUTING.md
└── LICENSE
```

## Commands

```bash
# Linting & formatting
bun run lint             # Check code with Biome
bun run format           # Format code with Biome

# Install skills/agents
node cc/scripts/install-skills.mjs              # Install to ~/.claude/ (global)
node cc/scripts/install-skills.mjs --project    # Install to ./.claude/ (project-local)
node cc/scripts/install-skills.mjs --force      # Force overwrite existing files
```

## Skills (Slash Commands)

| Command | Description |
|---------|-------------|
| `/ac:role` | Generate Ansible roles from natural language |
| `/ac:playbook` | Generate Ansible playbooks from natural language |
| `/ac:project` | Scaffold Ansible project directory structures |
| `/ac:collection` | Generate Ansible collections with plugins, roles, and tests |
| `/ac:explain` | Explain existing Ansible code in plain English |
| `/ac:fix` | Diagnose and fix Ansible errors |

## Agents

| Agent | Purpose |
|-------|---------|
| `ac-researcher` | Research docs, features, best practices, and implementation details |
| `ac-planner` | Synthesize structured plans from all inputs |
| `ac-generator` | Generate playbook files from plans |
| `ac-generator-core` | Generate role core files (defaults, vars, handlers, meta, README) |
| `ac-generator-tasks` | Generate role task files (tasks/*.yml) |
| `ac-generator-templates` | Generate role templates (templates/*.j2) |
| `ac-generator-molecule` | Generate Molecule test files |
| `ac-validator` | Static validation (YAML, FQCN, idempotency) |
| `ac-linter` | Run ansible-lint and parse results |
| `ac-fixer` | Auto-fix lint violations |

## References

Shared knowledge documents in `cc/common/references/`:

| File | Description |
|------|-------------|
| `fqcn.md` | Fully Qualified Collection Name mappings |
| `lint-fixes.md` | Common lint violations and fixes |
| `molecule.md` | Molecule testing configuration patterns |
| `patterns.md` | Ansible best practices and idempotency patterns |
| `playbook-structure.md` | Playbook directory conventions |
| `role-structure.md` | Galaxy-standard role directory structure |
| `project-structure.md` | Ansible project directory structure |
| `collection-structure.md` | Ansible collection structure |
| `research-sources.md` | Research source URLs for documentation lookup |

## Installation

```bash
# Via npm (installs skills to ~/.claude/ automatically)
npm install -g ansible-craft

# Manual install from repo
node cc/scripts/install-skills.mjs

# Project-local install
node cc/scripts/install-skills.mjs --project
```

## Development

### Adding a New Skill

1. Create `cc/skills/ac/{name}.md` with YAML frontmatter (`name`, `description`, `allowed-tools`)
2. Define the workflow in the markdown body
3. Run `node cc/scripts/install-skills.mjs --force`

### Adding a New Agent

1. Create `cc/agents/ac-{name}.md` with YAML frontmatter (`name`, `description`, `tools`)
2. Define the agent's role and process in the markdown body
3. Run `node cc/scripts/install-skills.mjs --force`

### Adding a Reference Document

1. Create `cc/common/references/{topic}.md`
2. Update relevant skills/agents to read the new reference
