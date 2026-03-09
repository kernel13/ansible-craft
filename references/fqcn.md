# FQCN Reference

Fully Qualified Collection Names for all Ansible modules.

## Core Modules (ansible.builtin)

### Package Management
| Short Name | FQCN |
|------------|------|
| apt | ansible.builtin.apt |
| yum | ansible.builtin.yum |
| dnf | ansible.builtin.dnf |
| package | ansible.builtin.package |
| pip | ansible.builtin.pip |
| apt_repository | ansible.builtin.apt_repository |
| yum_repository | ansible.builtin.yum_repository |

### File Operations
| Short Name | FQCN |
|------------|------|
| file | ansible.builtin.file |
| copy | ansible.builtin.copy |
| template | ansible.builtin.template |
| lineinfile | ansible.builtin.lineinfile |
| blockinfile | ansible.builtin.blockinfile |
| stat | ansible.builtin.stat |
| unarchive | ansible.builtin.unarchive |
| get_url | ansible.builtin.get_url |

### Service Management
| Short Name | FQCN |
|------------|------|
| service | ansible.builtin.service |
| systemd | ansible.builtin.systemd_service |
| systemd_service | ansible.builtin.systemd_service |

### User/Group Management
| Short Name | FQCN |
|------------|------|
| user | ansible.builtin.user |
| group | ansible.builtin.group |

### Control Flow
| Short Name | FQCN |
|------------|------|
| include_tasks | ansible.builtin.include_tasks |
| import_tasks | ansible.builtin.import_tasks |
| include_vars | ansible.builtin.include_vars |
| set_fact | ansible.builtin.set_fact |
| debug | ansible.builtin.debug |
| fail | ansible.builtin.fail |
| assert | ansible.builtin.assert |

### Command Execution
| Short Name | FQCN |
|------------|------|
| command | ansible.builtin.command |
| shell | ansible.builtin.shell |

## Windows Modules (ansible.windows)

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
| win_reboot | ansible.windows.win_reboot |
| win_shell | ansible.windows.win_shell |
| win_command | ansible.windows.win_command |
| win_stat | ansible.windows.win_stat |
| win_acl | ansible.windows.win_acl |
| win_environment | ansible.windows.win_environment |
| win_path | ansible.windows.win_path |

### PowerShell Module Development

When creating custom Windows modules, follow these naming conventions:

```yaml
# Windows-specific modules (use win_ prefix)
- name: Manage Windows service
  mycompany.windows_utils.win_service_manager:
    name: MyService
    state: started

# IIS modules (use win_iis_ prefix)
- name: Configure IIS site
  mycompany.windows_utils.win_iis_website:
    name: MySite
    state: present
    port: 80

# SQL Server modules (use win_sql_ prefix)
- name: Manage SQL database
  mycompany.windows_utils.win_sql_database:
    name: MyDB
    state: present

# Active Directory modules (use win_ad_ prefix)
- name: Manage AD user
  mycompany.windows_utils.win_ad_user:
    name: jdoe
    state: present
```

### PowerShell Module Requirements

PowerShell modules in collections require:

1. **Shebang and requirements:**
   ```powershell
   #!powershell
   #AnsibleRequires -CSharpUtil Ansible.Basic
   ```

2. **Module initialization:**
   ```powershell
   $spec = @{
       options = @{
           name = @{ type = "str"; required = $true }
           state = @{ type = "str"; default = "present"; choices = "absent", "present" }
       }
       supports_check_mode = $true
   }

   $module = [Ansible.Basic.AnsibleModule]::Create($args, $spec)
   ```

3. **Parameter access:**
   ```powershell
   $name = $module.Params.name
   $state = $module.Params.state
   $checkMode = $module.CheckMode
   ```

4. **Result handling:**
   ```powershell
   # Success
   $module.Result.changed = $true
   $module.Result.message = "Operation completed"
   $module.ExitJson()

   # Failure
   $module.FailJson("Error message", $error)
   ```

5. **Check mode support:**
   ```powershell
   if (-not $checkMode) {
       # Only perform changes if not in check mode
       # Make actual changes here
   }
   else {
       # Report what would be changed
       $module.Result.changed = $true
       $module.Result.message = "Would make changes"
   }
   ```

### PowerShell vs Python Modules

Collections can contain both Python and PowerShell modules:

| Aspect | Python Modules | PowerShell Modules |
|--------|----------------|-------------------|
| **File extension** | `.py` | `.ps1` |
| **Target OS** | Linux, macOS, Windows (with PSCore) | Windows |
| **Execution** | Python interpreter on control node or target | PowerShell on Windows target |
| **Module utils** | `plugins/module_utils/*.py` | `plugins/module_utils/*.psm1` |
| **Naming** | `module_name.py` | `win_module_name.ps1` |
| **FQCN usage** | `namespace.name.module_name` | `namespace.name.win_module_name` |

### Mixed Environment Example

A collection supporting both Linux and Windows:

```
plugins/modules/
  example_module.py           # Works on Linux/macOS
  win_example_module.ps1      # Windows-specific version
  service_manager.py          # Cross-platform (uses platform detection)
  win_iis_website.ps1         # Windows-only (IIS specific)
```

**Playbook using both:**
```yaml
- name: Configure cross-platform environment
  hosts: all
  tasks:
    # Python module - runs on Linux/macOS
    - name: Configure on Linux
      mycompany.utils.example_module:
        name: example
        state: present
      when: ansible_os_family != "Windows"

    # PowerShell module - runs on Windows
    - name: Configure on Windows
      mycompany.utils.win_example_module:
        name: example
        state: present
      when: ansible_os_family == "Windows"
```

## Windows Modules (community.windows)

| Short Name | FQCN |
|------------|------|
| win_firewall | community.windows.win_firewall |
| win_firewall_rule | community.windows.win_firewall_rule |
| win_scheduled_task | community.windows.win_scheduled_task |
| win_scheduled_task_stat | community.windows.win_scheduled_task_stat |
| win_nssm | community.windows.win_nssm |
| win_iis_website | community.windows.win_iis_website |
| win_iis_webbinding | community.windows.win_iis_webbinding |
| win_iis_webapppool | community.windows.win_iis_webapppool |
| win_timezone | community.windows.win_timezone |
| win_hosts | community.windows.win_hosts |
| win_product_facts | community.windows.win_product_facts |

## Chocolatey Modules (chocolatey.chocolatey)

| Short Name | FQCN |
|------------|------|
| win_chocolatey | chocolatey.chocolatey.win_chocolatey |
| win_chocolatey_source | chocolatey.chocolatey.win_chocolatey_source |
| win_chocolatey_feature | chocolatey.chocolatey.win_chocolatey_feature |
| win_chocolatey_config | chocolatey.chocolatey.win_chocolatey_config |

## Community Modules

### PostgreSQL (community.postgresql)
| Short Name | FQCN |
|------------|------|
| postgresql_db | community.postgresql.postgresql_db |
| postgresql_user | community.postgresql.postgresql_user |
| postgresql_privs | community.postgresql.postgresql_privs |

### MySQL (community.mysql)
| Short Name | FQCN |
|------------|------|
| mysql_db | community.mysql.mysql_db |
| mysql_user | community.mysql.mysql_user |

### Docker (community.docker)
| Short Name | FQCN |
|------------|------|
| docker_container | community.docker.docker_container |
| docker_image | community.docker.docker_image |
| docker_network | community.docker.docker_network |
