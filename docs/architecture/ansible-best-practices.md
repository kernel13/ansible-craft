# Ansible Best Practices

This document defines the Ansible best practices enforced by ansible-craft for generating production-ready roles and playbooks. All generated code adheres to these standards, which align with Ansible official documentation, Galaxy requirements, and community best practices.

## Table of Contents

1. [Introduction](#introduction)
2. [Role Structure](#role-structure)
3. [Playbook Structure](#playbook-structure)
4. [FQCN Requirements](#fqcn-requirements)
5. [Idempotency Patterns](#idempotency-patterns)
6. [YAML Formatting](#yaml-formatting)
7. [Naming Conventions](#naming-conventions)
8. [Variable Precedence](#variable-precedence)
9. [Handler Best Practices](#handler-best-practices)
10. [Ansible-Lint Compliance](#ansible-lint-compliance)
11. [Task Ordering](#task-ordering)
12. [Play Organization](#play-organization)
13. [Security Practices](#security-practices)
14. [Testing with Molecule](#testing-with-molecule)

---

## Introduction

### Purpose

This document serves as the authoritative reference for Ansible standards enforced by ansible-craft. When generating roles and playbooks, the tool ensures:

- Galaxy-standard directory structure
- Full FQCN compliance for all modules
- Idempotent task design
- Consistent YAML formatting
- Production profile lint compliance

### How ansible-craft Enforces These Practices

1. **Generation Phase**: Prompts include these standards; output follows all conventions
2. **Validation Phase**: Static checks verify FQCN, variable naming, formatting
3. **Linting Phase**: ansible-lint with production profile catches remaining issues
4. **Auto-Fix Phase**: Common violations automatically corrected

---

## Role Structure

### Galaxy-Standard Directory Layout

```
role_name/
├── README.md                 # Documentation (REQUIRED)
├── defaults/
│   └── main.yml              # Default variables (REQUIRED)
├── vars/
│   └── main.yml              # Internal variables
├── tasks/
│   └── main.yml              # Main entry point (REQUIRED)
├── handlers/
│   └── main.yml              # Event handlers
├── templates/
│   └── *.j2                  # Jinja2 templates
├── files/
│   └── *                     # Static files
├── meta/
│   └── main.yml              # Role metadata (REQUIRED)
└── molecule/
    └── default/
        ├── molecule.yml      # Test configuration
        ├── converge.yml      # Test playbook
        └── verify.yml        # Verification tests
```

### Required Files

| File | Purpose |
|------|---------|
| `README.md` | User documentation with variables, examples |
| `defaults/main.yml` | User-overridable default variables |
| `tasks/main.yml` | Entry point for role execution |
| `meta/main.yml` | Galaxy metadata, dependencies, platforms |

### File Purposes

#### defaults/main.yml

User-overridable variables with sensible defaults:

```yaml
---
# Role default variables for nginx
# These can be overridden in playbooks or inventory

# Package settings
nginx_package_name: "nginx"
nginx_version: "latest"

# Paths
nginx_config_path: "/etc/nginx"
nginx_log_path: "/var/log/nginx"

# Service settings
nginx_service_name: "nginx"
nginx_service_enabled: true
nginx_service_state: "started"

# Configuration
nginx_port: 80
nginx_worker_processes: "auto"
```

#### vars/main.yml

Internal variables not meant for user override:

```yaml
---
# Internal role variables - not meant to be overridden

nginx_supported_os:
  - Ubuntu
  - Debian
  - RedHat

nginx_packages:
  Debian:
    - nginx
    - nginx-extras
  RedHat:
    - nginx
```

#### tasks/main.yml

Entry point that orchestrates task files:

```yaml
---
# Main task entry point

- name: Validate operating system
  ansible.builtin.assert:
    that:
      - ansible_os_family in nginx_supported_os
    fail_msg: "Unsupported OS: {{ ansible_os_family }}"
  tags:
    - nginx
    - validation

- name: Install nginx
  ansible.builtin.include_tasks:
    file: install.yml
  tags:
    - nginx
    - install

- name: Configure nginx
  ansible.builtin.include_tasks:
    file: configure.yml
  tags:
    - nginx
    - config

- name: Manage nginx service
  ansible.builtin.include_tasks:
    file: service.yml
  tags:
    - nginx
    - service
```

#### handlers/main.yml

Event-triggered tasks using the `listen` directive:

```yaml
---
# Event-triggered tasks

- name: Restart nginx
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: restarted
  listen: Restart nginx

- name: Reload nginx
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: reloaded
  listen: Reload nginx
```

#### meta/main.yml

Galaxy metadata with platforms and dependencies:

```yaml
---
galaxy_info:
  role_name: nginx
  namespace: ansible_craft
  author: ansible-craft
  description: Install and configure nginx web server
  license: MIT
  min_ansible_version: "2.14"

  platforms:
    - name: Ubuntu
      versions:
        - jammy
        - noble
    - name: EL
      versions:
        - "9"

  galaxy_tags:
    - web
    - nginx
    - proxy

dependencies: []

collections:
  - name: ansible.builtin
    version: ">=2.14.0"
```

---

## Playbook Structure

### Directory Layout

```
playbook_name/
├── playbook.yml              # Main playbook (REQUIRED)
├── inventory.example         # Example inventory (REQUIRED)
├── group_vars/
│   ├── all.yml               # Global variables (REQUIRED)
│   └── [group].yml           # Per-group variables
├── host_vars/
│   └── [hostname].yml        # Per-host variables
├── files/
│   └── *                     # Static files
├── templates/
│   └── *.j2                  # Jinja2 templates
└── README.md                 # Usage instructions (REQUIRED)
```

### Single Play Playbook

```yaml
---
- name: Deploy application
  hosts: webservers
  become: true
  gather_facts: true

  vars:
    app_name: myapp
    app_port: 8080

  pre_tasks:
    - name: Validate required variables
      ansible.builtin.assert:
        that:
          - app_secret is defined
          - app_secret | length > 16
        fail_msg: "app_secret must be defined and at least 16 characters"

  tasks:
    - name: Install required packages
      ansible.builtin.apt:
        name: "{{ app_packages }}"
        state: present
        update_cache: true
        cache_valid_time: 3600

    - name: Deploy configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: "/etc/{{ app_name }}/config.yml"
        mode: '0640'
      notify: Restart application

  handlers:
    - name: Restart application
      ansible.builtin.systemd_service:
        name: "{{ app_name }}"
        state: restarted

  post_tasks:
    - name: Verify application is responding
      ansible.builtin.uri:
        url: "http://localhost:{{ app_port }}/health"
        status_code: 200
      retries: 5
      delay: 10
```

### Multi-Play Playbook

```yaml
---
# Play 1: Database servers
- name: Configure database servers
  hosts: databases
  become: true

  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name:
          - postgresql
          - postgresql-contrib
        state: present

  handlers:
    - name: Restart PostgreSQL
      ansible.builtin.systemd_service:
        name: postgresql
        state: restarted

# Play 2: Web servers
- name: Configure web servers
  hosts: webservers
  become: true

  tasks:
    - name: Install nginx
      ansible.builtin.apt:
        name: nginx
        state: present

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd_service:
        name: nginx
        state: reloaded
```

---

## FQCN Requirements

All modules MUST use Fully Qualified Collection Names (FQCN). Short names are not permitted.

### Core Modules (ansible.builtin)

| Short Name | FQCN |
|------------|------|
| apt | ansible.builtin.apt |
| yum | ansible.builtin.yum |
| dnf | ansible.builtin.dnf |
| package | ansible.builtin.package |
| pip | ansible.builtin.pip |
| apt_repository | ansible.builtin.apt_repository |
| yum_repository | ansible.builtin.yum_repository |
| file | ansible.builtin.file |
| copy | ansible.builtin.copy |
| template | ansible.builtin.template |
| lineinfile | ansible.builtin.lineinfile |
| blockinfile | ansible.builtin.blockinfile |
| stat | ansible.builtin.stat |
| unarchive | ansible.builtin.unarchive |
| get_url | ansible.builtin.get_url |
| service | ansible.builtin.service |
| systemd | ansible.builtin.systemd_service |
| systemd_service | ansible.builtin.systemd_service |
| user | ansible.builtin.user |
| group | ansible.builtin.group |
| include_tasks | ansible.builtin.include_tasks |
| import_tasks | ansible.builtin.import_tasks |
| include_vars | ansible.builtin.include_vars |
| set_fact | ansible.builtin.set_fact |
| debug | ansible.builtin.debug |
| fail | ansible.builtin.fail |
| assert | ansible.builtin.assert |
| command | ansible.builtin.command |
| shell | ansible.builtin.shell |
| uri | ansible.builtin.uri |
| wait_for | ansible.builtin.wait_for |
| reboot | ansible.builtin.reboot |

### Windows Modules (ansible.windows)

| Short Name | FQCN |
|------------|------|
| win_package | ansible.windows.win_package |
| win_feature | ansible.windows.win_feature |
| win_service | ansible.windows.win_service |
| win_file | ansible.windows.win_file |
| win_copy | ansible.windows.win_copy |
| win_template | ansible.windows.win_template |
| win_user | ansible.windows.win_user |
| win_group | ansible.windows.win_group |
| win_firewall_rule | ansible.windows.win_firewall_rule |
| win_reboot | ansible.windows.win_reboot |
| win_shell | ansible.windows.win_shell |
| win_command | ansible.windows.win_command |
| win_stat | ansible.windows.win_stat |
| win_uri | ansible.windows.win_uri |
| win_wait_for | ansible.windows.win_wait_for |

### Chocolatey Modules (chocolatey.chocolatey)

| Short Name | FQCN |
|------------|------|
| win_chocolatey | chocolatey.chocolatey.win_chocolatey |
| win_chocolatey_source | chocolatey.chocolatey.win_chocolatey_source |
| win_chocolatey_feature | chocolatey.chocolatey.win_chocolatey_feature |

### Community Modules

| Module | FQCN |
|--------|------|
| postgresql_db | community.postgresql.postgresql_db |
| postgresql_user | community.postgresql.postgresql_user |
| mysql_db | community.mysql.mysql_db |
| mysql_user | community.mysql.mysql_user |
| docker_container | community.docker.docker_container |
| docker_image | community.docker.docker_image |

---

## Idempotency Patterns

### 1. Always Specify State

Every module that supports `state` must have it explicitly set:

```yaml
# CORRECT - explicit state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

# WRONG - implicit state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
```

### 2. Use Handlers for Service Restarts

Never restart services inline; use handlers:

```yaml
# CORRECT - handler notification
- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
    mode: '0644'
  notify: Restart nginx

# handlers/main.yml
- name: Restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
  listen: Restart nginx

# WRONG - inline restart
- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf

- name: Restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted
```

### 3. Command Idempotency with creates/removes

```yaml
# CORRECT - idempotent with creates
- name: Initialize application
  ansible.builtin.command:
    cmd: /opt/app/init.sh
    creates: /opt/app/.initialized

# CORRECT - idempotent with removes
- name: Run cleanup script
  ansible.builtin.command:
    cmd: /opt/app/cleanup.sh
    removes: /opt/app/temp_data
```

### 4. Read-Only Commands with changed_when

Commands that only read data should never report changes:

```yaml
# CORRECT - read-only command
- name: Get current version
  ansible.builtin.command:
    cmd: cat /etc/app/VERSION
  register: app_version
  changed_when: false

# CORRECT - with failure control
- name: Check application status
  ansible.builtin.shell:
    cmd: /opt/app/status.sh
  register: status_result
  changed_when: false
  failed_when: false
```

### 5. Package Cache Control

```yaml
# CORRECT - cache control with valid time
- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600

# WRONG - always updates cache separately
- name: Update apt cache
  ansible.builtin.apt:
    update_cache: true

- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
```

---

## YAML Formatting

### Indentation

- Always use 2 spaces
- Never use tabs

### Boolean Values

```yaml
# CORRECT
become: true
enabled: false

# WRONG
become: yes
enabled: no
```

### Jinja2 Variables

Always quote strings containing Jinja2:

```yaml
# CORRECT - quoted
dest: "{{ app_config_path }}/config.yml"
name: "{{ package_name }}"

# WRONG - unquoted
dest: {{ app_config_path }}/config.yml
```

### File Modes

Always use quoted strings for file modes:

```yaml
# CORRECT - quoted string
mode: '0644'
mode: '0755'

# WRONG - octal or unquoted
mode: 0644
mode: 644
```

### Document Structure

```yaml
---
# File starts with document marker

# Content here

# File ends with newline
```

---

## Naming Conventions

### Variable Naming

All variables MUST be prefixed with the role name and use snake_case:

```yaml
# CORRECT - role-prefixed snake_case
nginx_port: 80
nginx_worker_processes: "auto"
nginx_ssl_enabled: true
apache_windows_install_path: 'C:\Apache24'

# WRONG - unprefixed or mixed case
port: 80
workerProcesses: auto
WorkerCount: 4
```

### Task Naming

Task names should:
- Start with an uppercase letter
- Be descriptive and action-oriented
- Follow sentence case

```yaml
# CORRECT
- name: Install nginx package
- name: Deploy configuration file
- name: Ensure service is running

# WRONG
- name: install nginx package
- name: nginx
- name: INSTALL NGINX
```

### Handler Naming

Handlers should match the action they perform:

```yaml
# CORRECT
- name: Restart nginx
  listen: Restart nginx

- name: Reload nginx
  listen: Reload nginx

# WRONG
- name: nginx restart
- name: Service handler
```

### Registered Variables

Use role prefix for registered variables:

```yaml
# CORRECT
register: nginx_config_result
register: nginx_version_check

# WRONG
register: result
register: config_check
```

---

## Variable Precedence

From lowest to highest precedence:

| Priority | Source | Override Level |
|----------|--------|----------------|
| 1 | role defaults | Lowest - always overridable |
| 2 | inventory file or script group vars | |
| 3 | inventory group_vars/all | |
| 4 | playbook group_vars/all | |
| 5 | inventory group_vars/* | |
| 6 | playbook group_vars/* | |
| 7 | inventory file or script host vars | |
| 8 | inventory host_vars/* | |
| 9 | playbook host_vars/* | |
| 10 | host facts / cached set_facts | |
| 11 | play vars | |
| 12 | play vars_prompt | |
| 13 | play vars_files | |
| 14 | role vars (vars/main.yml) | |
| 15 | block vars | |
| 16 | task vars | |
| 17 | include_vars | |
| 18 | set_facts / registered vars | |
| 19 | role params | |
| 20 | include params | |
| 21 | extra vars (-e) | Highest - always wins |

### Best Practice Guidelines

- **defaults/main.yml**: User-configurable options (ports, paths, features)
- **vars/main.yml**: Internal constants (supported OS list, package mappings)
- **group_vars/**: Environment-specific values
- **host_vars/**: Host-specific overrides
- **Extra vars**: Temporary overrides for testing

---

## Handler Best Practices

### Use listen Directive

The `listen` directive allows multiple notifications to trigger the same handler:

```yaml
handlers:
  - name: Restart nginx
    ansible.builtin.service:
      name: "{{ nginx_service_name }}"
      state: restarted
    listen: Restart nginx

  - name: Reload nginx
    ansible.builtin.service:
      name: "{{ nginx_service_name }}"
      state: reloaded
    listen: Reload nginx
```

### Handler Naming Consistency

Keep notify strings consistent across tasks:

```yaml
tasks:
  - name: Deploy main config
    ansible.builtin.template:
      src: nginx.conf.j2
      dest: /etc/nginx/nginx.conf
    notify: Restart nginx

  - name: Deploy site config
    ansible.builtin.template:
      src: site.conf.j2
      dest: /etc/nginx/sites-available/default
    notify: Reload nginx
```

### Flush Handlers When Needed

Use `meta: flush_handlers` when subsequent tasks depend on handler execution:

```yaml
- name: Deploy configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/config.yml
  notify: Restart app

- name: Flush handlers to ensure app is restarted
  ansible.builtin.meta: flush_handlers

- name: Verify application is responding
  ansible.builtin.uri:
    url: "http://localhost:8080/health"
    status_code: 200
```

### Conditional Handlers

Handlers can have conditions:

```yaml
handlers:
  - name: Restart nginx
    ansible.builtin.service:
      name: nginx
      state: restarted
    when: nginx_service_enabled | default(true)
    listen: Restart nginx
```

---

## Ansible-Lint Compliance

ansible-craft targets the **production profile** for ansible-lint.

### Key Rules Enforced

| Rule | Description | Auto-Fix |
|------|-------------|----------|
| `fqcn[action-core]` | Use FQCN for builtin modules | Yes |
| `fqcn[action]` | Use FQCN for all modules | Yes |
| `yaml[trailing-spaces]` | No trailing whitespace | Yes |
| `yaml[new-line-at-end-of-file]` | Files end with newline | Yes |
| `name[casing]` | Task names start uppercase | Yes |
| `risky-file-permissions` | Explicit mode on file creation | No |
| `no-changed-when` | Commands need changed_when | No |
| `command-instead-of-module` | Use modules over commands | No |
| `no-handler` | Use handlers for restarts | No |
| `var-naming[no-role-prefix]` | Variables need role prefix | No |
| `no-jinja-when` | No braces in when conditions | Yes |
| `key-order[task]` | Task keys in standard order | No |

### Running ansible-lint

```bash
# Basic lint check
ansible-lint roles/role_name/

# With auto-fix
ansible-lint --fix roles/role_name/

# Verbose output
ansible-lint -v roles/role_name/

# Skip specific rules
ansible-lint -x yaml[line-length] roles/role_name/
```

### Task Key Order

Recommended order for task keys:

```yaml
- name: Task name                # 1. name
  become: true                   # 2. execution modifiers
  when: condition                # 3. conditionals
  ansible.builtin.module:        # 4. module (FQCN)
    param: value
    mode: '0644'
  register: result               # 5. register
  notify: Handler name           # 6. notify
  changed_when: false            # 7. change control
  failed_when: condition         # 8. failure control
  tags:                          # 9. tags
    - role_name
    - category
```

---

## Task Ordering

### Standard Task Sequence

Tasks should follow this logical order:

1. **Variables/facts setup** - set_fact, include_vars
2. **Validation** - assert, fail conditions
3. **Package installation** - apt, dnf, win_chocolatey
4. **User/group creation** - user, group
5. **Directory structure** - file with state: directory
6. **Configuration files** - template, copy (with notify)
7. **Service management** - service, systemd_service

### Example Implementation

```yaml
---
# tasks/main.yml

# 1. Variables setup
- name: Include OS-specific variables
  ansible.builtin.include_vars:
    file: "{{ ansible_os_family }}.yml"

# 2. Validation
- name: Validate operating system
  ansible.builtin.assert:
    that:
      - ansible_os_family in nginx_supported_os
    fail_msg: "Unsupported OS: {{ ansible_os_family }}"

# 3. Package installation
- name: Install nginx packages
  ansible.builtin.apt:
    name: "{{ nginx_packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600

# 4. User/group (if custom user needed)
- name: Create nginx group
  ansible.builtin.group:
    name: nginx
    state: present

- name: Create nginx user
  ansible.builtin.user:
    name: nginx
    group: nginx
    shell: /sbin/nologin
    create_home: false
    state: present

# 5. Directory structure
- name: Create nginx directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    owner: nginx
    group: nginx
    mode: '0755'
  loop:
    - "{{ nginx_config_path }}/sites-available"
    - "{{ nginx_config_path }}/sites-enabled"
    - "{{ nginx_log_path }}"

# 6. Configuration files
- name: Deploy nginx configuration
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: "{{ nginx_config_path }}/nginx.conf"
    owner: root
    group: root
    mode: '0644'
  notify: Reload nginx

# 7. Service management
- name: Ensure nginx service is enabled and running
  ansible.builtin.service:
    name: "{{ nginx_service_name }}"
    state: "{{ nginx_service_state }}"
    enabled: "{{ nginx_service_enabled }}"
```

---

## Play Organization

### Play Execution Order

```
1. pre_tasks     → Validation, prerequisite checks
2. roles         → If using roles
3. tasks         → Main work
4. handlers      → Triggered by notify (run once at end)
5. post_tasks    → Verification, health checks
```

### pre_tasks Use Cases

```yaml
pre_tasks:
  # Variable validation
  - name: Validate required variables
    ansible.builtin.assert:
      that:
        - database_password is defined
        - database_password | length >= 12
      fail_msg: "database_password must be at least 12 characters"

  # Prerequisite checks
  - name: Check disk space
    ansible.builtin.shell:
      cmd: df -h / | awk 'NR==2 {print $5}' | sed 's/%//'
    register: disk_usage
    changed_when: false

  - name: Fail if disk space is low
    ansible.builtin.fail:
      msg: "Insufficient disk space: {{ disk_usage.stdout }}% used"
    when: disk_usage.stdout | int > 90
```

### post_tasks Use Cases

```yaml
post_tasks:
  # Service health check
  - name: Verify HTTP endpoint
    ansible.builtin.uri:
      url: "http://localhost:{{ app_port }}/health"
      status_code: 200
    retries: 5
    delay: 10

  # Smoke test
  - name: Verify database connectivity
    community.postgresql.postgresql_ping:
      db: "{{ database_name }}"
      login_host: localhost
```

### Rolling Updates

```yaml
---
- name: Rolling update web servers
  hosts: webservers
  serial: 1                    # One host at a time
  max_fail_percentage: 25      # Fail if more than 25% fail
  become: true

  pre_tasks:
    - name: Remove from load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_host }}/api/remove"
        method: POST
        body:
          host: "{{ inventory_hostname }}"
        body_format: json
      delegate_to: localhost

  tasks:
    - name: Update application
      ansible.builtin.apt:
        name: myapp
        state: latest
      notify: Restart myapp

  handlers:
    - name: Restart myapp
      ansible.builtin.systemd_service:
        name: myapp
        state: restarted

  post_tasks:
    - name: Add back to load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_host }}/api/add"
        method: POST
        body:
          host: "{{ inventory_hostname }}"
        body_format: json
      delegate_to: localhost
```

---

## Security Practices

### Never Hardcode Secrets

```yaml
# WRONG - hardcoded secret
database_password: "supersecret123"

# CORRECT - use vault
database_password: "{{ vault_database_password }}"

# Or reference environment variable
database_password: "{{ lookup('env', 'DB_PASSWORD') }}"
```

### Use Ansible Vault

```bash
# Create encrypted variable file
ansible-vault create group_vars/all/vault.yml

# Edit encrypted file
ansible-vault edit group_vars/all/vault.yml

# Run playbook with vault
ansible-playbook playbook.yml --ask-vault-pass
```

### File Permissions

Always set explicit permissions on sensitive files:

```yaml
- name: Deploy application secret
  ansible.builtin.copy:
    content: "{{ app_secret }}"
    dest: /etc/app/secret.key
    owner: root
    group: app
    mode: '0640'
```

### Use no_log for Sensitive Tasks

```yaml
- name: Set database password
  community.postgresql.postgresql_user:
    name: app_user
    password: "{{ database_password }}"
  no_log: true
```

### Validate Input

```yaml
- name: Validate input parameters
  ansible.builtin.assert:
    that:
      - app_port | int > 0
      - app_port | int < 65536
      - app_user | regex_search('^[a-z_][a-z0-9_-]*$')
    fail_msg: "Invalid input parameters"
```

### Principle of Least Privilege

```yaml
# Only escalate when necessary
- name: Read application config
  ansible.builtin.slurp:
    src: /etc/app/config.yml
  # no become needed for read

- name: Update system config
  ansible.builtin.template:
    src: sysctl.conf.j2
    dest: /etc/sysctl.d/99-app.conf
    mode: '0644'
  become: true  # escalate only for system files
```

---

## Testing with Molecule

### Overview

Molecule provides infrastructure for testing Ansible roles:
- Container/VM provisioning
- Playbook execution (converge)
- Idempotence verification
- State verification (verify)

### Driver Selection

| Driver | Use Case | Pros | Cons |
|--------|----------|------|------|
| **docker** | Linux roles, CI/CD | Fast, lightweight | No systemd by default |
| **podman** | Linux, rootless | Rootless, daemonless | Slightly slower |
| **vagrant** | Complex roles | Full VM, systemd works | Slow, resource heavy |
| **delegated** | Windows, cloud | Maximum flexibility | Manual setup required |

**Note**: Windows roles MUST use `delegated` driver.

### molecule.yml Template (Docker)

```yaml
---
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml

driver:
  name: docker

platforms:
  - name: ubuntu2204
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    command: ""
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    privileged: true

  - name: rocky9
    image: geerlingguy/docker-rockylinux9-ansible:latest
    pre_build_image: true
    command: ""
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    privileged: true

provisioner:
  name: ansible
  playbooks:
    converge: converge.yml
    verify: verify.yml

verifier:
  name: ansible

scenario:
  name: default
  test_sequence:
    - dependency
    - cleanup
    - destroy
    - syntax
    - create
    - prepare
    - converge
    - idempotence
    - verify
    - cleanup
    - destroy
```

### converge.yml Template

```yaml
---
- name: Converge
  hosts: all
  become: true
  gather_facts: true

  vars:
    # Test-specific variable overrides
    nginx_port: 8080
    nginx_worker_processes: 1

  pre_tasks:
    - name: Update apt cache (Debian)
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      changed_when: false

  roles:
    - role: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
```

### verify.yml Template

```yaml
---
- name: Verify
  hosts: all
  become: true
  gather_facts: true

  tasks:
    - name: Gather service facts
      ansible.builtin.service_facts:

    - name: Verify service is running
      ansible.builtin.assert:
        that:
          - "'nginx.service' in ansible_facts.services"
          - "ansible_facts.services['nginx.service'].state == 'running'"
        fail_msg: "nginx service is not running"
        success_msg: "nginx service is running"

    - name: Check port is listening
      ansible.builtin.wait_for:
        port: 80
        timeout: 10

    - name: Verify configuration file exists
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: config_file

    - name: Assert configuration file exists
      ansible.builtin.assert:
        that:
          - config_file.stat.exists
          - config_file.stat.mode == '0644'
```

### Running Molecule Tests

```bash
# Full test sequence
molecule test

# Specific scenario
molecule test -s side_effect

# Just converge (keep instances)
molecule converge

# Run verify only
molecule verify

# Interactive debugging
molecule login

# Destroy instances
molecule destroy
```

---

## Quick Reference

### Common Module FQCN

```yaml
ansible.builtin.apt          # Package management (Debian)
ansible.builtin.dnf          # Package management (RHEL)
ansible.builtin.file         # File/directory management
ansible.builtin.template     # Jinja2 template deployment
ansible.builtin.service      # Service management
ansible.builtin.systemd_service  # Systemd services
ansible.builtin.user         # User management
ansible.builtin.group        # Group management
ansible.builtin.copy         # File copy
ansible.builtin.command      # Execute commands
ansible.builtin.shell        # Shell commands
ansible.builtin.assert       # Condition validation
ansible.builtin.debug        # Debug output
ansible.builtin.include_tasks    # Include task file
ansible.builtin.include_vars    # Include variables
ansible.builtin.set_fact     # Set variables
```

### Checklist

- [ ] All modules use FQCN
- [ ] All variables role-prefixed
- [ ] Explicit state on all modules
- [ ] Handlers for service restarts
- [ ] Modes quoted as strings
- [ ] Booleans use true/false
- [ ] Jinja2 variables quoted
- [ ] Files end with newline
- [ ] Task names capitalized
- [ ] changed_when on commands

---

## External References

- [Ansible Official Documentation](https://docs.ansible.com/ansible/latest/)
- [Ansible Lint Profiles](https://ansible.readthedocs.io/projects/lint/profiles/)
- [Red Hat Good Practices for Ansible](https://redhat-cop.github.io/automation-good-practices/)
- [Galaxy Developer Guide](https://docs.ansible.com/ansible/latest/galaxy/dev_guide.html)
- [Ansible Molecule](https://ansible.readthedocs.io/projects/molecule/)
