# Large Scale Projects

Patterns for using ansible-craft in large multi-role, multi-playbook projects.

## Overview

This guide covers strategies for:
- Organizing large Ansible codebases
- Generating multiple related roles
- Managing complex playbook structures
- Maintaining consistency at scale

## Project Structure

### Recommended Layout

```
infrastructure/
├── ansible.cfg                 # Ansible configuration
├── inventory/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   ├── staging/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   └── development/
│       ├── hosts.yml
│       └── group_vars/
├── playbooks/
│   ├── site.yml                # Master playbook
│   ├── webservers.yml
│   ├── databases.yml
│   └── monitoring.yml
├── roles/
│   ├── internal/               # Project-specific roles
│   │   ├── app_deploy/
│   │   ├── app_config/
│   │   └── ...
│   └── common/                 # Shared/reusable roles
│       ├── nginx/
│       ├── postgresql/
│       └── ...
├── collections/
│   └── requirements.yml        # Galaxy collections
├── group_vars/
│   └── all/
│       ├── vars.yml
│       └── vault.yml
├── host_vars/
├── files/
├── templates/
├── Makefile
└── README.md
```

## Multi-Role Generation

### Sequential Generation

Generate related roles that work together:

```bash
#!/bin/bash
# generate-stack.sh - Generate a complete application stack

set -e

OUTPUT_DIR="roles/common"

# Define the stack
declare -A STACK=(
    ["nginx"]="nginx reverse proxy with SSL, rate limiting, and upstream load balancing"
    ["postgresql"]="postgresql 15 with streaming replication and pgbouncer connection pooling"
    ["redis"]="redis cluster with sentinel for high availability"
    ["app"]="application deployment role with blue-green deployment support"
)

# Generate each role
for role in "${!STACK[@]}"; do
    echo "=== Generating $role ==="
    ansible-craft new role "${STACK[$role]}" \
        -n "$role" \
        -o "$OUTPUT_DIR" \
        --no-interactive \
        --fix \
        --json > "logs/${role}.json"

    if jq -e '.success' "logs/${role}.json" > /dev/null; then
        echo "✓ $role complete"
    else
        echo "✗ $role failed"
        exit 1
    fi
done

echo "Stack generation complete"
```

### Parallel Generation

For faster generation, use parallel execution:

```bash
#!/bin/bash
# generate-parallel.sh

OUTPUT_DIR="roles"
PIDS=()

generate_role() {
    local name="$1"
    local description="$2"

    ansible-craft new role "$description" \
        -n "$name" \
        -o "$OUTPUT_DIR" \
        --no-interactive \
        --fix \
        --quiet \
        --json > "logs/${name}.json" 2>&1

    echo "$name:$?"
}

# Start parallel generation
generate_role "nginx" "nginx reverse proxy" &
PIDS+=($!)

generate_role "postgresql" "postgresql database" &
PIDS+=($!)

generate_role "redis" "redis cache" &
PIDS+=($!)

# Wait for all to complete
for pid in "${PIDS[@]}"; do
    wait $pid
done

echo "All roles generated"
```

## Role Composition

### Base + Specialized Roles

Generate a base role and specialized variants:

```bash
# Base nginx role
ansible-craft new role "nginx web server base installation and configuration" \
    -n nginx_base -o roles/

# Specialized variants
ansible-craft new role "nginx reverse proxy extending nginx_base with upstream and SSL" \
    -n nginx_proxy -o roles/

ansible-craft new role "nginx static file server extending nginx_base with caching" \
    -n nginx_static -o roles/
```

### Role Dependencies

Define dependencies in `meta/main.yml`:

```yaml
# roles/nginx_proxy/meta/main.yml
dependencies:
  - role: nginx_base
  - role: ssl_certificates
    vars:
      ssl_domains: "{{ nginx_proxy_domains }}"
```

## Playbook Generation

### Master Playbook

Generate a master playbook that orchestrates multiple plays:

```bash
ansible-craft new playbook "deploy complete web application stack with:
- Load balancers (HAProxy)
- Web servers (Nginx + PHP-FPM)
- Application servers (Node.js)
- Database cluster (PostgreSQL with replication)
- Cache layer (Redis)
- Monitoring (Prometheus + Grafana)

Using roles: haproxy, nginx, php_fpm, nodejs_app, postgresql, redis, prometheus, grafana

With staging and production environment support" \
    -n site \
    -o playbooks/
```

### Environment-Specific Playbooks

```bash
# Generate environment-specific variants
ansible-craft new playbook "deploy staging environment with single instances" \
    -n staging -o playbooks/

ansible-craft new playbook "deploy production environment with HA and clustering" \
    -n production -o playbooks/
```

## Inventory Management

### Group Structure

```yaml
# inventory/production/hosts.yml
all:
  children:
    loadbalancers:
      hosts:
        lb1.prod.example.com:
        lb2.prod.example.com:

    webservers:
      hosts:
        web[1:5].prod.example.com:

    appservers:
      hosts:
        app[1:3].prod.example.com:

    databases:
      children:
        db_primary:
          hosts:
            db1.prod.example.com:
        db_replicas:
          hosts:
            db2.prod.example.com:
            db3.prod.example.com:

    caching:
      hosts:
        redis[1:3].prod.example.com:

    monitoring:
      hosts:
        monitor.prod.example.com:
```

### Group Variables

Generate roles with variables that match your inventory structure:

```bash
# When generating, mention the group structure
ansible-craft new role "nginx configured for webservers group with backend appservers" \
    -n nginx -o roles/
```

