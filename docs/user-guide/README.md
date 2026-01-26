# User Guide

Complete guide to using ansible-craft CLI for generating Ansible roles and playbooks.

## Getting Started

- **[Quick Start](quick-start.md)** - Get up and running in 5 minutes
- **[Installation](installation.md)** - Installation instructions for all platforms
- **[Configuration](configuration.md)** - Configure API keys and preferences

## Commands

### Generation Commands

- **[new role](commands/new-role.md)** - Generate complete Ansible roles
- **[new playbook](commands/new-playbook.md)** - Generate Ansible playbooks

### Analysis & Fix Commands

- **[explain](commands/explain.md)** - Get plain English explanations of Ansible code
- **[fix](commands/fix.md)** - Interpret errors and get suggested fixes

### Configuration Commands

- **[config](commands/config.md)** - Manage ansible-craft settings
- **[setup](commands/setup.md)** - Install Claude Code integration

## Features

### Interactive Wizards

- **[Wizards Guide](wizards.md)** - Use clarifying questions to refine requirements

### Validation & Quality

- **[Validation Guide](validation.md)** - Understanding validation results and auto-fix

## Troubleshooting

- **[Troubleshooting Guide](troubleshooting.md)** - Common issues and solutions

## Command Reference Quick Links

| Command | Description |
|---------|-------------|
| `ansible-craft new role "<description>"` | Generate a complete Ansible role |
| `ansible-craft new playbook "<description>"` | Generate an Ansible playbook |
| `ansible-craft explain <path>` | Explain existing Ansible code |
| `ansible-craft fix "<error>"` | Get help fixing an error |
| `ansible-craft config save` | Configure settings |
| `ansible-craft config defaults <type>` | Configure wizard defaults |
| `ansible-craft setup` | Install Claude Code integration |
| `ansible-craft completions <shell>` | Generate shell completions |

## Common Workflows

### First-Time Setup

1. Install ansible-craft: `npm install -g ansible-craft`
2. Configure API key: `ansible-craft config save`
3. Generate your first role: `ansible-craft new role "nginx web server"`

### Generating Roles

1. Describe what you want: `ansible-craft new role "postgresql with replication"`
2. Review the plan preview
3. Accept, modify, or reject
4. Code is generated and validated
5. Auto-fix lint issues (optional)

### Working with Existing Code

1. Get explanations: `ansible-craft explain roles/webserver/`
2. Fix errors: `ansible-craft fix "undefined variable nginx_port"`

## Tips & Best Practices

### Writing Good Descriptions

**Good descriptions are:**
- Specific about technology and versions
- Clear about requirements (e.g., "with SSL", "high availability")
- Include relevant context (e.g., "for Ubuntu 22.04")

**Examples:**

✅ **Good**: "nginx reverse proxy with SSL certificates from Let's Encrypt, gzip compression, and rate limiting"

❌ **Too vague**: "setup nginx"

✅ **Good**: "PostgreSQL 15 with streaming replication, automated backups to S3, and monitoring"

❌ **Too vague**: "database server"

### Using Flags Effectively

- `--quick`: Skip wizard, use saved defaults
- `--dry-run`: Preview before committing
- `--fix`: Auto-fix lint issues without prompting
- `--no-interactive`: Skip clarifying questions for CI/CD
- `--json`: Machine-readable output for automation
- `--quiet`: Suppress progress for cleaner logs

### CI/CD Integration

Use these flags for automated pipelines:

```bash
ansible-craft new role "nginx" \
  --no-interactive \
  --fix \
  --quiet \
  --json > result.json
```

See [CI/CD Integration](../examples/use-cases/ci-cd-integration.md) for complete examples.

## Next Steps

- **Learn by example**: [Examples](../examples/README.md)
- **Understand the architecture**: [Architecture Overview](../architecture/README.md)
- **Contribute**: [Development Guide](../development/README.md)
