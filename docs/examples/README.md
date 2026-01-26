# Examples

Sample ansible-craft generations and use cases.

## Example Roles

Explore generated roles with complete outputs:

- **[nginx-ssl](generated-roles/nginx-ssl/)** - Nginx reverse proxy with SSL certificates
- **[postgresql-ha](generated-roles/postgresql-ha/)** - PostgreSQL with high availability
- **[docker-swarm](generated-roles/docker-swarm/)** - Docker Swarm cluster setup

Each example includes:
- Complete role directory structure
- Generated YAML files
- Templates
- Documentation
- Validation results

## Example Playbooks

Explore generated playbooks:

- **[lamp-stack](generated-playbooks/lamp-stack/)** - Complete LAMP stack deployment
- **[k8s-cluster](generated-playbooks/k8s-cluster/)** - Kubernetes cluster setup
- **[monitoring-setup](generated-playbooks/monitoring-setup/)** - Prometheus + Grafana stack

Each example includes:
- Complete playbook structure
- Inventory examples
- Group variables
- Documentation

## Use Cases

Real-world scenarios and integration patterns:

- **[CI/CD Integration](use-cases/ci-cd-integration.md)** - Integrate with GitHub Actions, GitLab CI, Jenkins
- **[Team Workflows](use-cases/team-workflows.md)** - Collaborative development patterns
- **[Large-Scale Deployments](use-cases/large-scale.md)** - Managing multiple roles and playbooks

## Quick Examples

### Simple Role Generation

```bash
$ ansible-craft new role "redis cache server with persistence"

✓ Plan generated successfully

📋 Plan Preview:
Role: redis
Description: Redis cache server with AOF persistence and cluster support

Tasks:
  - Install Redis from official repository
  - Configure Redis with optimal settings
  - Enable AOF persistence
  - Setup Redis as systemd service
  - Configure firewall rules

Variables:
  - redis_version: "7.2"
  - redis_port: 6379
  - redis_bind: "127.0.0.1"
  - redis_maxmemory: "2gb"
  - redis_persistence: "aof"

? Accept this plan? (Y/n) y

✓ Code generated successfully
✓ YAML syntax validated
✓ FQCN compliance checked
✓ ansible-lint passed

✓ Role created: ./redis/

Files created:
  ✓ tasks/main.yml (1.2 KB)
  ✓ handlers/main.yml (345 B)
  ✓ defaults/main.yml (567 B)
  ✓ templates/redis.conf.j2 (2.3 KB)
  ✓ meta/main.yml (234 B)
  ✓ README.md (1.8 KB)
```

### Complex Playbook Generation

```bash
$ ansible-craft new playbook "deploy Django web app with Nginx, PostgreSQL, Redis, and Celery workers"

✓ Plan generated successfully

📋 Plan Preview:
Playbook: django-deployment
Description: Full-stack Django deployment with web, database, cache, and task queue

Plays:
  1. Database Setup (hosts: databases)
     - Install PostgreSQL 15
     - Create application database
     - Configure remote access
     - Setup automated backups

  2. Cache Setup (hosts: cache)
     - Install Redis
     - Configure Redis for session storage
     - Setup persistence

  3. Application Deployment (hosts: webservers)
     - Install Python 3.11 and dependencies
     - Clone Django application
     - Run migrations
     - Collect static files
     - Setup Gunicorn service

  4. Task Queue (hosts: workers)
     - Setup Celery workers
     - Configure Celery beat for scheduled tasks
     - Setup Flower for monitoring

  5. Web Server (hosts: webservers)
     - Install Nginx
     - Configure reverse proxy
     - Setup SSL with Let's Encrypt
     - Configure static file serving

? Accept this plan? (Y/n) y

✓ Playbook generated successfully

✓ Playbook created: ./django-deployment/

Files created:
  ✓ playbook.yml (3.4 KB)
  ✓ inventory.example (678 B)
  ✓ group_vars/all.yml (1.2 KB)
  ✓ group_vars/webservers.yml (890 B)
  ✓ group_vars/databases.yml (567 B)
  ✓ README.md (2.3 KB)
```

### Explaining Existing Code

