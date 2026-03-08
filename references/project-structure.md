# Ansible Project Directory Structure

## Overview

This document describes the two recommended project layouts for Ansible infrastructure automation.

## Single-Environment Layout

Simple structure with inventory files at root level. Best for smaller projects or when environments share similar configurations.

```
project-name/
├── production              # INI inventory file
├── staging                 # INI inventory file
├── group_vars/
│   ├── all.yml             # Variables for all groups
│   ├── webservers.yml      # Webserver-specific vars
│   └── databases.yml       # Database-specific vars
├── host_vars/
│   └── hostname.yml        # Host-specific variables
├── roles/                  # Custom and external roles
├── site.yml                # Main playbook
├── webservers.yml          # Webserver playbook
├── databases.yml           # Database playbook
├── ansible.cfg             # Ansible configuration
├── .gitignore              # Git ignore patterns
└── README.md               # Project documentation
```

### Usage

```bash
# Run against production
ansible-playbook -i production site.yml

# Run against staging with check mode
ansible-playbook -i staging site.yml --check

# Run specific playbook
ansible-playbook -i production webservers.yml
```

## Multi-Environment Layout

Organized structure with separate inventory directories per environment. Best for complex projects with different configurations per environment.

```
project-name/
├── inventories/
│   ├── production/
│   │   ├── hosts               # INI inventory file
│   │   ├── group_vars/
│   │   │   ├── all.yml         # Production-wide vars
│   │   │   ├── webservers.yml
│   │   │   └── databases.yml
│   │   └── host_vars/
│   │       └── hostname.yml
│   └── staging/
│       ├── hosts
│       ├── group_vars/
│       │   ├── all.yml         # Staging-wide vars
│       │   ├── webservers.yml
│       │   └── databases.yml
│       └── host_vars/
├── playbooks/                  # Additional playbooks
├── roles/                      # Custom and external roles
├── site.yml                    # Main playbook
├── ansible.cfg                 # Ansible configuration
├── .gitignore
└── README.md
```

### Usage

```bash
# Run against production
ansible-playbook -i inventories/production site.yml

# Run against staging
ansible-playbook -i inventories/staging site.yml
```

## File Templates

### Inventory File (INI format)

```ini
# production inventory

[webservers]
web01.example.com
web02.example.com

[databases]
db01.example.com

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

### group_vars/all.yml

```yaml
---
# Variables that apply to all groups

# Environment identifier (auto-detected from inventory path)
# environment: "{{ inventory_dir | basename }}"

# Common settings
timezone: UTC
ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org
```

### group_vars/webservers.yml

```yaml
---
# Variables for webservers group

http_port: 80
https_port: 443
# document_root: /var/www/html
```

### group_vars/databases.yml

```yaml
---
# Variables for databases group

db_port: 5432
# db_max_connections: 100
```

### site.yml (Main Playbook)

```yaml
---
# Main site playbook

- name: Apply common configuration
  hosts: all
  become: true
  roles:
    - role: common
      tags: common

- name: Configure web servers
  ansible.builtin.import_playbook: webservers.yml

- name: Configure databases
  ansible.builtin.import_playbook: databases.yml
```

### ansible.cfg

```ini
[defaults]
inventory = production
roles_path = ./roles
host_key_checking = False
stdout_callback = yaml
# retry_files_enabled = False

[privilege_escalation]
become = True
become_method = sudo
# become_user = root

[ssh_connection]
pipelining = True
```

### .gitignore

```gitignore
# Ansible
*.retry
*.log
*.vault
vault_pass.txt
.vault_pass

# Sensitive files
credentials.yml
secrets.yml
*.pem
*.key

# Python
__pycache__/
*.py[cod]
.venv/
venv/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Molecule
.molecule/
.cache/
```

## Optional Directories

### library/

Custom Ansible modules specific to your project.

```
library/
├── my_module.py
└── another_module.py
```

### module_utils/

Shared utility code for custom modules.

```
module_utils/
└── common.py
```

### filter_plugins/

Custom Jinja2 filters.

```
filter_plugins/
└── custom_filters.py
```

Example filter:

```python
# filter_plugins/custom_filters.py
def reverse_string(value):
    return value[::-1]

class FilterModule:
    def filters(self):
        return {'reverse_string': reverse_string}
```

## Best Practices

1. **Use descriptive group names** that reflect server function
2. **Separate sensitive data** using ansible-vault
3. **Keep inventory groups flat** - avoid deep nesting
4. **Use host_vars sparingly** - prefer group_vars when possible
5. **Document variables** in README and variable files
6. **Pin role versions** when using external roles
7. **Use tags** for selective execution
8. **Run with --check** before applying changes