## Makefile Automation

### Comprehensive Makefile

```makefile
# Makefile for large Ansible project

.PHONY: help generate-all generate-role lint test deploy

# Default target
help:
	@echo "Usage:"
	@echo "  make generate-all     - Generate all standard roles"
	@echo "  make generate-role    - Generate single role (ROLE=name DESC=description)"
	@echo "  make lint             - Lint all roles and playbooks"
	@echo "  make test             - Run Molecule tests"
	@echo "  make deploy ENV=prod  - Deploy to environment"

# Generate all standard roles
generate-all:
	@echo "Generating standard roles..."
	@./scripts/generate-stack.sh

# Generate single role
generate-role:
	@if [ -z "$(DESC)" ] || [ -z "$(ROLE)" ]; then \
		echo "Usage: make generate-role ROLE=name DESC='description'"; \
		exit 1; \
	fi
	ansible-craft new role "$(DESC)" -n "$(ROLE)" -o roles/ --fix

# Lint everything
lint:
	@echo "Linting roles..."
	ansible-lint roles/
	@echo "Linting playbooks..."
	ansible-lint playbooks/

# Run tests
test:
	@for role in roles/*/; do \
		if [ -d "$$role/molecule" ]; then \
			echo "Testing $$role"; \
			(cd $$role && molecule test) || exit 1; \
		fi \
	done

# Deploy
deploy:
	@if [ -z "$(ENV)" ]; then \
		echo "Usage: make deploy ENV=staging|production"; \
		exit 1; \
	fi
	ansible-playbook -i inventory/$(ENV) playbooks/site.yml

# Verify inventory
verify:
	ansible-inventory -i inventory/$(ENV) --list

# Generate documentation
docs:
	@echo "# Role Documentation" > ROLES.md
	@for role in roles/*/; do \
		echo "" >> ROLES.md; \
		echo "## $$(basename $$role)" >> ROLES.md; \
		if [ -f "$$role/README.md" ]; then \
			cat "$$role/README.md" >> ROLES.md; \
		fi; \
	done
```

## Variable Hierarchy

### Organizing Variables

```
group_vars/
├── all/
│   ├── vars.yml           # Common variables
│   ├── vault.yml          # Encrypted secrets
│   └── generated.yml      # Auto-generated reference
├── webservers/
│   ├── vars.yml
│   └── vault.yml
├── databases/
│   ├── vars.yml
│   └── vault.yml
└── ...
```

### Generated Variable Reference

Create a reference file from generated role defaults:

```bash
#!/bin/bash
# generate-var-reference.sh

echo "# Generated Variable Reference" > group_vars/all/generated.yml
echo "# DO NOT EDIT - regenerate with scripts/generate-var-reference.sh" >> group_vars/all/generated.yml
echo "" >> group_vars/all/generated.yml

for role in roles/*/defaults/main.yml; do
    role_name=$(basename $(dirname $(dirname $role)))
    echo "# --- $role_name ---" >> group_vars/all/generated.yml
    cat "$role" >> group_vars/all/generated.yml
    echo "" >> group_vars/all/generated.yml
done
```

## Testing Strategy

### Multi-Role Testing

```yaml
# molecule/default/converge.yml
---
- name: Converge - Full Stack
  hosts: all
  tasks:
    - name: Include nginx role
      ansible.builtin.include_role:
        name: nginx

    - name: Include postgresql role
      ansible.builtin.include_role:
        name: postgresql

    - name: Include redis role
      ansible.builtin.include_role:
        name: redis
```

### Integration Testing

```yaml
# molecule/integration/molecule.yml
---
driver:
  name: docker
platforms:
  - name: loadbalancer
    image: ubuntu:22.04
    groups:
      - loadbalancers
  - name: web1
    image: ubuntu:22.04
    groups:
      - webservers
  - name: db1
    image: ubuntu:22.04
    groups:
      - databases
provisioner:
  name: ansible
  playbooks:
    converge: ../../playbooks/site.yml
```

## Maintenance

### Keeping Roles Updated

```bash
#!/bin/bash
# regenerate-role.sh - Regenerate a role while preserving customizations

ROLE="$1"
BACKUP_DIR=".role-backups/$(date +%Y%m%d)"

# Backup current role
mkdir -p "$BACKUP_DIR"
cp -r "roles/$ROLE" "$BACKUP_DIR/"

# Store custom modifications
CUSTOM_FILES=(
    "tasks/custom.yml"
    "templates/custom/"
    "vars/custom.yml"
)

# Regenerate
ansible-craft new role "$(cat roles/$ROLE/.description)" \
    -n "$ROLE" \
    -o roles/ \
    --force \
    --fix

# Restore custom files
for file in "${CUSTOM_FILES[@]}"; do
    if [ -e "$BACKUP_DIR/$ROLE/$file" ]; then
        cp -r "$BACKUP_DIR/$ROLE/$file" "roles/$ROLE/$file"
    fi
done

echo "Role $ROLE regenerated. Backup in $BACKUP_DIR"
```

### Version Control

```gitignore
# .gitignore for Ansible project

# Generated logs
logs/*.json

# Backups
.role-backups/

# Local overrides
*.local.yml

# Sensitive files
**/vault.yml

# Molecule
.molecule/
.cache/
```

## Related

- **[CI/CD Integration](ci-cd-integration.md)** - Automation examples
- **[Team Workflows](team-workflows.md)** - Team collaboration
- **[Configuration](../../user-guide/configuration.md)** - Config options
