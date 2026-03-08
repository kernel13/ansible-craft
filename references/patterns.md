# Ansible Patterns Reference

## Idempotency Patterns

### 1. Always Specify State
```yaml
# Good - explicit state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present

# Bad - missing state
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
```

### 2. Use Handlers for Service Restarts
```yaml
# Good - handler notification
- name: Deploy nginx config
  ansible.builtin.template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Restart nginx

# Bad - inline restart
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
# Good - idempotent command
- name: Initialize application
  ansible.builtin.command:
    cmd: /opt/app/init.sh
    creates: /opt/app/.initialized

# Good - removes pattern
- name: Run cleanup script
  ansible.builtin.command:
    cmd: /opt/app/cleanup.sh
    removes: /opt/app/temp_data
```

### 4. Package Cache Control
```yaml
# Good - cache control
- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
    state: present
    update_cache: true
    cache_valid_time: 3600

# Bad - always updates cache
- name: Update apt cache
  ansible.builtin.apt:
    update_cache: true

- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
```

### 5. Changed When for Commands
```yaml
# Good - accurate change detection
- name: Check if initialized
  ansible.builtin.command:
    cmd: /opt/app/check-status.sh
  register: status_result
  changed_when: false

- name: Get current version
  ansible.builtin.shell:
    cmd: cat /opt/app/VERSION
  register: version
  changed_when: false
  failed_when: false
```

## Input Validation Patterns (tasks/validate.yml)

Input validation should be the FIRST step in every role. This ensures early failure with clear error messages.

**CRITICAL:** All validation patterns below belong in a dedicated `tasks/validate.yml` file.

| Validation Type | Location | When |
|-----------------|----------|------|
| Input validation (OS, Ansible version, required vars, types, ranges, enums) | `tasks/validate.yml` | FIRST, before any work |
| Post-install verification (service running, files exist, version correct) | `molecule/default/verify.yml` | Molecule testing ONLY |

**NEVER put assertion tasks directly in `tasks/main.yml`.** The main.yml file should only contain `include_tasks: validate.yml` as its first task.

### Validation Type Reference Table

| Category | Jinja2 Test/Filter | Example |
|----------|-------------------|---------|
| Type: string | `is string` | `path is string` |
| Type: number | `is number` | `port is number` |
| Type: boolean | `is boolean` or `is sameas true/false` | `enabled is boolean` |
| Type: list | `is iterable` | `modules is iterable` |
| Type: dict | `is mapping` | `config is mapping` |
| Defined | `is defined` | `var is defined` |
| Not empty | `\| length > 0` | `path \| length > 0` |
| Range | `>= and <=` | `port >= 1` |
| In list | `in [...]` | `state in ['started']` |
| Regex match | `\| regex_search` | `email \| regex_search('@')` |

### 1. Type Validation

Validate that variables have the correct data type:

```yaml
# String validation
- name: Validate string variables
  ansible.builtin.assert:
    that:
      - role_name_install_path is string
      - role_name_config_file is string
    fail_msg: "String type expected for install_path and config_file"
    success_msg: "String types validated"
  tags:
    - role_name:validation

# Number validation
- name: Validate numeric variables
  ansible.builtin.assert:
    that:
      - role_name_port is number
      - role_name_max_connections is number
    fail_msg: "Numeric type expected for port and max_connections"
    success_msg: "Numeric types validated"
  tags:
    - role_name:validation

# Boolean validation
- name: Validate boolean variables
  ansible.builtin.assert:
    that:
      - role_name_enabled is boolean or role_name_enabled is sameas true or role_name_enabled is sameas false
      - role_name_debug_mode is boolean or role_name_debug_mode is sameas true or role_name_debug_mode is sameas false
    fail_msg: "Boolean type expected for enabled and debug_mode"
    success_msg: "Boolean types validated"
  tags:
    - role_name:validation

# List validation
- name: Validate list variables
  ansible.builtin.assert:
    that:
      - role_name_modules is iterable
      - role_name_allowed_hosts is iterable
    fail_msg: "List type expected for modules and allowed_hosts"
    success_msg: "List types validated"
  tags:
    - role_name:validation

# Dict validation
- name: Validate dict variables
  ansible.builtin.assert:
    that:
      - role_name_config is mapping
    fail_msg: "Dict/mapping type expected for config"
    success_msg: "Dict types validated"
  when: role_name_config is defined
  tags:
    - role_name:validation
```

### 2. Range Validation

Validate numeric values are within acceptable ranges:

```yaml
# Port range
- name: Validate port range
  ansible.builtin.assert:
    that:
      - role_name_port | int >= 1
      - role_name_port | int <= 65535
    fail_msg: "Port {{ role_name_port }} out of range (1-65535)"
    success_msg: "Port validated: {{ role_name_port }}"
  when: role_name_port is defined
  tags:
    - role_name:validation

# Percentage range
- name: Validate percentage range
  ansible.builtin.assert:
    that:
      - role_name_cpu_limit | int >= 0
      - role_name_cpu_limit | int <= 100
    fail_msg: "CPU limit {{ role_name_cpu_limit }} out of range (0-100)"
  when: role_name_cpu_limit is defined
  tags:
    - role_name:validation

# Positive integer
- name: Validate positive integer
  ansible.builtin.assert:
    that:
      - role_name_worker_count | int >= 1
    fail_msg: "Worker count must be at least 1, got {{ role_name_worker_count }}"
  when: role_name_worker_count is defined
  tags:
    - role_name:validation
```

