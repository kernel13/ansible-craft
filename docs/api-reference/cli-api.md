# CLI API Reference

Complete reference for all ansible-craft CLI commands, options, and environment variables.

## Global Options

These options are available on all commands:

| Option | Description |
|--------|-------------|
| `-V, --version` | Output version number |
| `-h, --help` | Display help |

## Commands

### new role

Generate a new Ansible role.

```bash
ansible-craft new role <description> [options]
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<description>` | Yes | Natural language description |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-n, --name <name>` | string | (inferred) | Role name |
| `-o, --output <dir>` | string | `.` | Output directory |
| `-Q, --quick` | boolean | false | Skip wizard, use saved defaults |
| `--dry-run` | boolean | false | Preview without writing |
| `--force` | boolean | false | Overwrite existing |
| `--fix` | boolean | false | Auto-fix lint issues |
| `--no-interactive` | boolean | false | Skip wizard questions |
| `-q, --quiet` | boolean | false | Suppress progress |
| `--json` | boolean | false | JSON output format |
| `--complex` | boolean | false | Use Opus model |

#### Examples

```bash
# Basic
ansible-craft new role "nginx with SSL"

# With name and output
ansible-craft new role "nginx" -n nginx_proxy -o ./roles/

# Quick mode
ansible-craft new role "nginx" --quick

# CI/CD mode
ansible-craft new role "nginx" --no-interactive --fix --json
```

---

### new playbook

Generate a new Ansible playbook.

```bash
ansible-craft new playbook <description> [options]
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<description>` | Yes | Natural language description |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-n, --name <name>` | string | (inferred) | Playbook name |
| `-o, --output <dir>` | string | `.` | Output directory |
| `-Q, --quick` | boolean | false | Skip wizard, use saved defaults |
| `--dry-run` | boolean | false | Preview without writing |
| `--force` | boolean | false | Overwrite existing |
| `--fix` | boolean | false | Auto-fix lint issues |
| `--no-interactive` | boolean | false | Skip wizard questions |
| `-q, --quiet` | boolean | false | Suppress progress |
| `--json` | boolean | false | JSON output format |
| `--complex` | boolean | false | Use Opus model |

#### Examples

```bash
# Basic
ansible-craft new playbook "deploy LAMP stack"

# With name
ansible-craft new playbook "deploy web app" -n webapp-deploy

# Quick mode
ansible-craft new playbook "deploy app" --quick
```

---

### explain

Explain existing Ansible code.

```bash
ansible-craft explain <path> [options]
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<path>` | Yes | Path to file or role directory |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--playbook <path>` | string | - | Context from related file |
| `--complex` | boolean | false | Use Opus for deep analysis |
| `-q, --quiet` | boolean | false | Suppress progress |

#### Examples

```bash
# Explain a file
ansible-craft explain site.yml

# Explain a role
ansible-craft explain ./roles/nginx/

# With context
ansible-craft explain ./roles/nginx/ --playbook site.yml

# Deep analysis
ansible-craft explain ./roles/complex/ --complex
```

---

### fix

Fix Ansible errors.

```bash
ansible-craft fix <error> [options]
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<error>` | Yes | Error message to analyze |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--playbook <path>` | string | - | Context from related file |
| `--complex` | boolean | false | Use Opus for analysis |
| `--apply` | boolean | false | Apply fix without confirmation |
| `-q, --quiet` | boolean | false | Suppress progress |

#### Examples

```bash
# Basic analysis
ansible-craft fix "undefined variable error"

# With context
ansible-craft fix "module not found" --playbook site.yml

# Auto-apply
ansible-craft fix "module error" --playbook site.yml --apply
```

---

### config save

Save configuration settings.

```bash
ansible-craft config save [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--api-key <key>` | string | - | API key to save |
| `--model <model>` | string | sonnet | Default model (sonnet/opus) |
| `--complex` | boolean | false | Enable complex mode default |
| `--no-validate` | boolean | false | Skip API key validation |
| `-y, --yes` | boolean | false | Skip confirmation |

#### Examples

```bash
# Interactive
ansible-craft config save

# Non-interactive
ansible-craft config save --api-key sk-ant-... -y

# With model preference
ansible-craft config save --api-key sk-ant-... --model opus -y
```

---

### config defaults

Configure wizard defaults.

```bash
ansible-craft config defaults <type>
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<type>` | Yes | Type: `role` or `playbook` |

#### Examples

```bash
# Configure role defaults
ansible-craft config defaults role

# Configure playbook defaults
ansible-craft config defaults playbook
```

---

### setup

Install Claude Code integration.

```bash
ansible-craft setup [options]
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--project` | boolean | false | Install to current project |
| `--force` | boolean | false | Overwrite existing files |

#### Examples

```bash
# Global install
ansible-craft setup

# Project install
ansible-craft setup --project

# Force reinstall
ansible-craft setup --force
```

---

### completions

Generate shell completions.

```bash
ansible-craft completions <shell>
```

#### Arguments

| Argument | Required | Values | Description |
|----------|----------|--------|-------------|
| `<shell>` | Yes | bash, zsh, fish | Target shell |

#### Examples

```bash
# Bash
ansible-craft completions bash >> ~/.bashrc

# Zsh
ansible-craft completions zsh >> ~/.zshrc

# Fish
ansible-craft completions fish > ~/.config/fish/completions/ansible-craft.fish
```

---

## Environment Variables

| Variable | Description | Priority |
|----------|-------------|----------|
| `ANTHROPIC_API_KEY` | Anthropic API key | Highest |
| `DEBUG` | Enable debug output | - |
| `NO_COLOR` | Disable colored output | - |

### Precedence

1. Command-line flags (highest)
2. Environment variables
3. Config file
4. Built-in defaults (lowest)

---

## Configuration File

Location: `~/.config/ansible-craft/config.toml`

### Schema

```toml
[api]
key = "sk-ant-api03-..."  # Anthropic API key

[defaults]
model = "sonnet"  # Default model: "sonnet" or "opus"
complex = false   # Default complex mode

[defaults.role]
platforms = ["ubuntu", "debian"]  # Target platforms
ansible_version = "2.14"          # Minimum Ansible version
require_privilege = true          # Require sudo/become
molecule = false                  # Include Molecule tests
ci_provider = "github"            # CI: github, gitlab, none

[defaults.playbook]
inventory_groups = ["webservers"] # Default inventory groups
connection = "ssh"                # Connection type
become = true                     # Privilege escalation
```

---

## Exit Codes

See [Exit Codes Reference](exit-codes.md) for complete list.

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | User cancelled |

---

## JSON Output Format

See [JSON Schemas](json-schemas.md) for complete schema definitions.

### Success Response

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "role",
  "name": "nginx",
  "output_dir": "/path/to/nginx",
  "files": [
    {"path": "tasks/main.yml", "size": 1234}
  ],
  "warnings": [],
  "metadata": {
    "command": "ansible-craft new role \"nginx\"",
    "duration_ms": 5432,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "format_version": "1.0",
  "success": false,
  "error": {
    "code": "API_ERROR",
    "message": "Authentication failed"
  }
}
```
