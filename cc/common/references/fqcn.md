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
| win_firewall_rule | ansible.windows.win_firewall_rule |
| win_reboot | ansible.windows.win_reboot |
| win_shell | ansible.windows.win_shell |
| win_command | ansible.windows.win_command |
| win_stat | ansible.windows.win_stat |
| win_acl | ansible.windows.win_acl |
| win_environment | ansible.windows.win_environment |
| win_path | ansible.windows.win_path |
| win_scheduled_task | ansible.windows.win_scheduled_task |

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
