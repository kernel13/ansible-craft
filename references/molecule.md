# Molecule Testing Reference

## Overview

Molecule is the standard testing framework for Ansible roles. It provides:
- Infrastructure provisioning (containers, VMs)
- Playbook execution (converge)
- Idempotence verification
- State verification (verify)

## Testing Levels

### None
Molecule testing disabled. No molecule directory or files generated.

### Basic (Recommended)
Quick setup with sensible defaults. Asks only 2 questions:
1. Testing level (basic/advanced/none)
2. Driver selection (docker/podman/vagrant/delegated)

**Defaults applied:**
| Setting | Value |
|---------|-------|
| Test images | Pre-built Ansible images (geerlingguy/*-ansible) |
| Vagrant boxes | Standard boxes (generic/*) |
| Privileged | false |
| Rootless (podman) | true |
| Vagrant provider | virtualbox |
| Vagrant resources | standard (1GB RAM, 2 CPUs) |
| Delegated managed | false |
| Test sequence | create, converge, idempotence, verify, destroy |
| Verifier | ansible |

### Advanced
Full control over all Molecule configuration. Includes driver-specific questions plus common options:

**Docker/Podman questions:**
- Use pre-built Ansible test images?
- If no: Enter custom image per platform
- Enable privileged mode for systemd?
- (Podman only) Run in rootless mode?

**Vagrant questions:**
- Provider (virtualbox/libvirt/parallels)?
- Use standard boxes (generic/*)?
- If no: Enter custom box per platform
- VM resources (minimal/standard/powerful)?

**Delegated questions:**
- Instance management (external/managed)?

**Common questions (all drivers):**
- Test sequence (multi-select from 9 stages)
- Verifier type (ansible/testinfra)

## Driver Selection Guide

| Driver | Use Case | Pros | Cons |
|--------|----------|------|------|
| **docker** | Linux roles, CI/CD | Fast, lightweight, easy CI | No systemd by default |
| **podman** | Linux, rootless | Rootless, daemonless | Slightly slower |
| **vagrant** | Complex roles, Windows | Full VM, systemd works | Slow, resource heavy |
| **delegated** | Windows, cloud, custom | Maximum flexibility | Manual setup required |

### Windows Roles
Windows roles use the `vagrant` driver with libvirt/KVM provider and WinRM — Docker/Podman cannot run Windows containers for Ansible testing.

## molecule.yml Templates

### Docker Driver (Linux)

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

  - name: ubuntu2404
    image: geerlingguy/docker-ubuntu2404-ansible:latest
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

  - name: debian12
    image: geerlingguy/docker-debian12-ansible:latest
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
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      ubuntu2404:
        ansible_python_interpreter: /usr/bin/python3
      rocky9:
        ansible_python_interpreter: /usr/bin/python3
      debian12:
        ansible_python_interpreter: /usr/bin/python3

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

### Podman Driver (Linux)

```yaml
---
dependency:
  name: galaxy

driver:
  name: podman

platforms:
  - name: ubuntu2204
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    pre_build_image: true
    privileged: true
    command: ""
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw

  - name: rocky9
    image: geerlingguy/docker-rockylinux9-ansible:latest
    pre_build_image: true
    privileged: true
    command: ""
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw

provisioner:
  name: ansible

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

### Vagrant Driver (Full VMs)

```yaml
---
dependency:
  name: galaxy

driver:
  name: vagrant
  provider:
    name: virtualbox

platforms:
  - name: ubuntu2204
    box: bento/ubuntu-22.04
    memory: 2048
    cpus: 2
    interfaces:
      - auto_config: true
        network_name: private_network
        type: dhcp

  - name: rocky9
    box: bento/rockylinux-9
    memory: 2048
    cpus: 2
    interfaces:
      - auto_config: true
        network_name: private_network
        type: dhcp

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      rocky9:
        ansible_python_interpreter: /usr/bin/python3

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

### Vagrant Driver (libvirt/KVM)

```yaml
---
driver:
  name: vagrant
  provider:
    name: libvirt
    type: libvirt

platforms:
  - name: ubuntu2204
    box: generic/ubuntu2204
    memory: 2048
    cpus: 2
    provider_options:
      driver: kvm
      cpu_mode: host-passthrough
```

### Vagrant Driver (libvirt/KVM - Windows)

Use `${USER}` in platform names to avoid conflicts in multi-user environments.
Use `provider_raw_config_args` for libvirt-specific memory/device settings.
Use `instance_raw_config_args` for Vagrant guest/communicator configuration.

```yaml
---
dependency:
  name: galaxy
  options:
    role-file: ./molecule/requirements.yml
    requirements-file: ./molecule/requirements.yml

driver:
  name: vagrant
  provider:
    name: libvirt
    type: libvirt

platforms:
  - name: "win-${ROLE_NAME}-${USER}-test"
    box: "jborean93/WindowsServer2019"
    memory: 4096
    cpus: 2
    groups:
      - windows
      - test_servers
    provider_options:
      driver: kvm
      video_type: 'vga'
      storage_pool_name: 'default'
    provider_raw_config_args:
      - "memorybacking :access, :mode => 'shared'"
    instance_raw_config_args:
      - "vm.guest = :windows"
      - "vm.communicator = 'winrm'"
      - "vm.network 'forwarded_port', guest: 5985, host: 55985, auto_correct: true"
      - "vm.network 'forwarded_port', guest: 5986, host: 55986, auto_correct: true"

provisioner:
  name: ansible
  config_options:
    defaults:
      interpreter_python: auto_silent
      callback_whitelist: profile_tasks, timer, yaml
      stdout_callback: yaml
  connection_options:
    ansible_user: vagrant
    ansible_password: vagrant
    ansible_connection: winrm
    ansible_port: 5985
    ansible_winrm_transport: credssp
    ansible_winrm_scheme: http
    ansible_winrm_server_cert_validation: ignore
  inventory:
    group_vars:
      all:
        ansible_user: vagrant
        ansible_password: vagrant
        ansible_port: 55985
        ansible_host: 127.0.0.1
        ansible_connection: winrm
        ansible_winrm_scheme: http
        ansible_winrm_transport: credssp
        ansible_become: false
        ansible_winrm_server_cert_validation: ignore
        # Role-specific variables for testing
        role_variable_example: "test_value"

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

### Vagrant Driver (Parallels/macOS)

```yaml
---
driver:
  name: vagrant
  provider:
    name: parallels

platforms:
  - name: ubuntu2204
    box: bento/ubuntu-22.04
    memory: 2048
    cpus: 2
    provider_options:
      linked_clone: true
```

### Vagrant Resource Presets

| Preset | Memory | CPUs | Use Case |
|--------|--------|------|----------|
| minimal | 512 MB | 1 | Simple roles, quick tests |
| standard | 1024 MB | 2 | Most roles (recommended) |
| powerful | 2048 MB | 4 | Complex roles, databases |

### Delegated Driver (Windows)

```yaml
---
dependency:
  name: galaxy
  options:
    requirements-file: requirements.yml

driver:
  name: delegated
  options:
    managed: false
    ansible_connection_options:
      ansible_connection: winrm
      ansible_winrm_transport: ntlm
      ansible_winrm_server_cert_validation: ignore

platforms:
  - name: windows2022
    groups:
      - windows
    options:
      # Connection details - override in CI or use environment vars
      ansible_host: "${WINDOWS_HOST:-localhost}"
      ansible_port: 5986
      ansible_user: "${WINDOWS_USER:-Administrator}"
      ansible_password: "${WINDOWS_PASSWORD}"

provisioner:
  name: ansible
  inventory:
    group_vars:
      windows:
        ansible_connection: winrm
        ansible_winrm_transport: ntlm
        ansible_winrm_server_cert_validation: ignore
        ansible_become_method: runas

verifier:
  name: ansible

scenario:
  name: default
  test_sequence:
    - dependency
    - syntax
    - converge
    - idempotence
    - verify
```

## converge.yml Templates

### Linux Role

```yaml
---
- name: Converge
  hosts: all
  become: true

  vars:
    # Test-specific variable overrides
    role_name_port: 8080
    role_name_config_option: "test_value"

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

### Windows Role

```yaml
---
- name: Converge
  hosts: windows
  gather_facts: true

  vars:
    # Test-specific variable overrides
    role_name_port: 8080
    role_name_install_path: 'C:\RoleName'

  pre_tasks:
    - name: Ensure WinRM is working
      ansible.windows.win_ping:

    - name: Gather Windows facts
      ansible.builtin.setup:
        gather_subset:
          - min

  tasks:
    - name: Include role under test
      ansible.builtin.include_role:
        name: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
```

### Multi-Platform Role

```yaml
---
- name: Converge
  hosts: all
  become: "{{ 'false' if ansible_os_family == 'Windows' else 'true' }}"
  gather_facts: true

  vars:
    nginx_port: 8080

  pre_tasks:
    - name: Update apt cache (Debian)
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      changed_when: false

    - name: Ensure WinRM is working (Windows)
      ansible.windows.win_ping:
      when: ansible_os_family == "Windows"

  roles:
    - role: "{{ lookup('env', 'MOLECULE_PROJECT_DIRECTORY') | basename }}"
```

## prepare.yml Templates

### Linux (Install Prerequisites)

```yaml
---
- name: Prepare
  hosts: all
  become: true
  gather_facts: true

  tasks:
    # --- Update package cache ---
    - name: Update apt cache (Debian)
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
      changed_when: false

    # --- Install prerequisite packages ---
    - name: Install prerequisite packages (Debian)
      ansible.builtin.apt:
        name:
          - python3
          - python3-pip
        state: present
      when: ansible_os_family == "Debian"

    - name: Install prerequisite packages (RedHat)
      ansible.builtin.dnf:
        name:
          - python3
          - python3-pip
        state: present
      when: ansible_os_family == "RedHat"
```

### Windows (Two-Play Pattern)

Two plays: first on localhost to verify libvirt/KVM infrastructure, second on the Windows guest to confirm WinRM connectivity before converge.

```yaml
---
# Play 1: Infrastructure verification on localhost
- name: Prepare infrastructure (localhost)
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    # --- Verify libvirt prerequisites ---
    - name: Check libvirt is available
      ansible.builtin.command: virsh list --all
      changed_when: false
      register: virsh_check

    - name: Assert libvirt is available
      ansible.builtin.assert:
        that:
          - virsh_check.rc == 0
        fail_msg: "libvirt is not available on the host — install libvirt and KVM"

# Play 2: Windows guest preparation
- name: Prepare Windows guest
  hosts: windows
  gather_facts: false

  tasks:
    # --- Verify WinRM connectivity ---
    - name: Verify WinRM connection
      ansible.windows.win_ping:

    - name: Gather minimal Windows facts
      ansible.builtin.setup:
        gather_subset:
          - min
```

## verify.yml Templates

### Linux Service Verification

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

    - name: Verify service is enabled
      ansible.builtin.assert:
        that:
          - "ansible_facts.services['nginx.service'].status == 'enabled'"
        fail_msg: "nginx service is not enabled"
        success_msg: "nginx service is enabled"

    - name: Check port is listening
      ansible.builtin.wait_for:
        port: 80
        timeout: 10

    - name: Test HTTP response
      ansible.builtin.uri:
        url: "http://localhost:80"
        return_content: true
      register: http_response

    - name: Verify HTTP response
      ansible.builtin.assert:
        that:
          - http_response.status == 200
        fail_msg: "HTTP response was not 200"
        success_msg: "HTTP response is 200 OK"

    - name: Verify configuration file exists
      ansible.builtin.stat:
        path: /etc/nginx/nginx.conf
      register: config_file

    - name: Assert configuration file exists
      ansible.builtin.assert:
        that:
          - config_file.stat.exists
          - config_file.stat.mode == '0644'
        fail_msg: "Configuration file missing or wrong permissions"
        success_msg: "Configuration file exists with correct permissions"
```

### Windows Service Verification

```yaml
---
- name: Verify
  hosts: windows
  gather_facts: true

  tasks:
    # --- VERIFY: Collect service state ---
    - name: Gather service facts
      ansible.windows.win_service_info:
        name: RoleService
      register: role_service

    - name: Gather port state
      ansible.windows.win_wait_for:
        port: 80
        timeout: 30

    - name: Collect installation directory stat
      ansible.windows.win_stat:
        path: 'C:\RoleName'
      register: install_dir

    - name: Collect configuration file stat
      ansible.windows.win_stat:
        path: 'C:\RoleName\conf\role.conf'
      register: role_conf

    - name: Test HTTP response
      ansible.windows.win_uri:
        url: "http://localhost:80"
        return_content: true
      register: http_response

    # --- ASSERT: Validate service ---
    - name: Assert service exists
      ansible.builtin.assert:
        that:
          - role_service.services | length > 0
        fail_msg: "Service not found"
        success_msg: "Service exists"

    - name: Assert service is running
      ansible.builtin.assert:
        that:
          - role_service.services[0].state == 'started'
        fail_msg: "Service is not running"
        success_msg: "Service is running"

    - name: Assert service is set to auto start
      ansible.builtin.assert:
        that:
          - role_service.services[0].start_mode == 'auto'
        fail_msg: "Service is not set to auto start"
        success_msg: "Service start mode is auto"

    # --- ASSERT: Validate filesystem ---
    - name: Assert installation directory exists
      ansible.builtin.assert:
        that:
          - install_dir.stat.exists
          - install_dir.stat.isdir
        fail_msg: "Installation directory not found"
        success_msg: "Installation directory exists"

    - name: Assert configuration file exists
      ansible.builtin.assert:
        that:
          - role_conf.stat.exists
        fail_msg: "Configuration file not found"
        success_msg: "Configuration file exists"

    # --- TEST: Validate connectivity ---
    - name: Assert HTTP response is 200
      ansible.builtin.assert:
        that:
          - http_response.status_code == 200
        fail_msg: "HTTP response was not 200"
        success_msg: "HTTP response is 200 OK"

    # --- DISPLAY/REPORT: Verification summary ---
    - name: Report verification results
      ansible.builtin.debug:
        msg:
          - "=== Molecule Verify: PASSED ==="
          - "Service state  : {{ role_service.services[0].state }}"
          - "Start mode     : {{ role_service.services[0].start_mode }}"
          - "Install dir    : {{ install_dir.stat.exists }}"
          - "Config file    : {{ role_conf.stat.exists }}"
          - "HTTP status    : {{ http_response.status_code }}"
```

## requirements.yml (for collections)

```yaml
---
collections:
  - name: ansible.windows
    version: ">=2.0.0"
  - name: chocolatey.chocolatey
    version: ">=1.5.0"
  - name: community.general
    version: ">=7.0.0"
```

## Test Sequence Stages

The full Molecule test sequence includes these stages:

| Stage | Description | Default |
|-------|-------------|---------|
| dependency | Install role dependencies from requirements.yml | ✓ |
| cleanup | Pre-test cleanup (remove stale state) | |
| destroy | Remove existing test instances | |
| create | Instantiate test instances | ✓ |
| prepare | Pre-convergence setup (install prereqs) | |
| converge | Run the role (required) | ✓ |
| idempotence | Verify no changes on re-run | ✓ |
| side_effect | Test side effects | |
| verify | Run verification tests | ✓ |

**Basic mode default sequence:** create, converge, idempotence, verify, destroy

## Verifier Types

### Ansible Verifier (Default)

Uses `verify.yml` playbook with `ansible.builtin.assert` tasks:

```yaml
verifier:
  name: ansible
```

See verify.yml templates above.

### Testinfra Verifier

Uses Python tests with pytest for more powerful assertions:

```yaml
verifier:
  name: testinfra
  options:
    sudo: true
```

**tests/test_default.py:**
```python
"""Testinfra tests for the role."""
import pytest


def test_service_is_running(host):
    """Test that the service is running."""
    service = host.service("nginx")
    assert service.is_running
    assert service.is_enabled


def test_port_is_listening(host):
    """Test that the port is listening."""
    socket = host.socket("tcp://0.0.0.0:80")
    assert socket.is_listening


def test_config_file_exists(host):
    """Test that the config file exists with correct permissions."""
    config = host.file("/etc/nginx/nginx.conf")
    assert config.exists
    assert config.is_file
    assert config.mode == 0o644
    assert config.user == "root"


def test_package_is_installed(host):
    """Test that the package is installed."""
    package = host.package("nginx")
    assert package.is_installed


def test_http_response(host):
    """Test HTTP response from localhost."""
    cmd = host.run("curl -s -o /dev/null -w '%{http_code}' http://localhost:80")
    assert cmd.stdout == "200"


@pytest.mark.parametrize("expected_line", [
    "worker_processes auto;",
    "error_log /var/log/nginx/error.log;",
])
def test_config_contains(host, expected_line):
    """Test that config contains expected lines."""
    config = host.file("/etc/nginx/nginx.conf")
    assert expected_line in config.content_string
```

**Windows testinfra tests (tests/test_windows.py):**
```python
"""Testinfra tests for Windows role."""


def test_service_is_running(host):
    """Test that the Windows service is running."""
    service = host.service("Apache2.4")
    assert service.is_running


def test_install_directory_exists(host):
    """Test that the installation directory exists."""
    install_dir = host.file("C:\\Apache24")
    assert install_dir.exists
    assert install_dir.is_directory


def test_port_is_listening(host):
    """Test that the port is listening."""
    cmd = host.run("netstat -an | findstr :80")
    assert "LISTENING" in cmd.stdout
```

## Test Scenarios

### default
Standard test - syntax, create, converge, idempotence, verify, destroy.

### idempotence
Runs converge twice, verifies no changes on second run.
```yaml
scenario:
  name: idempotence
  test_sequence:
    - converge
    - converge  # Should report 0 changed
```

### side_effect
Tests upgrade paths or configuration changes.
```yaml
# molecule/side_effect/molecule.yml
scenario:
  name: side_effect
  test_sequence:
    - converge
    - side_effect  # Apply changes
    - verify
```

```yaml
# molecule/side_effect/side_effect.yml
---
- name: Side Effect - Upgrade scenario
  hosts: all
  become: true

  tasks:
    - name: Simulate configuration change
      ansible.builtin.lineinfile:
        path: /etc/nginx/nginx.conf
        line: "# Changed by side_effect test"
```

## Running Molecule

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

# List instances
molecule list
```

## CI/CD Integration (GitHub Actions)

```yaml
name: Molecule Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        scenario:
          - default
          - idempotence

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install molecule molecule-plugins[docker] ansible-lint

      - name: Run Molecule
        run: molecule test -s ${{ matrix.scenario }}
```
