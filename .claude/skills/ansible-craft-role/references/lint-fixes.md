# Ansible-Lint Auto-Fix Reference

## Automatically Fixable Rules

### fqcn[action-core] / fqcn[action]
**Problem**: Short module name used instead of FQCN
```yaml
# Before
- name: Install package
  apt:
    name: nginx

# After
- name: Install package
  ansible.builtin.apt:
    name: nginx
```

### yaml[trailing-spaces]
**Problem**: Line ends with whitespace
```yaml
# Before (invisible trailing space)
- name: Task name

# After
- name: Task name
```

### yaml[new-line-at-end-of-file]
**Problem**: File doesn't end with newline
```yaml
# Before
  state: present# <- no newline

# After
  state: present
# <- newline here
```

### name[casing]
**Problem**: Task name doesn't start with uppercase
```yaml
# Before
- name: install nginx package

# After
- name: Install nginx package
```

## Common Warnings (Manual Fix Required)

### risky-file-permissions
**Problem**: File created without explicit permissions
```yaml
# Before
- name: Create config
  ansible.builtin.copy:
    src: config.conf
    dest: /etc/app/config.conf

# After
- name: Create config
  ansible.builtin.copy:
    src: config.conf
    dest: /etc/app/config.conf
    mode: '0644'
```

### no-changed-when
**Problem**: Command/shell without changed_when
```yaml
# Before
- name: Get version
  ansible.builtin.command:
    cmd: cat /etc/version
  register: version

# After
- name: Get version
  ansible.builtin.command:
    cmd: cat /etc/version
  register: version
  changed_when: false
```

### command-instead-of-module
**Problem**: Using command for operations with dedicated modules
```yaml
# Before
- name: Create directory
  ansible.builtin.command:
    cmd: mkdir -p /opt/app

# After
- name: Create directory
  ansible.builtin.file:
    path: /opt/app
    state: directory
    mode: '0755'
```

### no-handler
**Problem**: Service restart should use handler
```yaml
# Before
- name: Update config
  ansible.builtin.template:
    src: config.j2
    dest: /etc/app/config

- name: Restart service
  ansible.builtin.service:
    name: app
    state: restarted

# After
- name: Update config
  ansible.builtin.template:
    src: config.j2
    dest: /etc/app/config
  notify: Restart app

# In handlers/main.yml
- name: Restart app
  ansible.builtin.service:
    name: app
    state: restarted
```

### yaml[line-length]
**Problem**: Line exceeds 160 characters
```yaml
# Before
- name: Very long task name that describes everything in great detail and goes on forever

# After
- name: Configure application settings
  # Long description moved to comment or broken up
```

### var-naming[no-role-prefix]
**Problem**: Variable not prefixed with role name
```yaml
# Before (in defaults/main.yml for role 'nginx')
port: 80

# After
nginx_port: 80
```

### no-jinja-when
**Problem**: Jinja2 braces in when condition
```yaml
# Before
when: "{{ nginx_enabled }}"

# After
when: nginx_enabled
```

### key-order[task]
**Problem**: Task keys not in recommended order
```yaml
# Recommended order
- name: Task name          # 1. name
  become: true             # 2. execution modifiers
  when: condition          # 3. conditionals
  ansible.builtin.module:  # 4. module
    param: value
  register: result         # 5. register
  notify: Handler          # 6. notify
  tags:                    # 7. tags
    - tag1
```

## Running ansible-lint

```bash
# Basic lint check
ansible-lint roles/role_name/

# With specific rules
ansible-lint -x yaml[line-length] roles/role_name/

# Auto-fix where possible
ansible-lint --fix roles/role_name/

# Show all warnings (including skipped)
ansible-lint -v roles/role_name/
```
