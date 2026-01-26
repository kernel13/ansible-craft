# setup Command

Install Claude Code slash commands for ansible-craft.

## Synopsis

```bash
ansible-craft setup [options]
```

## Description

The `setup` command installs ansible-craft's slash commands for use with [Claude Code](https://claude.ai/code), Anthropic's CLI for Claude.

After installation, you can use commands like `/ac:role` directly in Claude Code.

## Options

| Option | Description |
|--------|-------------|
| `--project` | Install to current project instead of global |
| `--force` | Overwrite existing files without prompting |

## Installation Modes

### Global Installation (Default)

```bash
ansible-craft setup
```

Installs to:
- `~/.claude/commands/ac/` - Slash command definitions
- `~/.claude/agents/` - Agent definitions

Available in all Claude Code sessions.

### Project-Local Installation

```bash
ansible-craft setup --project
```

Installs to:
- `./.claude/commands/ac/` - Project-specific commands
- `./.claude/agents/` - Project-specific agents

Only available when Claude Code is run from this project directory.

## What Gets Installed

### Slash Commands

| File | Command | Description |
|------|---------|-------------|
| `role.md` | `/ac:role` | Generate Ansible roles |
| `playbook.md` | `/ac:playbook` | Generate playbooks |
| `explain.md` | `/ac:explain` | Explain Ansible code |
| `fix.md` | `/ac:fix` | Fix Ansible errors |

### Agent Definitions

| File | Agent | Description |
|------|-------|-------------|
| `ac-planner.md` | Plan generation | Generates structured plans |
| `ac-generator.md` | Code generation | Generates playbook code |
| `ac-generator-core.md` | Core role files | Generates defaults, vars, handlers |
| `ac-generator-tasks.md` | Task files | Generates tasks/*.yml |
| `ac-generator-templates.md` | Templates | Generates templates/*.j2 |
| `ac-generator-molecule.md` | Molecule tests | Generates test scaffolding |
| `ac-validator.md` | Validation | Static code validation |
| `ac-linter.md` | Linting | ansible-lint execution |
| `ac-fixer.md` | Auto-fix | Fixes lint violations |

### Reference Documents

| File | Content |
|------|---------|
| `role-structure.md` | Galaxy-standard role structure |
| `playbook-structure.md` | Playbook conventions |
| `fqcn.md` | FQCN mappings |
| `patterns.md` | Ansible best practices |
| `lint-fixes.md` | Common lint fixes |
| `molecule.md` | Molecule testing guide |

## Examples

### First-Time Setup

```bash
# Install globally
ansible-craft setup

# Output:
# ✓ Installed commands to ~/.claude/commands/ac/
# ✓ Installed agents to ~/.claude/agents/
# ✓ Installed references to ~/.claude/common/references/
#
# Available commands:
#   /ac:role      - Generate Ansible roles
#   /ac:playbook  - Generate playbooks
#   /ac:explain   - Explain Ansible code
#   /ac:fix       - Fix Ansible errors
```

### Project Setup

```bash
cd my-ansible-project
ansible-craft setup --project

# Output:
# ✓ Installed commands to ./.claude/commands/ac/
# ✓ Installed agents to ./.claude/agents/
# ...
```

### Force Reinstall

```bash
# Update to latest version
ansible-craft setup --force
```

## Using Claude Code Commands

After setup, use commands in Claude Code:

### Generate a Role

```
> /ac:role nginx with SSL and load balancing
```

Claude Code will:
1. Ask clarifying questions about platforms, features
2. Generate a plan preview
3. Create the role files

### Explain Code

```
> /ac:explain ./roles/webserver/
```

### Fix Errors

```
> /ac:fix "undefined variable error"
```

## Checking Installation

Verify commands are installed:

```bash
# Global installation
ls ~/.claude/commands/ac/

# Project installation
ls .claude/commands/ac/
```

## Updating

When ansible-craft is updated, reinstall the commands:

```bash
# Update npm package
npm update -g ansible-craft

# Reinstall commands
ansible-craft setup --force
```

## Uninstalling

Remove the installed files:

```bash
# Global
rm -rf ~/.claude/commands/ac/
rm -f ~/.claude/agents/ac-*.md

# Project
rm -rf .claude/commands/ac/
rm -f .claude/agents/ac-*.md
```

## Troubleshooting

### Commands Not Appearing

1. Verify installation:
   ```bash
   ls ~/.claude/commands/ac/
   ```

2. Restart Claude Code

3. Check Claude Code is looking at the right location

### "Command not found" in Claude Code

The commands are for Claude Code (the IDE/CLI), not the shell. Use them within a Claude Code session, not in your terminal.

### Conflicts with Other Tools

If other tools use the `/ac:` prefix, install to a project to avoid conflicts:

```bash
ansible-craft setup --project
```

## Global vs Project Installation

| Aspect | Global | Project |
|--------|--------|---------|
| Location | `~/.claude/` | `./.claude/` |
| Availability | All sessions | This project only |
| Versioning | Single version | Can vary by project |
| Git tracking | No | Can be committed |

**Recommendation:**
- Use **global** for personal use
- Use **project** for team projects (commit to git)

## Related

- **[Installation](../installation.md)** - CLI installation
- **[Claude Code Integration](../../README.md#claude-code-integration)** - Overview
- **[Quick Start](../quick-start.md)** - Getting started
