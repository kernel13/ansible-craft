# new role Command

Generate a complete Ansible role from a natural language description.

## Synopsis

```bash
ansible-craft new role "<description>" [options]
```

## Description

The `new role` command generates a Galaxy-standard Ansible role from a plain English description. It uses AI to:

1. Understand your requirements
2. Generate a plan preview
3. Create production-ready code
4. Validate and lint the output
5. Write files to disk

## Arguments

| Argument | Description |
|----------|-------------|
| `<description>` | Natural language description of the desired role |

## Options

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
| `--complex` | Use Claude Opus for complex requirements (higher cost) |

## Examples

### Basic Usage

```bash
# Generate a role from description
ansible-craft new role "nginx web server with SSL"

# Role name is inferred as "nginx"
```

### Custom Name and Location

```bash
# Specify name explicitly
ansible-craft new role "nginx reverse proxy" -n nginx_proxy

# Output to specific directory
ansible-craft new role "nginx" -o ./roles/
# Creates ./roles/nginx/
```

### Using Quick Mode

```bash
# First, save your default preferences
ansible-craft config defaults role

# Then use quick mode to skip the wizard
ansible-craft new role "redis cache server" --quick
```

### Preview Mode

```bash
# See what would be generated without writing files
ansible-craft new role "postgresql database" --dry-run
```

### CI/CD Mode

```bash
# Non-interactive with auto-fix and JSON output
ansible-craft new role "nginx" \
  --no-interactive \
  --fix \
  --quiet \
  --json > result.json
```

### Complex Roles

```bash
# Use Opus model for complex requirements
ansible-craft new role "kubernetes cluster with etcd, networking, and storage classes" --complex
```

## Generated Structure

The command generates a Galaxy-standard role structure:

```
nginx/
├── tasks/
│   └── main.yml           # Main task file
├── handlers/
│   └── main.yml           # Handler definitions
├── templates/
│   └── *.j2               # Jinja2 templates
├── defaults/
│   └── main.yml           # Default variables
├── vars/
│   └── main.yml           # Role variables
├── files/                 # Static files (if needed)
├── meta/
│   └── main.yml           # Role metadata
├── molecule/              # (if Molecule selected)
│   └── default/
│       ├── molecule.yml
│       ├── converge.yml
│       └── verify.yml
└── README.md              # Role documentation
```

## Workflow

1. **Wizard Phase**: Answer clarifying questions about platforms, Ansible version, etc.
2. **Plan Phase**: AI generates a plan preview showing tasks, variables, handlers
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
                     ROLE GENERATION PLAN
═══════════════════════════════════════════════════════════════

Role Name: nginx
Description: nginx web server with SSL and gzip compression

Tasks:
  • Install nginx package
  • Deploy nginx.conf template
  • Deploy SSL certificates
  • Configure gzip compression
  • Enable and start nginx service

Variables:
  • nginx_ssl_certificate: /etc/ssl/certs/server.crt
  • nginx_ssl_key: /etc/ssl/private/server.key
  • nginx_gzip_types: [text/plain, application/json, ...]

Handlers:
  • Restart nginx
  • Reload nginx

Templates:
  • nginx.conf.j2
  • ssl.conf.j2

═══════════════════════════════════════════════════════════════

? Accept this plan?
❯ Accept
  Modify
  Reject
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - role generated |
| 1 | Error - generation failed |
| 2 | User cancelled |

## JSON Output

With `--json`, returns structured output:

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

## Tips

### Writing Good Descriptions

**Be specific:**
- Include technology versions when relevant
- Mention specific features you need
- Include target platform if it matters

**Examples:**

```bash
# Good - specific and clear
ansible-craft new role "nginx reverse proxy with SSL from Let's Encrypt, gzip compression, and rate limiting for Ubuntu 22.04"

# Too vague - generates generic role
ansible-craft new role "setup nginx"
```

### Handling Existing Directories

By default, the command will prompt before overwriting an existing directory:

```
Directory 'nginx' already exists.
? Overwrite? (y/N)
```

Use `--force` to skip this prompt in scripts.

### Combining with Playbooks

Generated roles work with `new playbook`:

```bash
# Generate roles first
ansible-craft new role "nginx" -o ./roles/
ansible-craft new role "postgresql" -o ./roles/

# Then create a playbook that uses them
ansible-craft new playbook "deploy web app with nginx and postgresql"
```

## Related

- **[new playbook](new-playbook.md)** - Generate playbooks
- **[Wizards Guide](../wizards.md)** - Understanding the wizard
- **[Validation Guide](../validation.md)** - Understanding validation
- **[config defaults](config.md#config-defaults)** - Save wizard preferences
