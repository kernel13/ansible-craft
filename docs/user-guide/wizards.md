# Interactive Wizards

ansible-craft uses interactive wizards to gather configuration details for role and playbook generation.

## Overview

When you run `new role` or `new playbook`, the CLI launches a wizard that asks clarifying questions about your requirements. This helps generate more accurate and tailored Ansible code.

## Role Wizard

The role wizard gathers information about:

### Supported Platforms

```
? Which platforms should this role support? (Press <space> to select, <a> to toggle all)
❯◯ EL (RHEL, CentOS, Rocky, Alma)
 ◯ Debian
 ◯ Ubuntu
 ◯ All
```

Select one or more target platforms. This affects:
- Package manager tasks (apt vs dnf/yum)
- Service names and paths
- Configuration file locations

### Minimum Ansible Version

```
? Minimum Ansible version required?
❯ 2.9
  2.14
  2.15
  2.16
```

Affects which module features and syntax are used.

### Privilege Requirements

```
? Does this role require root/sudo privileges?
❯ Yes
  No
```

Sets `become: true` in tasks that need elevated permissions.

### Molecule Testing

```
? Include Molecule test scaffolding?
❯ Yes
  No
```

If yes, generates:
- `molecule/default/molecule.yml`
- `molecule/default/converge.yml`
- `molecule/default/verify.yml`
- `molecule/default/prepare.yml`

### CI Provider

```
? Which CI provider for automated testing?
❯ GitHub Actions
  GitLab CI
  None
```

Generates appropriate CI configuration file.

## Playbook Wizard

The playbook wizard gathers information about:

### Target Hosts/Groups

```
? What inventory groups will this playbook target?
> webservers, databases
```

Enter comma-separated group names for the inventory.

### Connection Type

```
? Connection type?
❯ SSH (default)
  Local
  WinRM
```

### Privilege Escalation

```
? Default privilege escalation?
❯ sudo (become: true)
  No privilege escalation
```

## Saving Defaults

After completing a wizard, you're prompted to save your choices as defaults:

```
? Save these settings as defaults for future roles?
❯ Yes
  No
```

If you choose "Yes", the settings are saved to `~/.config/ansible-craft/config.toml` and can be used with the `--quick` flag.

## Using Quick Mode

Once you've saved defaults, skip the wizard with `--quick`:

```bash
# Uses saved role defaults
ansible-craft new role "nginx with SSL" --quick

# Uses saved playbook defaults
ansible-craft new playbook "deploy app" --quick
```

## Configuring Defaults Separately

You can configure defaults without generating anything:

```bash
# Configure role defaults
ansible-craft config defaults role

# Configure playbook defaults
ansible-craft config defaults playbook
```

This runs only the wizard portion and saves your preferences.

## Default Values

If you skip questions (press Enter without selecting), these defaults apply:

### Role Defaults

| Setting | Default |
|---------|---------|
| Platforms | All |
| Ansible Version | 2.14 |
| Privilege Required | Yes |
| Molecule | No |
| CI Provider | None |

### Playbook Defaults

| Setting | Default |
|---------|---------|
| Target Hosts | all |
| Connection | SSH |
| Become | Yes |

## Skipping the Wizard

Use `--no-interactive` to skip the wizard entirely with default values:

```bash
ansible-craft new role "nginx" --no-interactive
```

This differs from `--quick`:
- `--no-interactive`: Uses built-in defaults
- `--quick`: Uses your saved preferences

## Wizard Flow Diagram

```
new role "description"
        │
        ▼
┌───────────────────┐
│   Role Wizard     │
├───────────────────┤
│ • Platforms       │
│ • Ansible Version │
│ • Privileges      │
│ • Molecule        │
│ • CI Provider     │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Save Defaults?   │──Yes──▶ Save to config.toml
└───────────────────┘
        │
        ▼
┌───────────────────┐
│   Plan Phase      │
│  (AI Generation)  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│  Review Preview   │
│ Accept/Modify/    │
│      Reject       │
└───────────────────┘
```

## Tips

### Be Specific About Platforms

Selecting specific platforms instead of "All" produces cleaner code without unnecessary `when` conditionals for platforms you don't use.

### Use Molecule for Complex Roles

For roles with multiple tasks or templates, Molecule testing helps catch issues early.

### Save Defaults for Consistency

If you work on projects with consistent requirements (same platforms, same CI), save defaults to speed up future generation.

## Related

- **[new role Command](commands/new-role.md)**
- **[new playbook Command](commands/new-playbook.md)**
- **[config defaults Command](commands/config.md#config-defaults)**
- **[Configuration](configuration.md)**
