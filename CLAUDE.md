# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

- Do not assume when I ask a question or a task that it is wrong or right. Always analyze based on fact.
- Do not jump into conclusion and analyze different options
- When you propose a solution make sure that you have checked the existing code
- Keep things simple, do not generate extra code and each code should be production-ready
- Verify existing code to avoid duplicate and propose refactoring if this is the case

## Project Overview

ansible-craft is a set of Claude Code slash commands for generating production-ready Ansible roles and playbooks from natural language descriptions. Distributed via npm with a postinstall hook that installs skills to `~/.claude/skills/ac/`.

## Project Structure

```
ansible-craft/
├── .claude/                    # Claude Code IDE configuration (DO NOT MOVE)
├── skills/                     # Slash command definitions (→ ~/.claude/skills/ac/)
├── references/                 # Shared reference documentation
├── scripts/                    # Installation scripts
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

# Install skills
node scripts/install-skills.mjs              # Install to ~/.claude/ (global)
node scripts/install-skills.mjs --project    # Install to ./.claude/ (project-local)
node scripts/install-skills.mjs --force      # Force overwrite existing files
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

## References

Shared knowledge documents in `references/`:

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
# Via npm (installs skills to ~/.claude/skills/ac/ automatically)
npm install -g ansible-craft

# Manual install from repo
node scripts/install-skills.mjs

# Project-local install
node scripts/install-skills.mjs --project
```

## Development

### Adding a New Skill

1. Create `skills/{name}.md` with YAML frontmatter (`description`, `allowed-tools`, `argument-hint`)
2. Define the workflow in the markdown body
3. Run `node scripts/install-skills.mjs --force`

### Adding a Reference Document

1. Create `references/{topic}.md`
2. Update relevant commands to read the new reference
