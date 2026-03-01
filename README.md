# ansible-craft

Claude Code skills for generating production-ready Ansible roles and playbooks from natural language.

[![npm version](https://img.shields.io/npm/v/ansible-craft.svg)](https://www.npmjs.com/package/ansible-craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

## What is ansible-craft?

ansible-craft provides slash commands and specialized agents for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) that generate Ansible roles, playbooks, projects, and collections from natural language descriptions. All generated code follows Ansible best practices: FQCN-compliant modules, idempotent tasks, Galaxy-standard structure, and ansible-lint clean output.

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (Anthropic's CLI for Claude)
- Node.js 18+

## Installation

### Via npm (recommended)

```bash
npm install -g ansible-craft
```

Skills and agents are automatically installed to `~/.claude/` via the postinstall hook.

### Manual install from repository

```bash
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft
node cc/scripts/install-skills.mjs
```

### Project-local install

```bash
node cc/scripts/install-skills.mjs --project
```

This installs skills to `./.claude/commands/ac/` and agents to `./.claude/agents/` in the current directory.

## Usage

All commands are available as slash commands in Claude Code.

### `/ac:role` - Generate Ansible Roles

Create complete roles with tasks, handlers, templates, variables, defaults, and Molecule tests.

```
> /ac:role nginx with SSL and gzip compression
> /ac:role PostgreSQL 16 with streaming replication
> /ac:role Docker with compose and registry auth
```

### `/ac:playbook` - Generate Ansible Playbooks

Create multi-play playbooks with inventory and group variables.

```
> /ac:playbook deploy LAMP stack on Ubuntu servers
> /ac:playbook kubernetes cluster with 3 masters and 5 workers
```

### `/ac:project` - Scaffold Ansible Projects

Create project directory structures following official Ansible best practices.

```
> /ac:project web infrastructure with staging and production
```

### `/ac:collection` - Generate Ansible Collections

Create collections with plugins, roles, and tests.

```
> /ac:collection network utilities for firewall management
```

### `/ac:explain` - Explain Ansible Code

Get plain English explanations of existing Ansible code.

```
> /ac:explain ./roles/webserver/
> /ac:explain playbook.yml
```

### `/ac:fix` - Fix Ansible Errors

Diagnose errors and get suggested fixes.

```
> /ac:fix "undefined variable 'nginx_port'"
> /ac:fix ansible-lint violations in ./roles/nginx/
```

## Architecture

```
Skills (slash commands) orchestrate Agents (specialized workers)
that reference shared documentation (references).

/ac:role  ──→  ac-planner  ──→  ac-generator-*  ──→  ac-validator
                                                       ac-fixer
```

- **Skills** (`cc/skills/ac/`) - User-facing slash commands that define workflows
- **Agents** (`cc/agents/`) - Specialized workers invoked via Claude Code's Task tool
- **References** (`cc/common/references/`) - Shared Ansible knowledge (FQCN mappings, patterns, structure guides)

See [cc/README.md](cc/README.md) for detailed architecture documentation.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
