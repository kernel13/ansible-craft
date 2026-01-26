# Quick Start Guide

Get up and running with ansible-craft in 5 minutes.

## Prerequisites

- **Node.js** 18 or higher
- **Anthropic API Key** from [console.anthropic.com](https://console.anthropic.com)
- **ansible-lint** (optional): `pip install ansible-lint`

## Installation

### Option 1: Run Without Installing (Recommended)

```bash
# Using bunx (fastest)
bunx ansible-craft new role "nginx web server"

# Using npx
npx ansible-craft new role "nginx web server"

# Using pnpx
pnpx ansible-craft new role "nginx web server"
```

### Option 2: Global Installation

```bash
# npm
npm install -g ansible-craft

# yarn
yarn global add ansible-craft

# pnpm
pnpm add -g ansible-craft

# Verify installation
ansible-craft --version
```

## Step 1: Configure Your API Key

Get an API key from [console.anthropic.com](https://console.anthropic.com), then configure ansible-craft:

### Interactive Setup (Recommended)

```bash
ansible-craft config save
```

You'll be prompted for:
- API key
- Default model (sonnet or opus)
- Complex mode preference

### Quick Setup

```bash
# Save API key directly
ansible-craft config save --api-key sk-ant-api03-... -y

# Or use environment variable
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Step 2: Generate Your First Role

```bash
ansible-craft new role "nginx web server with SSL and gzip compression"
```

### What Happens:

1. **Plan Preview** - ansible-craft shows you:
   - Tasks that will be created
   - Variables with defaults
   - Handlers
   - Templates
   - Files

2. **Review & Confirm** - You can:
   - **Accept** - Generate the role
   - **Modify** - Provide additional requirements
   - **Reject** - Cancel generation

3. **Code Generation** - ansible-craft:
   - Generates all role files
   - Validates YAML syntax
   - Runs ansible-lint (if available)
   - Auto-fixes common issues

4. **Output** - Creates role directory:
   ```
   nginx/
   ├── tasks/main.yml
   ├── handlers/main.yml
   ├── defaults/main.yml
   ├── templates/
   │   ├── nginx.conf.j2
   │   └── site.conf.j2
   ├── files/
   ├── meta/main.yml
   └── README.md
   ```

## Step 3: Generate a Playbook

```bash
ansible-craft new playbook "deploy LAMP stack on Ubuntu 22.04"
```

This creates:
```
lamp-deployment/
├── playbook.yml
├── inventory.example
├── group_vars/
│   ├── all.yml
│   ├── webservers.yml
│   └── databases.yml
└── README.md
```

## Common Commands

### Explain Existing Code

```bash
# Explain a playbook
ansible-craft explain playbook.yml

# Explain a role
ansible-craft explain ./roles/nginx/

# With additional context
ansible-craft explain ./roles/nginx/ --playbook site.yml
```

### Fix Errors

```bash
# Quote the entire error message
ansible-craft fix "FAILED! => {'msg': 'undefined variable: nginx_port'}"

# Provide context for better suggestions
ansible-craft fix "ERROR! couldn't resolve module" --playbook site.yml
```

### Preview Without Writing

```bash
# See what would be generated
ansible-craft new role "redis cache" --dry-run
```

### Auto-Fix Lint Issues

```bash
# Automatically fix common lint violations
ansible-craft new role "nginx" --fix
```

## Shell Completions

Enable tab completion for your shell:

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

## Tips for Better Results

### Write Specific Descriptions

✅ **Good:**
```bash
ansible-craft new role "PostgreSQL 15 with streaming replication, \
  automated backups to S3, SSL connections, and connection pooling with pgBouncer"
```

❌ **Too Vague:**
```bash
ansible-craft new role "database"
```

### Use Context for Explanations

```bash
# Better results with context
ansible-craft explain ./roles/app/ --playbook deploy.yml
```

### Use Complex Mode for Difficult Tasks

```bash
# Use Claude Opus for complex scenarios
ansible-craft new role "multi-region Kubernetes cluster" --complex
```

## Configuration File

Your configuration is stored in `~/.config/ansible-craft/config.toml`:

```toml
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"  # or "opus"
complex = false
```

## Environment Variables

Override config with environment variables:

```bash
# API key
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Then run commands
ansible-craft new role "nginx"
```

## Example: Complete Workflow

```bash
# 1. Install globally
npm install -g ansible-craft

# 2. Configure
ansible-craft config save --api-key sk-ant-api03-... -y

# 3. Generate a role
ansible-craft new role "nginx reverse proxy with SSL"

# 4. Generate a playbook
ansible-craft new playbook "deploy web application with nginx and database"

# 5. Explain generated code
ansible-craft explain ./nginx/

# 6. If you get an error when running it
ansible-craft fix "your error message here" --playbook playbook.yml
```

## Next Steps

- **Explore Commands**: [Commands Guide](README.md)
- **Learn Validation**: [Validation Guide](validation.md)
- **See Examples**: [Examples](../examples/README.md)
- **Troubleshoot Issues**: [Troubleshooting](troubleshooting.md)

## Getting Help

- **Built-in Help**: `ansible-craft --help`
- **Command Help**: `ansible-craft new role --help`
- **Troubleshooting**: [Troubleshooting Guide](troubleshooting.md)
- **GitHub Issues**: https://github.com/ansible-craft/ansible-craft/issues
