# explain Command

Get plain English explanations of existing Ansible code.

## Synopsis

```bash
ansible-craft explain <path> [options]
```

## Description

The `explain` command analyzes existing Ansible code and provides human-readable explanations of what the code does. It supports:

- Single files (playbooks, task files)
- Complete roles (analyzes all role files)
- Complex nested structures

## Arguments

| Argument | Description |
|----------|-------------|
| `<path>` | Path to a file or role directory to explain |

## Options

| Option | Description |
|--------|-------------|
| `--playbook <path>` | Provide context from a related playbook or role |
| `--complex` | Use Claude Opus for deeper analysis (higher cost) |
| `-q, --quiet` | Suppress progress output |

## Examples

### Explain a Playbook

```bash
ansible-craft explain site.yml
```

Output:
```
This playbook deploys a web application across multiple server groups:

1. **Configure Load Balancers** (hosts: loadbalancers)
   - Installs and configures HAProxy
   - Sets up SSL termination with Let's Encrypt certificates
   - Configures backend server pools

2. **Configure Web Servers** (hosts: webservers)
   - Installs Nginx and PHP-FPM
   - Deploys application code from Git
   - Configures virtual hosts

3. **Configure Databases** (hosts: databases)
   - Installs PostgreSQL 15
   - Creates application database and user
   - Configures replication (if replica hosts defined)

Variables used:
- `app_domain`: The domain name for the application
- `db_password`: Database password (should be vaulted)
- `ssl_email`: Email for Let's Encrypt registration
```

### Explain a Role

```bash
ansible-craft explain ./roles/nginx/
```

The command reads all role files and provides a comprehensive explanation:

```
Role: nginx

Purpose: Installs and configures Nginx web server with SSL support.

Tasks (tasks/main.yml):
1. Install Nginx package
2. Deploy main nginx.conf from template
3. Deploy SSL certificates (when nginx_ssl_enabled is true)
4. Create virtual host configurations
5. Enable and start Nginx service

Variables:
- nginx_worker_processes (default: auto) - Number of worker processes
- nginx_ssl_enabled (default: false) - Enable SSL configuration
- nginx_ssl_certificate - Path to SSL certificate
- nginx_ssl_key - Path to SSL private key

Handlers:
- restart nginx - Restarts service on configuration changes
- reload nginx - Reloads configuration without restart

Templates:
- nginx.conf.j2 - Main Nginx configuration
- vhost.conf.j2 - Virtual host configuration

Dependencies:
- None declared in meta/main.yml
```

### Explain with Context

When explaining a role, provide playbook context for better analysis:

```bash
ansible-craft explain ./roles/nginx/ --playbook site.yml
```

This helps the AI understand:
- What variables are passed to the role
- How the role is used in the broader deployment
- Relationships with other roles

### Deep Analysis

For complex code, use the Opus model:

```bash
ansible-craft explain ./roles/kubernetes/ --complex
```

This provides:
- More detailed explanations
- Security considerations
- Performance implications
- Best practice suggestions

## Confidence Indicators

The explain command includes confidence indicators for complex code:

```
[High Confidence] This task installs the nginx package using apt.

[Medium Confidence] This conditional appears to check for Debian-based
systems, but the variable `ansible_os_family` comparison could also
match derivative distributions.

[Low Confidence] The purpose of this shell command is unclear. It appears
to modify a configuration file, but the sed pattern is complex.
```

**Confidence levels:**
- **High**: Clear, well-documented code
- **Medium**: Standard patterns but some ambiguity
- **Low**: Complex logic or unclear intent

## What Gets Analyzed

### For Files

```bash
ansible-craft explain playbook.yml
```

Analyzes:
- Play structure and hosts
- Task sequence and purpose
- Variables and their usage
- Handlers and notifications
- Includes/imports

### For Roles

```bash
ansible-craft explain ./roles/nginx/
```

Analyzes:
- `tasks/main.yml` - Main tasks
- `handlers/main.yml` - Handlers
- `defaults/main.yml` - Default variables
- `vars/main.yml` - Role variables
- `templates/*.j2` - Templates (structure, not full content)
- `meta/main.yml` - Dependencies
- `README.md` - Existing documentation

## Output Format

Explanations follow this structure:

1. **Overview** - High-level purpose
2. **Plays/Tasks** - Step-by-step breakdown
3. **Variables** - Variables and their purposes
4. **Handlers** - Trigger conditions and actions
5. **Notes** - Security considerations, best practices

## Tips

### Getting Better Explanations

**Provide context:**
```bash
# Better - with context
ansible-craft explain ./roles/app/ --playbook deploy.yml

# Less context - may miss variable meanings
ansible-craft explain ./roles/app/
```

**Use complex for intricate code:**
```bash
# For Kubernetes, complex networking, etc.
ansible-craft explain ./roles/k8s-networking/ --complex
```

### Explaining Specific Files

```bash
# Just the main tasks
ansible-craft explain ./roles/nginx/tasks/main.yml

# A specific task file
ansible-craft explain ./roles/nginx/tasks/ssl.yml
```

### Understanding Unfamiliar Code

When working with inherited or unfamiliar code:

1. Start with the main playbook: `ansible-craft explain site.yml`
2. Drill into specific roles: `ansible-craft explain ./roles/web/`
3. Investigate complex tasks: `ansible-craft explain ./roles/web/tasks/deploy.yml`

## Limitations

- Cannot execute code or test it
- May misinterpret highly custom modules
- Vault-encrypted content is shown as encrypted
- Very large roles may be summarized

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (file not found, parse error, etc.) |

## Related

- **[fix Command](fix.md)** - Fix Ansible errors
- **[new role](new-role.md)** - Generate new roles
- **[Troubleshooting](../troubleshooting.md)** - Common issues
