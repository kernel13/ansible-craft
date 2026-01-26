# config Command

Manage ansible-craft configuration settings.

## Synopsis

```bash
ansible-craft config <subcommand> [options]
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `save` | Save API key and general settings |
| `defaults` | Configure wizard defaults |

---

## config save

Save API key and general configuration settings.

### Synopsis

```bash
ansible-craft config save [options]
```

### Options

| Option | Description |
|--------|-------------|
| `--api-key <key>` | Anthropic API key to save |
| `--model <model>` | Default model: `sonnet` or `opus` |
| `--complex` | Enable complex mode by default |
| `--no-validate` | Skip API key validation |
| `-y, --yes` | Skip confirmation prompt |

### Examples

#### Interactive Setup

```bash
ansible-craft config save
```

The interactive wizard:
1. Prompts for API key (if not set)
2. Validates the key against the API
3. Asks for default preferences
4. Saves to config file

#### Non-Interactive Setup

```bash
# Set API key directly
ansible-craft config save --api-key sk-ant-api03-... -y

# Set API key and default model
ansible-craft config save --api-key sk-ant-api03-... --model opus -y

# Skip validation (useful for CI/CD)
ansible-craft config save --api-key sk-ant-api03-... --no-validate -y
```

### Config File Location

Configuration is stored in:
```
~/.config/ansible-craft/config.toml
```

### Config File Format

```toml
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"  # or "opus"
complex = false
```

---

## config defaults

Configure wizard defaults for roles and playbooks. These defaults are used when running with `--quick`.

### Synopsis

```bash
ansible-craft config defaults <type>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<type>` | Type of defaults: `role` or `playbook` |

### Examples

#### Configure Role Defaults

```bash
ansible-craft config defaults role
```

The wizard prompts for:
- Supported platforms (EL, Debian, Ubuntu, All)
- Minimum Ansible version (2.9, 2.14, 2.15, 2.16)
- Privilege requirements (Yes/No)
- Molecule testing (Yes/No)
- CI provider (GitHub Actions, GitLab CI, None)

#### Configure Playbook Defaults

```bash
ansible-craft config defaults playbook
```

The wizard prompts for:
- Target inventory groups
- Connection type (SSH, Local, WinRM)
- Privilege escalation (sudo, none)

### Using Saved Defaults

After saving defaults, use `--quick` to skip the wizard:

```bash
# Uses saved role defaults
ansible-craft new role "nginx" --quick

# Uses saved playbook defaults
ansible-craft new playbook "deploy app" --quick
```

### Stored Location

Defaults are saved in the same config file:

```toml
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"
complex = false

[defaults.role]
platforms = ["ubuntu", "debian"]
ansible_version = "2.14"
require_privilege = true
molecule = true
ci_provider = "github"

[defaults.playbook]
inventory_groups = ["webservers", "databases"]
connection = "ssh"
become = true
```

---

## Environment Variables

Environment variables override config file values:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key (highest priority) |

Example:
```bash
# Use env var instead of config file
export ANTHROPIC_API_KEY=sk-ant-api03-...
ansible-craft new role "nginx"
```

## Configuration Priority

Settings are loaded in this order (later overrides earlier):

1. Built-in defaults
2. Config file (`~/.config/ansible-craft/config.toml`)
3. Environment variables
4. Command-line flags

## Tips

### Multiple Configurations

For different projects, use environment variables:

```bash
# Project A - uses Opus
export ANTHROPIC_API_KEY=sk-ant-project-a-...
ansible-craft new role "complex role" --complex

# Project B - uses Sonnet
export ANTHROPIC_API_KEY=sk-ant-project-b-...
ansible-craft new role "simple role"
```

### CI/CD Setup

For CI/CD pipelines:

```bash
# Set API key from secret, skip validation
ansible-craft config save \
  --api-key "$ANTHROPIC_API_KEY" \
  --no-validate \
  -y
```

### Viewing Current Config

```bash
cat ~/.config/ansible-craft/config.toml
```

### Resetting Config

```bash
rm ~/.config/ansible-craft/config.toml
ansible-craft config save
```

## Related

- **[Installation](../installation.md)** - Initial setup
- **[Wizards Guide](../wizards.md)** - Understanding wizard options
- **[new role](new-role.md)** - Using --quick mode
- **[new playbook](new-playbook.md)** - Using --quick mode
