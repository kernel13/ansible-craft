# ansible-craft

Generate production-ready Ansible roles and playbooks from natural language using AI.

[![npm version](https://img.shields.io/npm/v/ansible-craft.svg)](https://www.npmjs.com/package/ansible-craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

## Table of Contents

- [Features](#features)
- [Installation](#installation)
  - [CLI Installation](#cli-installation)
  - [Claude Code Integration](#claude-code-integration)
- [Quick Start](#quick-start)
- [Usage](#usage)
  - [CLI Commands](#cli-commands)
  - [Claude Code Slash Commands](#claude-code-slash-commands)
- [Configuration](#configuration)
- [CI/CD Integration](#cicd-integration)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Features

- **Natural Language Input**: Describe what you want in plain English
- **Role Generation**: Create complete Ansible roles with tasks, handlers, templates, variables, and defaults
- **Playbook Generation**: Generate multi-play playbooks with inventory and group variables
- **FQCN Compliant**: All modules use Fully Qualified Collection Names (e.g., `ansible.builtin.apt`)
- **Idempotent by Default**: Generated code follows Ansible best practices for idempotency
- **Integrated Validation**: YAML syntax checking, FQCN compliance, and ansible-lint integration
- **Auto-fix**: Automatically fix common lint violations
- **Explain Command**: Get plain English explanations of existing Ansible code
- **Fix Command**: Interpret Ansible errors and get suggested fixes
- **JSON Output**: CI/CD-friendly JSON output for automation pipelines
- **Shell Completions**: Tab completion for bash, zsh, and fish
- **Claude Code Integration**: Use as slash commands in Claude Code IDE

## Installation

### CLI Installation

```bash
# npm (recommended)
npm install -g ansible-craft

# yarn
yarn global add ansible-craft

# pnpm
pnpm add -g ansible-craft
```

**Run without installing:**

```bash
# npx
npx ansible-craft new role "nginx web server with SSL"

# bunx
bunx ansible-craft new role "nginx web server with SSL"

# pnpx
pnpx ansible-craft new role "nginx web server with SSL"
```

### Claude Code Integration

ansible-craft includes slash commands for [Claude Code](https://claude.ai/code), Anthropic's CLI for Claude.

**Install after CLI:**

```bash
# Install commands globally (available in all projects)
ansible-craft setup

# Or install to current project only
ansible-craft setup --project
```

**Available slash commands:**

| Command | Description |
|---------|-------------|
| `/ac:role` | Generate Ansible role with interactive wizard |
| `/ac:playbook` | Generate playbook with multi-play structure |
| `/ac:explain` | Explain existing Ansible code in plain English |
| `/ac:fix` | Diagnose and fix Ansible errors |

## Quick Start

### 1. Configure Your API Key

ansible-craft uses the Anthropic Claude API. You'll need an API key from [console.anthropic.com](https://console.anthropic.com).

```bash
# Interactive setup
ansible-craft config save

# Or set via environment variable
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or pass directly
ansible-craft config save --api-key sk-ant-api03-...
```

### 2. Generate Your First Role

```bash
ansible-craft new role "nginx web server with SSL and gzip compression"
```

The CLI will:
1. Generate a plan preview showing tasks, variables, handlers, and templates
2. Ask you to accept, modify, or reject the plan
3. Generate the complete role code
4. Validate YAML syntax and run ansible-lint (if available)
5. Auto-fix common lint issues (optional)
6. Write files to `./nginx/`

### 3. Generate a Playbook

```bash
ansible-craft new playbook "deploy LAMP stack on Ubuntu servers"
```

This creates a complete playbook directory with:
- `playbook.yml` - Main playbook with plays and tasks
- `inventory.example` - Sample inventory file
- `group_vars/all.yml` - Common variables
- `group_vars/<group>.yml` - Group-specific variables
- `README.md` - Documentation

## Usage

### CLI Commands

#### `new role <description>`

Generate a new Ansible role from a natural language description.

```bash
ansible-craft new role "postgresql database with replication"
```

**Options:**

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Role name (default: inferred from description) |
| `-o, --output <dir>` | Output directory (default: current directory) |
| `-Q, --quick` | Skip wizard and use saved defaults |
| `--dry-run` | Preview generated files without writing |
| `--force` | Overwrite existing directory without prompting |
| `--fix` | Auto-fix lint violations without prompting |
| `--no-interactive` | Skip clarifying questions |
| `-q, --quiet` | Suppress progress output |
| `--json` | Output results in JSON format |

**Examples:**

```bash
# Custom name and output directory
ansible-craft new role "install and configure redis" -n redis_cache -o ./roles

# Preview without writing files
ansible-craft new role "docker with compose" --dry-run

# Non-interactive mode for CI/CD
ansible-craft new role "nginx" --force --fix --quiet

# Skip wizard with saved defaults
ansible-craft new role "nginx" --quick

# JSON output for automation
ansible-craft new role "nginx" --json > result.json
```

#### `new playbook <description>`

Generate a new Ansible playbook from a natural language description.

```bash
ansible-craft new playbook "deploy microservices with load balancer"
```

**Options:**

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Playbook name (default: inferred from description) |
| `-o, --output <dir>` | Output directory (default: current directory) |
| `-Q, --quick` | Skip wizard and use saved defaults |
| `--dry-run` | Preview generated files without writing |
| `--force` | Overwrite existing directory without prompting |
| `--fix` | Auto-fix lint violations without prompting |
| `--no-interactive` | Skip clarifying questions |
| `-q, --quiet` | Suppress progress output |
| `--json` | Output results in JSON format |

**Examples:**

```bash
# Generate Kubernetes deployment playbook
ansible-craft new playbook "deploy kubernetes cluster with 3 masters and 5 workers"

# Generate with specific name
ansible-craft new playbook "setup monitoring stack" -n prometheus-stack
```

#### `explain <path>`

Get a plain English explanation of existing Ansible code.

```bash
# Explain a single file
ansible-craft explain playbook.yml

# Explain an entire role
ansible-craft explain ./roles/nginx/

# Provide additional context from a playbook
ansible-craft explain ./roles/nginx/ --playbook site.yml
```

**Options:**

| Option | Description |
|--------|-------------|
| `--playbook <path>` | Provide context from a playbook or role |
| `--complex` | Use Claude Opus for deeper analysis (higher cost) |
| `-q, --quiet` | Suppress progress output |

#### `fix <error>`

Interpret an Ansible error message and get a suggested fix.

```bash
# Basic usage - quote the entire error message
ansible-craft fix "FAILED! => {'msg': 'The task includes an option with an undefined variable'}"

# Provide context for better suggestions
ansible-craft fix "ERROR! couldn't resolve module/action 'apt'" --playbook site.yml

# Use Opus for complex errors
ansible-craft fix "complex error message" --complex

# Auto-apply the suggested fix
ansible-craft fix "error message" --playbook site.yml --apply
```

**Options:**

| Option | Description |
|--------|-------------|
| `--playbook <path>` | Provide context from a playbook or role |
| `--complex` | Use Claude Opus for deeper analysis (higher cost) |
| `--apply` | Apply the fix without confirmation |
| `-q, --quiet` | Suppress progress output |

#### `config save`

Configure ansible-craft settings.

```bash
# Interactive wizard
ansible-craft config save

# Non-interactive with flags
ansible-craft config save --api-key sk-ant-... --model sonnet -y
```

**Options:**

| Option | Description |
|--------|-------------|
| `--api-key <key>` | API key to save |
| `--model <model>` | Default model: `sonnet` or `opus` |
| `--complex` | Enable complex mode by default |
| `--no-validate` | Skip API key validation |
| `-y, --yes` | Skip confirmation prompt |

#### `config defaults <type>`

Configure wizard defaults for roles or playbooks. These defaults are used when running with `--quick`.

```bash
# Configure role wizard defaults
ansible-craft config defaults role

# Configure playbook wizard defaults
ansible-craft config defaults playbook
```

The wizard will prompt you to configure default values for:
- **Role**: supported platforms, minimum Ansible version, privilege requirements, Molecule testing, CI provider
- **Playbook**: default inventory groups, connection settings, privilege escalation

Once saved, use `--quick` flag to skip the wizard and use these defaults.

#### `setup`

Install Claude Code slash commands.

```bash
# Install globally (default)
ansible-craft setup

# Install to current project
ansible-craft setup --project

# Force overwrite existing
ansible-craft setup --force
```

#### `completions <shell>`

Generate shell completion scripts.

```bash
# Bash
ansible-craft completions bash >> ~/.bashrc
source ~/.bashrc

# Zsh
ansible-craft completions zsh >> ~/.zshrc
source ~/.zshrc

# Fish
ansible-craft completions fish > ~/.config/fish/completions/ansible-craft.fish
```

### Claude Code Slash Commands

When using [Claude Code](https://claude.ai/code), these commands provide AI-powered Ansible assistance directly in your terminal.

| Command | Description |
|---------|-------------|
| `/ac:role` | Generate a complete Ansible role with interactive wizard for configuration |
| `/ac:playbook` | Generate a multi-play playbook with inventory and variables |
| `/ac:explain` | Explain what existing Ansible code does in plain English |
| `/ac:fix` | Diagnose Ansible errors and get suggested fixes |

**Example usage in Claude Code:**

```
> /ac:role nginx with SSL and load balancing
> /ac:explain ./roles/webserver/
> /ac:fix "undefined variable error"
```

## Configuration

### Config File

Configuration is stored in `~/.config/ansible-craft/config.toml`:

```toml
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"  # or "opus"
complex = false
```

### Environment Variables

Environment variables take precedence over the config file:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |

```bash
# Use environment variable
export ANTHROPIC_API_KEY=sk-ant-api03-...
ansible-craft new role "nginx"
```

## CI/CD Integration

Use `--json` flag for machine-readable output:

```bash
ansible-craft new role "nginx" --json
```

**Success response:**

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "role",
  "name": "nginx",
  "output_dir": "/path/to/nginx",
  "files": [
    {"path": "tasks/main.yml", "size": 1234},
    {"path": "handlers/main.yml", "size": 567}
  ],
  "warnings": [],
  "metadata": {
    "command": "ansible-craft new role \"nginx\"",
    "duration_ms": 5432,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

**Error response:**

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

## Development

### Prerequisites

- [Bun](https://bun.sh) runtime (v1.0+)
- Node.js 18+
- Anthropic API key

### Setup

```bash
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft
bun install
```

### Running Locally

```bash
# Run CLI in development mode
bun run dev new role "nginx with SSL"

# Run specific command
bun run src/cli/index.ts explain ./roles/nginx/
```

### Testing

```bash
bun test              # Run all tests
bun test --watch      # Watch mode
bun test --coverage   # With coverage
bun test src/ai/      # Run tests in specific directory
```

### Code Quality

```bash
bun run lint          # Check code with Biome
bun run format        # Format code with Biome
```

### Building

```bash
bun run build         # Build for distribution
```

### Project Structure

```
ansible-craft/
├── src/           # Application source code
│   ├── ai/        # Anthropic SDK integration
│   ├── cli/       # Commander.js CLI
│   ├── config/    # Configuration management
│   ├── core/      # Agent orchestration
│   ├── explain/   # Code explanation features
│   ├── generation/# Role/playbook generation
│   └── wizard/    # Interactive wizards
├── cc/            # Claude Code integration
│   ├── skills/    # Slash command definitions
│   └── agents/    # Agent definitions
├── docs/          # Documentation
└── dist/          # Build output
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Code of Conduct

This project follows the Contributor Covenant. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Security

To report security vulnerabilities, please see [SECURITY.md](SECURITY.md).

## License

MIT License - see [LICENSE](LICENSE) for details.

## Requirements

- **Node.js**: 18 or higher
- **API Key**: Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- **ansible-lint** (optional): For lint checking - `pip install ansible-lint`

## Support

- **Issues**: [GitHub Issues](https://github.com/ansible-craft/ansible-craft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ansible-craft/ansible-craft/discussions)
