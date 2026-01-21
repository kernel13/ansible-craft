# ansible-craft

Generate production-ready Ansible roles and playbooks from natural language using AI.

[![npm version](https://img.shields.io/npm/v/ansible-craft.svg)](https://www.npmjs.com/package/ansible-craft)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

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

## Installation

### Global Install (Recommended)

```bash
# npm
npm install -g ansible-craft

# yarn
yarn global add ansible-craft

# pnpm
pnpm add -g ansible-craft
```

### Run Without Installing

```bash
# npx
npx ansible-craft new role "nginx web server with SSL"

# bunx
bunx ansible-craft new role "nginx web server with SSL"

# pnpx
pnpx ansible-craft new role "nginx web server with SSL"
```

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

## Commands

### `new role <description>`

Generate a new Ansible role from a natural language description.

```bash
ansible-craft new role "postgresql database with replication"
```

**Options:**

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Role name (default: inferred from description) |
| `-o, --output <dir>` | Output directory (default: current directory) |
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

# JSON output for automation
ansible-craft new role "nginx" --json > result.json
```

### `new playbook <description>`

Generate a new Ansible playbook from a natural language description.

```bash
ansible-craft new playbook "deploy microservices with load balancer"
```

**Options:**

| Option | Description |
|--------|-------------|
| `-n, --name <name>` | Playbook name (default: inferred from description) |
| `-o, --output <dir>` | Output directory (default: current directory) |
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

### `explain <path>`

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

### `fix <error>`

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

### `config save`

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

### `completions <shell>`

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

## JSON Output for CI/CD

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

## Requirements

- **Node.js**: 18 or higher
- **API Key**: Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- **ansible-lint** (optional): For lint checking - `pip install ansible-lint`

## Generated Code Quality

ansible-craft generates code that follows Ansible best practices:

- **FQCN Modules**: Uses fully qualified collection names (e.g., `ansible.builtin.apt` not `apt`)
- **Idempotent Tasks**: State-based tasks, creates directories before files, etc.
- **ansible-lint Compliant**: Generated code passes ansible-lint with minimal or no warnings
- **Proper Structure**: Standard Ansible role/playbook directory structure
- **Documentation**: Includes README.md with usage instructions
- **Variables**: Sensible defaults with clear descriptions

## Examples

### Generate an Nginx Role

```bash
ansible-craft new role "nginx web server with SSL certificates from Let's Encrypt,
  gzip compression enabled, and reverse proxy to upstream app servers"
```

### Generate a Docker Deployment Playbook

```bash
ansible-craft new playbook "install Docker on Ubuntu, configure Docker Compose,
  and deploy a three-tier application with nginx, node.js, and postgresql"
```

### Explain Complex Code

```bash
ansible-craft explain ./roles/kubernetes-master/ --complex
```

### Fix an Ansible Error

```bash
ansible-craft fix "fatal: [webserver]: FAILED! => {\"msg\": \"The conditional check
  'nginx_ssl_enabled' failed. The error was: error while evaluating conditional
  (nginx_ssl_enabled): 'nginx_ssl_enabled' is undefined\"}" --playbook site.yml
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/ansible-craft/ansible-craft/issues)
- **Discussions**: [GitHub Discussions](https://github.com/ansible-craft/ansible-craft/discussions)
