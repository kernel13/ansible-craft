# Role Directory Structure

## Standard Galaxy Structure

```
role_name/
├── README.md                 # Documentation (REQUIRED)
├── defaults/
│   └── main.yml              # Default variables (REQUIRED)
├── vars/
│   └── main.yml              # Internal variables
├── tasks/
│   ├── main.yml              # Main entry point (REQUIRED)
│   └── validate.yml          # Input validation (REQUIRED)
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

## File Templates

### defaults/main.yml
```yaml
---
# Role default variables
# These can be overridden in playbooks or inventory

# Installation
role_name_package_name: "package"
role_name_version: "latest"

# Paths
role_name_config_path: "/etc/role_name"
role_name_data_path: "/var/lib/role_name"

# Service
role_name_service_name: "role_name"
role_name_service_enabled: true
role_name_service_state: "started"

# Configuration
role_name_port: 8080
role_name_bind_address: "0.0.0.0"
```

### vars/main.yml
```yaml
---
# Internal role variables - not meant to be overridden

role_name_supported_os:
  - Ubuntu
  - Debian
  - RedHat

role_name_required_packages:
  Debian:
    - package1
    - package2
  RedHat:
    - package1
    - package2
```

### tasks/main.yml
```yaml
---
# Main task entry point

# Validation FIRST (always)
- name: Validate inputs
  ansible.builtin.include_tasks:
    file: validate.yml
  tags:
    - role_name
    - validation

- name: Include OS-specific variables
  ansible.builtin.include_vars:
    file: "{{ ansible_os_family }}.yml"
  tags:
    - role_name
    - install

- name: Install packages
  ansible.builtin.include_tasks:
    file: install.yml
  tags:
    - role_name
    - install

- name: Configure application
  ansible.builtin.include_tasks:
    file: configure.yml
  tags:
    - role_name
    - config

- name: Manage service
  ansible.builtin.include_tasks:
    file: service.yml
  tags:
    - role_name
    - service
```

### tasks/validate.yml
```yaml
---
# Input validation for role_name role
# Validates all user-configurable variables before execution

# ============================================
# ANSIBLE VERSION VALIDATION
# ============================================
- name: Validate Ansible version
  ansible.builtin.assert:
    that:
      - ansible_version.full is version('2.14', '>=')
    fail_msg: "Ansible {{ ansible_version.full }} too old. Requires 2.14+"
    success_msg: "Ansible version validated"
  tags:
    - role_name
    - validation

# ============================================
# PLATFORM VALIDATION
# ============================================
- name: Validate operating system
  ansible.builtin.assert:
    that:
      - ansible_os_family in role_name_supported_os
    fail_msg: "Unsupported OS: {{ ansible_os_family }}. Supported: {{ role_name_supported_os | join(', ') }}"
    success_msg: "OS validated: {{ ansible_os_family }}"
  tags:
    - role_name
    - validation

# ============================================
# TYPE VALIDATION
# ============================================
- name: Validate variable types
  ansible.builtin.assert:
    that:
      - role_name_port is number
      - role_name_install_path is string
      - role_name_service_enabled is boolean or role_name_service_enabled is sameas true or role_name_service_enabled is sameas false
    fail_msg: "Variable type mismatch. Check: port (number), install_path (string), service_enabled (boolean)"
    success_msg: "Variable types validated"
  tags:
    - role_name
    - validation

# ============================================
# REQUIRED VARIABLES
# ============================================
- name: Validate required variables are defined
  ansible.builtin.assert:
    that:
      - role_name_install_path is defined
      - role_name_install_path | length > 0
    fail_msg: "Required variable role_name_install_path is missing or empty"
    success_msg: "Required variables validated"
  tags:
    - role_name
    - validation

# ============================================
# RANGE VALIDATION
# ============================================
- name: Validate port range
  ansible.builtin.assert:
    that:
      - role_name_port | int >= 1
      - role_name_port | int <= 65535
    fail_msg: "Port {{ role_name_port }} out of range (1-65535)"
    success_msg: "Port validated"
  when: role_name_port is defined
  tags:
    - role_name
    - validation

# ============================================
# ENUM VALIDATION
# ============================================
- name: Validate service_state is valid
  ansible.builtin.assert:
    that:
      - role_name_service_state in ['started', 'stopped', 'restarted', 'reloaded']
    fail_msg: "Invalid service_state '{{ role_name_service_state }}'. Must be: started, stopped, restarted, or reloaded"
    success_msg: "Service state validated"
  when: role_name_service_state is defined
  tags:
    - role_name
    - validation

# ============================================
# STRUCTURE VALIDATION (for complex vars)
# ============================================
# Example for list of dicts validation (uncomment if needed):
# - name: Validate vhost structure
#   ansible.builtin.assert:
#     that:
#       - item.name is defined
#       - item.document_root is defined
#     fail_msg: "Virtual host missing required fields: name, document_root"
#   loop: "{{ role_name_vhosts }}"
#   loop_control:
#     label: "{{ item.name | default('unnamed') }}"
#   when: role_name_vhosts is defined and role_name_vhosts | length > 0
#   tags:
#     - role_name
#     - validation
```

### handlers/main.yml
```yaml
---
# Event-triggered tasks

- name: Restart role_name
  ansible.builtin.service:
    name: "{{ role_name_service_name }}"
    state: restarted
  listen: Restart role_name

- name: Reload role_name
  ansible.builtin.service:
    name: "{{ role_name_service_name }}"
    state: reloaded
  listen: Reload role_name
```

### meta/main.yml
```yaml
---
galaxy_info:
  role_name: role_name
  author: your_name
  description: Brief description of the role
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
    - system
    - configuration

dependencies: []
```

### README.md
```markdown
# Role Name

Brief description of what this role does.

## Requirements

List any pre-requisites.

## Role Variables

### Required Variables
| Variable | Description |
|----------|-------------|
| `role_name_var` | Description |

### Optional Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `role_name_port` | `8080` | Service port |

## Dependencies

List role dependencies.

## Example Playbook

\```yaml
- hosts: servers
  roles:
    - role: role_name
      vars:
        role_name_port: 9090
\```

## License

MIT

## Author

Your Name
```