```bash
$ ansible-craft explain ./roles/nginx/

📖 Explanation:

This Nginx role configures a production-ready web server with the following capabilities:

**Main Tasks:**
1. **Package Installation**
   - Installs Nginx from official repository
   - Ensures latest stable version

2. **Configuration**
   - Sets up main nginx.conf with performance tuning
   - Configures worker_processes and worker_connections
   - Enables gzip compression for better performance

3. **SSL Setup**
   - Installs Certbot for Let's Encrypt
   - Generates SSL certificates
   - Configures automatic renewal via cron

4. **Virtual Hosts**
   - Creates site configuration from template
   - Enables reverse proxy to upstream application
   - Sets up proper headers (HSTS, CSP)

5. **Security Hardening**
   - Configures firewall rules (UFW)
   - Sets up rate limiting
   - Removes default site
   - Hides Nginx version

**Variables:**
- nginx_worker_processes: Auto-detect based on CPU cores
- nginx_worker_connections: 1024 (can handle ~1000 concurrent connections)
- ssl_certificate_email: Required for Let's Encrypt registration
- upstream_server: Backend application server (default: localhost:3000)

**Prerequisites:**
- Ubuntu 20.04+ or Debian 11+
- Sudo privileges
- DNS records pointing to the server

**Usage:**
ansible-playbook -i inventory site.yml --tags nginx
```

### Fixing Errors

```bash
$ ansible-craft fix "FAILED! => {'msg': 'The conditional check nginx_ssl_enabled failed. The error was: nginx_ssl_enabled is undefined'}"

🔧 Error Analysis:

**What this error means:**
The variable 'nginx_ssl_enabled' is being used in a conditional statement (when clause) but hasn't been defined anywhere in your Ansible code.

**Likely causes:**
1. Variable not defined in defaults/main.yml or vars/main.yml
2. Typo in variable name (e.g., nginx_ssl vs nginx_ssl_enabled)
3. Variable expected to be passed via extra vars but wasn't
4. Variable defined in a different scope (host_vars vs role vars)

**How to fix it:**

Option 1: Add to defaults/main.yml
```yaml
# defaults/main.yml
nginx_ssl_enabled: true
nginx_ssl_cert_path: "/etc/ssl/certs/nginx.crt"
nginx_ssl_key_path: "/etc/ssl/private/nginx.key"
```

Option 2: Add to inventory
```ini
# inventory/group_vars/webservers.yml
nginx_ssl_enabled: true
```

Option 3: Pass as extra variable
```bash
ansible-playbook site.yml -e "nginx_ssl_enabled=true"
```

**Best practice:**
Define boolean flags in defaults/main.yml with sensible defaults:
```yaml
nginx_ssl_enabled: false  # Default to false for safety
```
```

## Generating Examples

### Simple Web Server

```bash
ansible-craft new role "Apache web server with PHP 8.2"
```

### Database with Replication

```bash
ansible-craft new role "MySQL 8.0 with primary-replica replication and automated backups"
```

### Container Orchestration

```bash
ansible-craft new role "Docker Swarm cluster with GlusterFS shared storage"
```

### Security Hardening

```bash
ansible-craft new role "CIS Level 1 security hardening for Ubuntu 22.04"
```

### Monitoring Stack

```bash
ansible-craft new playbook "Deploy Prometheus, Grafana, and AlertManager for infrastructure monitoring"
```

## Tips for Better Results

### Be Specific

❌ **Vague**: "web server"
✅ **Specific**: "Nginx 1.24 reverse proxy with SSL via Let's Encrypt, rate limiting, and custom error pages"

### Include Versions

❌ **No version**: "install postgresql"
✅ **With version**: "install PostgreSQL 15 with streaming replication"

### Specify Requirements

❌ **Basic**: "docker setup"
✅ **Detailed**: "Docker CE with Docker Compose, configured for production with log rotation and resource limits"

### Mention Target OS

❌ **Generic**: "install packages"
✅ **Specific**: "install packages on Ubuntu 22.04 with fallback for Debian 11"

## Next Steps

- **Try Examples**: Run the example commands above
- **Explore Generated Code**: See the [generated-roles/](generated-roles/) directory
- **Learn Patterns**: Review [use-cases/](use-cases/) for integration patterns
- **Read Documentation**: [User Guide](../user-guide/README.md) for more details
