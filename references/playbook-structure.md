# Playbook Structure Reference

## Directory Layout

```
playbook_name/
├── playbook.yml              # Main playbook (REQUIRED)
├── inventory.example         # Example inventory (REQUIRED)
├── group_vars/
│   ├── all.yml               # Global variables (REQUIRED)
│   └── [group].yml           # Per-group variables
├── host_vars/
│   └── [hostname].yml        # Per-host variables (optional)
├── files/
│   └── *                     # Static files to copy
├── templates/
│   └── *.j2                  # Jinja2 templates
└── README.md                 # Usage instructions (REQUIRED)
```

## playbook.yml Template

### Single Play

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

    - name: Ensure service is running
      ansible.builtin.systemd_service:
        name: "{{ app_name }}"
        state: started
        enabled: true

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

### Multiple Plays

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

    - name: Ensure PostgreSQL is running
      ansible.builtin.systemd_service:
        name: postgresql
        state: started
        enabled: true

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

    - name: Deploy nginx config
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
        mode: '0644'
      notify: Reload nginx

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd_service:
        name: nginx
        state: reloaded

# Play 3: All servers - verification
- name: Verify deployment
  hosts: all
  gather_facts: false

  tasks:
    - name: Check connectivity
      ansible.builtin.ping:
```

### Windows Playbook

```yaml
---
- name: Configure Windows servers
  hosts: windows
  gather_facts: true

  vars:
    app_install_path: 'C:\Apps\MyApp'

  pre_tasks:
    - name: Ensure WinRM is working
      ansible.windows.win_ping:

  tasks:
    - name: Install Chocolatey packages
      chocolatey.chocolatey.win_chocolatey:
        name: "{{ item }}"
        state: present
      loop:
        - git
        - nodejs

    - name: Create application directory
      ansible.windows.win_file:
        path: "{{ app_install_path }}"
        state: directory

    - name: Deploy configuration
      ansible.windows.win_template:
        src: config.json.j2
        dest: '{{ app_install_path }}\config.json'

    - name: Configure Windows service
      ansible.windows.win_service:
        name: MyAppService
        path: '{{ app_install_path }}\app.exe'
        state: started
        start_mode: auto
      notify: Restart MyApp service

  handlers:
    - name: Restart MyApp service
      ansible.windows.win_service:
        name: MyAppService
        state: restarted

  post_tasks:
    - name: Verify service is running
      ansible.windows.win_service_info:
        name: MyAppService
      register: service_info

    - name: Assert service is running
      ansible.builtin.assert:
        that:
          - service_info.services[0].state == 'started'
```

## Play Execution Order

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

  # Gather additional facts
  - name: Get current application version
    ansible.builtin.command:
      cmd: /opt/app/version.sh
    register: current_version
    changed_when: false
    failed_when: false
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
      login_host: "{{ database_host }}"
      login_user: "{{ database_user }}"
      login_password: "{{ database_password }}"

  # Notification
  - name: Send deployment notification
    ansible.builtin.uri:
      url: "{{ slack_webhook_url }}"
      method: POST
      body_format: json
      body:
        text: "Deployment complete on {{ inventory_hostname }}"
    when: slack_webhook_url is defined
```

## group_vars Organization

### group_vars/all.yml

```yaml
---
# Global settings applied to all hosts

# Environment
environment: production
timezone: UTC

# Network
dns_servers:
  - 8.8.8.8
  - 8.8.4.4

# Monitoring
monitoring_enabled: true
metrics_port: 9100

# Package versions (pin for consistency)
nginx_version: "1.24.*"
postgresql_version: "15"
```

### group_vars/webservers.yml

```yaml
---
# Web server specific configuration

# Network
http_port: 80
https_port: 443

# Nginx settings
nginx_worker_processes: auto
nginx_worker_connections: 1024

# Application
app_root: /var/www/app
app_user: www-data
app_group: www-data

# Packages
web_packages:
  - nginx
  - certbot
  - python3-certbot-nginx
```

### group_vars/databases.yml