### 3. Enum Validation

Validate values are from an allowed set:

```yaml
# Service state enum
- name: Validate service state
  ansible.builtin.assert:
    that:
      - role_name_service_state in ['started', 'stopped', 'restarted', 'reloaded']
    fail_msg: "Invalid service_state '{{ role_name_service_state }}'. Must be: started, stopped, restarted, or reloaded"
    success_msg: "Service state validated"
  when: role_name_service_state is defined
  tags:
    - role_name:validation

# Log level enum
- name: Validate log level
  ansible.builtin.assert:
    that:
      - role_name_log_level in ['debug', 'info', 'warn', 'error', 'fatal']
    fail_msg: "Invalid log_level '{{ role_name_log_level }}'. Must be: debug, info, warn, error, or fatal"
  when: role_name_log_level is defined
  tags:
    - role_name:validation

# Protocol enum
- name: Validate protocol
  ansible.builtin.assert:
    that:
      - role_name_protocol in ['http', 'https', 'tcp', 'udp']
    fail_msg: "Invalid protocol '{{ role_name_protocol }}'. Must be: http, https, tcp, or udp"
  when: role_name_protocol is defined
  tags:
    - role_name:validation
```

### 4. Complex Structure Validation

Validate lists of dicts have required fields:

```yaml
# Virtual hosts list validation
- name: Validate virtual host entries
  ansible.builtin.assert:
    that:
      - item.name is defined
      - item.name is string
      - item.name | length > 0
      - item.document_root is defined
      - item.document_root is string
    fail_msg: "Virtual host missing required fields. Each vhost needs: name (string), document_root (string)"
  loop: "{{ role_name_vhosts }}"
  loop_control:
    label: "{{ item.name | default('unnamed') }}"
  when: role_name_vhosts is defined and role_name_vhosts | length > 0
  tags:
    - role_name:validation

# Users list validation
- name: Validate user entries
  ansible.builtin.assert:
    that:
      - item.username is defined
      - item.username is string
      - item.role is defined
      - item.role in ['admin', 'user', 'readonly']
    fail_msg: "User entry invalid. Required: username (string), role (admin|user|readonly)"
  loop: "{{ role_name_users }}"
  loop_control:
    label: "{{ item.username | default('unnamed') }}"
  when: role_name_users is defined and role_name_users | length > 0
  tags:
    - role_name:validation

# Dict field validation
- name: Validate config structure
  ansible.builtin.assert:
    that:
      - role_name_config.host is defined
      - role_name_config.port is defined
    fail_msg: "Config dict requires 'host' and 'port' keys"
  when: role_name_config is defined
  tags:
    - role_name:validation
```

### 5. Operating System Validation

```yaml
- name: Validate operating system
  ansible.builtin.assert:
    that:
      - ansible_os_family in role_name_supported_os
    fail_msg: "Unsupported OS: {{ ansible_os_family }}. Supported: {{ role_name_supported_os | join(', ') }}"
    success_msg: "OS validated: {{ ansible_os_family }}"
  tags:
    - role_name:validation
```

### 6. Required Variables Validation

```yaml
- name: Validate required variables
  ansible.builtin.assert:
    that:
      - role_name_port is defined
      - role_name_port | int > 0
      - role_name_port | int < 65536
      - role_name_install_path is defined
      - role_name_install_path | length > 0
    fail_msg: "Required variables missing or invalid. Check role_name_port and role_name_install_path."
    success_msg: "Required variables validated"
  tags:
    - role_name:validation
```

### 7. Ansible Version Validation

```yaml
- name: Validate Ansible version
  ansible.builtin.assert:
    that:
      - ansible_version.full is version('2.14', '>=')
    fail_msg: "Ansible {{ ansible_version.full }} is too old. Minimum required: 2.14"
    success_msg: "Ansible version {{ ansible_version.full }} is supported"
  tags:
    - role_name:validation
```

### 8. Collection Dependencies Validation

```yaml
- name: Check required collections are installed
  ansible.builtin.command:
    cmd: ansible-galaxy collection list {{ item }}
  loop: "{{ role_name_required_collections }}"
  register: role_name_collection_check
  changed_when: false
  failed_when: role_name_collection_check.rc != 0
  ignore_errors: true
  tags:
    - role_name:validation

- name: Fail if required collections missing
  ansible.builtin.fail:
    msg: "Required collection {{ item.item }} is not installed. Run: ansible-galaxy collection install {{ item.item }}"
  loop: "{{ role_name_collection_check.results }}"
  when: item.rc != 0
  tags:
    - role_name:validation
```

### 9. Mutually Exclusive Options Validation

