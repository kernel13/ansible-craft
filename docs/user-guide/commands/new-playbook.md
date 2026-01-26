# new playbook Command

Generate a complete Ansible playbook from a natural language description.

## Synopsis

```bash
ansible-craft new playbook "<description>" [options]
```

## Description

The `new playbook` command generates a production-ready Ansible playbook from a plain English description. It creates:

- Main playbook file with plays and tasks
- Example inventory file
- Group variables
- Documentation

## Arguments

| Argument | Description |
|----------|-------------|
| `<description>` | Natural language description of the desired playbook |

## Options

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
| `--complex` | Use Claude Opus for complex requirements (higher cost) |

## Examples

### Basic Usage

```bash
# Generate a playbook from description
ansible-craft new playbook "deploy LAMP stack"

# Playbook name is inferred as "lamp-stack"
```

### Custom Name and Location

```bash
# Specify name explicitly
ansible-craft new playbook "deploy web application" -n webapp-deploy

# Output to specific directory
ansible-craft new playbook "kubernetes setup" -o ./playbooks/
```

### Using Quick Mode

```bash
# First, save your default preferences
ansible-craft config defaults playbook

# Then use quick mode to skip the wizard
ansible-craft new playbook "deploy redis cluster" --quick
```

### Preview Mode

```bash
# See what would be generated without writing files
ansible-craft new playbook "setup monitoring stack" --dry-run
```

### CI/CD Mode

```bash
# Non-interactive with auto-fix and JSON output
ansible-craft new playbook "deploy app" \
  --no-interactive \
  --fix \
  --quiet \
  --json > result.json
```

### Complex Playbooks

```bash
# Use Opus model for complex multi-tier deployments
ansible-craft new playbook "deploy microservices with load balancer, service discovery, and centralized logging" --complex
```

## Generated Structure

The command generates a complete playbook directory:

```
lamp-stack/
├── playbook.yml           # Main playbook
├── inventory.example      # Example inventory file
├── group_vars/
│   ├── all.yml            # Variables for all hosts
│   ├── webservers.yml     # Web server variables
│   └── databases.yml      # Database variables
├── host_vars/             # Host-specific variables (if needed)
└── README.md              # Playbook documentation
```

## Workflow

1. **Wizard Phase**: Answer questions about target hosts, connection type, privilege escalation
2. **Plan Phase**: AI generates a plan preview showing plays, tasks, variables
3. **Review**: Accept, modify, or reject the plan
4. **Generation**: AI generates the actual code
5. **Validation**: YAML syntax, FQCN compliance, idempotency checks
6. **Linting**: ansible-lint runs (if installed)
7. **Auto-fix**: Fix common issues (optional)
8. **Write**: Files written to disk

## Plan Preview

The plan preview shows what will be generated:

```
═══════════════════════════════════════════════════════════════
                   PLAYBOOK GENERATION PLAN
═══════════════════════════════════════════════════════════════

Playbook Name: lamp-stack
Description: deploy LAMP stack on Ubuntu servers

Plays:
  1. Configure webservers
     • Install Apache2
     • Deploy virtual host configuration
     • Enable mod_rewrite
     • Start Apache service

  2. Configure databases
     • Install MySQL server
     • Secure MySQL installation
     • Create application database
     • Create database user

  3. Deploy application
     • Clone application repository
     • Install PHP dependencies
     • Configure application
     • Set file permissions

Variables:
  • mysql_root_password: (vault encrypted)
  • app_domain: example.com
  • php_version: 8.2

Inventory Groups:
  • webservers
  • databases

═══════════════════════════════════════════════════════════════

? Accept this plan?
❯ Accept
  Modify
  Reject
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - playbook generated |
| 1 | Error - generation failed |
| 2 | User cancelled |

## JSON Output

With `--json`, returns structured output:

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "playbook",
  "name": "lamp-stack",
  "output_dir": "/path/to/lamp-stack",
  "files": [
    {"path": "playbook.yml", "size": 2345},
    {"path": "inventory.example", "size": 234},
    {"path": "group_vars/all.yml", "size": 567}
  ],
  "warnings": [],
  "metadata": {
    "command": "ansible-craft new playbook \"deploy LAMP stack\"",
    "duration_ms": 6543,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Tips

### Writing Good Descriptions

**Be specific about:**
- What services/components to deploy
- Target environment (development, production)
- Any specific requirements (HA, security, etc.)

**Examples:**

```bash
# Good - clear scope and requirements
ansible-craft new playbook "deploy production Kubernetes cluster with 3 masters, 5 workers, Calico networking, and Longhorn storage"

# Too vague - unclear scope
ansible-craft new playbook "setup servers"
```

### Using with Existing Roles

If you have existing roles, mention them:

```bash
ansible-craft new playbook "deploy web application using roles: nginx, postgresql, redis"
```

### Multi-Environment Playbooks

For multiple environments:

```bash
ansible-craft new playbook "deploy application to staging and production with environment-specific variables"
```

## Playbook vs Role

**Use `new playbook` when:**
- Orchestrating multiple roles
- Deploying a complete stack
- Need inventory and group_vars

**Use `new role` when:**
- Creating reusable components
- Single service/application
- Want Galaxy-standard structure

## Related

- **[new role](new-role.md)** - Generate roles
- **[Wizards Guide](../wizards.md)** - Understanding the wizard
- **[Validation Guide](../validation.md)** - Understanding validation
- **[config defaults](config.md#config-defaults)** - Save wizard preferences