```yaml
---
# Database server configuration

# PostgreSQL settings
postgresql_listen_addresses: "*"
postgresql_port: 5432
postgresql_max_connections: 100

# Replication
postgresql_wal_level: replica
postgresql_max_wal_senders: 3

# Databases to create
postgresql_databases:
  - name: app_production
    encoding: UTF8

# Users to create
postgresql_users:
  - name: app_user
    password: "{{ vault_app_db_password }}"
    db: app_production
    priv: "ALL"
```

### group_vars/windows.yml

```yaml
---
# Windows server configuration

# Connection
ansible_connection: winrm
ansible_winrm_transport: ntlm
ansible_winrm_server_cert_validation: ignore

# Paths (use single quotes for Windows paths)
windows_app_path: 'C:\Apps'
windows_log_path: 'C:\Logs'

# Chocolatey packages
chocolatey_packages:
  - git
  - notepadplusplus
  - 7zip
```

## Inventory Examples

### Linux Inventory (INI format)

```ini
# inventory.example

[webservers]
web01.example.com
web02.example.com

[databases]
db01.example.com

[loadbalancers]
lb01.example.com

# Group children
[production:children]
webservers
databases
loadbalancers

# Group variables
[webservers:vars]
ansible_user=deploy
http_port=80

[databases:vars]
ansible_user=dba
postgresql_port=5432

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
```

### Windows Inventory (INI format)

```ini
# inventory-windows.example

[windows]
win01.example.com
win02.example.com

[windows:vars]
ansible_connection=winrm
ansible_winrm_transport=ntlm
ansible_winrm_server_cert_validation=ignore
ansible_user=Administrator
ansible_password={{ vault_windows_password }}
```

### YAML Inventory

```yaml
# inventory.yml
all:
  children:
    webservers:
      hosts:
        web01.example.com:
        web02.example.com:
      vars:
        http_port: 80
    databases:
      hosts:
        db01.example.com:
          postgresql_port: 5432
    windows:
      hosts:
        win01.example.com:
      vars:
        ansible_connection: winrm
        ansible_winrm_transport: ntlm
  vars:
    ansible_python_interpreter: /usr/bin/python3
```

## Rolling Updates

```yaml
---
- name: Rolling update web servers
  hosts: webservers
  serial: 1                    # One host at a time
  # serial: "25%"              # 25% of hosts at a time
  # serial: [1, 2, 5]          # First 1, then 2, then 5 at a time
  max_fail_percentage: 25      # Fail if more than 25% of hosts fail
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
    - name: Wait for application to be ready
      ansible.builtin.uri:
        url: "http://localhost:8080/health"
        status_code: 200
      retries: 10
      delay: 5

    - name: Add back to load balancer
      ansible.builtin.uri:
        url: "http://{{ lb_host }}/api/add"
        method: POST
        body:
          host: "{{ inventory_hostname }}"
        body_format: json
      delegate_to: localhost
```

## README.md Template

```markdown
# [Playbook Name]

Brief description of what this playbook does.

## Requirements

- Ansible 2.14+
- Target hosts accessible via SSH (Linux) or WinRM (Windows)
- Required collections:
  - ansible.builtin
  - community.general

## Inventory Setup

1. Copy the example inventory:
   \```bash
   cp inventory.example inventory
   \```

2. Edit inventory with your hosts

3. (Optional) Create host_vars for specific hosts

## Variables

### Required Variables

| Variable | Description |
|----------|-------------|
| `app_secret` | Application secret key (min 16 chars) |
| `db_password` | Database password |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `app_port` | `8080` | Application port |
| `http_port` | `80` | HTTP listen port |

## Usage

### Syntax Check
\```bash
ansible-playbook -i inventory playbook.yml --syntax-check
\```

### Dry Run
\```bash
ansible-playbook -i inventory playbook.yml --check --diff
\```

### Execute
\```bash
ansible-playbook -i inventory playbook.yml
\```

### Limit to specific hosts
\```bash
ansible-playbook -i inventory playbook.yml --limit webservers
\```

### With extra variables
\```bash
ansible-playbook -i inventory playbook.yml -e "app_port=9090"
\```

## Tags

| Tag | Description |
|-----|-------------|
| `install` | Package installation |
| `config` | Configuration deployment |
| `service` | Service management |

\```bash
# Run only installation tasks
ansible-playbook -i inventory playbook.yml --tags install
\```

## License

MIT
```