```yaml
- name: Validate mutually exclusive options
  ansible.builtin.assert:
    that:
      - not (role_name_use_ssl and role_name_use_plaintext)
    fail_msg: "role_name_use_ssl and role_name_use_plaintext are mutually exclusive"
  when: role_name_use_ssl is defined or role_name_use_plaintext is defined
  tags:
    - role_name:validation
```

### 10. Path Existence Validation

```yaml
- name: Validate SSL certificate exists
  ansible.builtin.stat:
    path: "{{ role_name_ssl_cert_path }}"
  register: role_name_ssl_cert_stat
  when: role_name_ssl_enabled
  tags:
    - role_name:validation

- name: Fail if SSL certificate missing
  ansible.builtin.fail:
    msg: "SSL certificate not found at {{ role_name_ssl_cert_path }}"
  when:
    - role_name_ssl_enabled
    - not role_name_ssl_cert_stat.stat.exists
  tags:
    - role_name:validation
```

### 11. Regex Pattern Validation

```yaml
# Email format validation
- name: Validate email format
  ansible.builtin.assert:
    that:
      - role_name_admin_email | regex_search('@')
    fail_msg: "Invalid email format: {{ role_name_admin_email }}"
  when: role_name_admin_email is defined
  tags:
    - role_name:validation

# Domain name validation
- name: Validate domain format
  ansible.builtin.assert:
    that:
      - role_name_domain | regex_search('^[a-zA-Z0-9][a-zA-Z0-9.-]+[a-zA-Z0-9]$')
    fail_msg: "Invalid domain format: {{ role_name_domain }}"
  when: role_name_domain is defined
  tags:
    - role_name:validation
```

### 12. Windows-Specific Validation

```yaml
# Windows path validation
- name: Validate Windows path format
  ansible.builtin.assert:
    that:
      - role_name_install_path is regex('^[A-Za-z]:\\\\')
    fail_msg: "Invalid Windows path: {{ role_name_install_path }}. Must start with drive letter (e.g., C:\\)"
  when:
    - ansible_os_family == "Windows"
    - role_name_install_path is defined
  tags:
    - role_name:validation

# Windows service account validation
- name: Validate Windows service account
  ansible.builtin.assert:
    that:
      - role_name_service_account is defined
      - role_name_service_account is string
      - role_name_service_account | length > 0
    fail_msg: "Windows service account required for service installation"
  when:
    - ansible_os_family == "Windows"
    - role_name_install_service | default(false)
  tags:
    - role_name:validation
```

## Tag Naming Convention

**All tags MUST use the `rolename:action` format.**

```yaml
# Good - namespaced tags
tags:
  - nginx:install
  - nginx:config
  - nginx:service
  - nginx:validation

# Bad - generic or separate tags
tags:
  - install        # Not namespaced
  - nginx          # Role name alone
  - config
```

This namespaced format:
- Prevents tag collisions between roles
- Enables selective execution: `ansible-playbook site.yml --tags nginx:install`
- Groups related tasks clearly

## YAML Formatting Rules

### Indentation
- Always use 2 spaces
- Never use tabs

### Boolean Values
```yaml
# Good
become: true
enabled: false

# Bad
become: yes
enabled: no
```

### Jinja2 Variables
```yaml
# Good - quoted
dest: "{{ app_config_path }}/config.yml"
name: "{{ package_name }}"

# Bad - unquoted
dest: {{ app_config_path }}/config.yml
```

### File Modes
```yaml
# Good - quoted string
mode: '0644'
mode: '0755'

# Bad - octal or unquoted
mode: 0644
mode: 644
```

### Variable Naming
```yaml
# Good - role-prefixed snake_case
nginx_port: 80
nginx_worker_processes: auto
apache_windows_install_path: 'C:\Apache24'

# Bad - unprefixed or mixed case
port: 80
workerProcesses: auto
```

## Task Ordering Convention

1. **Input validation** - assert OS, required variables, version constraints (ALWAYS FIRST)
2. **Variables/facts setup** - set_fact, include_vars
3. **Package installation** - apt, dnf, win_chocolatey
4. **User/group creation** - user, group
5. **Directory structure** - file with state: directory
6. **Configuration files** - template, copy (with notify)
7. **Service management** - service, systemd_service

## When Conditions

```yaml
# Good - no Jinja2 braces in when
when: ansible_os_family == "Debian"
when: nginx_ssl_enabled
when: item.state == "present"

# Bad - Jinja2 braces in when
when: "{{ ansible_os_family }}" == "Debian"
when: "{{ nginx_ssl_enabled }}"
```

## Loop Patterns

```yaml
# Good - loop with label
- name: Create application directories
  ansible.builtin.file:
    path: "{{ item }}"
    state: directory
    mode: '0755'
  loop:
    - /opt/app/config
    - /opt/app/logs
    - /opt/app/data
  loop_control:
    label: "{{ item | basename }}"

# Good - dict loop
- name: Create users
  ansible.builtin.user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
  loop: "{{ app_users }}"
  loop_control:
    label: "{{ item.name }}"
```
