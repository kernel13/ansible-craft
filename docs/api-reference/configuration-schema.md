# Configuration Schema

Complete reference for ansible-craft configuration file format and options.

## Overview

ansible-craft uses a TOML configuration file stored at:
```
~/.config/ansible-craft/config.toml
```

## File Structure

```toml
# API Configuration
[api]
key = "sk-ant-api03-..."

# Default Settings
[defaults]
model = "sonnet"
complex = false

# Role Wizard Defaults
[defaults.role]
platforms = ["ubuntu", "debian"]
ansible_version = "2.14"
require_privilege = true
molecule = false
ci_provider = "github"

# Playbook Wizard Defaults
[defaults.playbook]
inventory_groups = ["webservers", "databases"]
connection = "ssh"
become = true
```

## Configuration Sections

### [api]

API-related configuration.

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `key` | string | Yes* | Anthropic API key |

*Required unless `ANTHROPIC_API_KEY` environment variable is set.

```toml
[api]
key = "sk-ant-api03-your-key-here"
```

### [defaults]

Default behavior settings.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `model` | string | `"sonnet"` | Default model: `"sonnet"` or `"opus"` |
| `complex` | boolean | `false` | Enable complex mode by default |

```toml
[defaults]
model = "sonnet"
complex = false
```

### [defaults.role]

Default values for the role wizard. Used with `--quick` flag.

| Key | Type | Default | Values | Description |
|-----|------|---------|--------|-------------|
| `platforms` | string[] | `["all"]` | See below | Target platforms |
| `ansible_version` | string | `"2.14"` | `"2.9"`, `"2.14"`, `"2.15"`, `"2.16"` | Minimum Ansible version |
| `require_privilege` | boolean | `true` | `true`, `false` | Require sudo/become |
| `molecule` | boolean | `false` | `true`, `false` | Include Molecule tests |
| `ci_provider` | string | `"none"` | `"github"`, `"gitlab"`, `"none"` | CI provider |

#### Platform Values

| Value | Description |
|-------|-------------|
| `"all"` | All platforms |
| `"el"` | Enterprise Linux (RHEL, CentOS, Rocky, Alma) |
| `"debian"` | Debian |
| `"ubuntu"` | Ubuntu |

```toml
[defaults.role]
platforms = ["ubuntu", "debian"]
ansible_version = "2.14"
require_privilege = true
molecule = true
ci_provider = "github"
```

### [defaults.playbook]

Default values for the playbook wizard. Used with `--quick` flag.

| Key | Type | Default | Values | Description |
|-----|------|---------|--------|-------------|
| `inventory_groups` | string[] | `["all"]` | Any strings | Target inventory groups |
| `connection` | string | `"ssh"` | `"ssh"`, `"local"`, `"winrm"` | Connection type |
| `become` | boolean | `true` | `true`, `false` | Enable privilege escalation |

```toml
[defaults.playbook]
inventory_groups = ["webservers", "databases", "loadbalancers"]
connection = "ssh"
become = true
```

## Environment Variables

Environment variables override config file values.

| Variable | Overrides | Description |
|----------|-----------|-------------|
| `ANTHROPIC_API_KEY` | `[api].key` | API key |

### Precedence

1. Command-line flags (highest priority)
2. Environment variables
3. Config file values
4. Built-in defaults (lowest priority)

**Example:**

```bash
# Config file has model = "sonnet"
# But command line overrides:
ansible-craft new role "nginx" --complex  # Uses opus
```

## Example Configurations

### Minimal Configuration

```toml
[api]
key = "sk-ant-api03-..."
```

### Full Configuration

```toml
# Anthropic API settings
[api]
key = "sk-ant-api03-your-key-here"

# General defaults
[defaults]
model = "sonnet"
complex = false

# Role generation defaults
[defaults.role]
platforms = ["ubuntu", "debian"]
ansible_version = "2.14"
require_privilege = true
molecule = true
ci_provider = "github"

# Playbook generation defaults
[defaults.playbook]
inventory_groups = ["webservers", "databases"]
connection = "ssh"
become = true
```

### Enterprise Linux Focus

```toml
[api]
key = "sk-ant-api03-..."

[defaults.role]
platforms = ["el"]
ansible_version = "2.14"
require_privilege = true
molecule = true
ci_provider = "gitlab"
```

### Multi-Environment Playbooks

```toml
[api]
key = "sk-ant-api03-..."

[defaults.playbook]
inventory_groups = ["staging", "production"]
connection = "ssh"
become = true
```

## Creating Configuration

### Interactive

```bash
# Set up API key and general settings
ansible-craft config save

# Configure role defaults
ansible-craft config defaults role

# Configure playbook defaults
ansible-craft config defaults playbook
```

### Non-Interactive

```bash
# Set API key
ansible-craft config save --api-key sk-ant-api03-... -y
```

### Manual

Create the file directly:

```bash
mkdir -p ~/.config/ansible-craft
cat > ~/.config/ansible-craft/config.toml << 'EOF'
[api]
key = "sk-ant-api03-your-key-here"

[defaults]
model = "sonnet"
EOF
```

## Validation

The config file is validated on load:

| Validation | Error |
|------------|-------|
| API key format | "Invalid API key format" |
| Model value | "Model must be 'sonnet' or 'opus'" |
| Platform values | "Unknown platform: xyz" |
| Ansible version | "Unknown Ansible version: xyz" |
| CI provider | "Unknown CI provider: xyz" |
| Connection type | "Unknown connection type: xyz" |

## Security

### API Key Storage

The API key is stored in plain text. To secure:

1. **File permissions**: `chmod 600 ~/.config/ansible-craft/config.toml`
2. **Environment variable**: Use `ANTHROPIC_API_KEY` instead
3. **Secret manager**: Inject from Vault, AWS Secrets Manager, etc.

### Recommended Practice

For CI/CD, use environment variables:

```bash
# Don't store in config file
export ANTHROPIC_API_KEY="$SECRET_FROM_VAULT"
ansible-craft new role "nginx"
```

## Troubleshooting

### View Current Config

```bash
cat ~/.config/ansible-craft/config.toml
```

### Reset Config

```bash
rm ~/.config/ansible-craft/config.toml
ansible-craft config save
```

### Config Not Loading

Check file permissions:
```bash
ls -la ~/.config/ansible-craft/config.toml
# Should be readable by your user
```

Check TOML syntax:
```bash
# Install toml-cli or use Python
python3 -c "import toml; toml.load(open('$HOME/.config/ansible-craft/config.toml'))"
```

## Related

- **[CLI API](cli-api.md)** - Command reference
- **[Installation](../user-guide/installation.md)** - Initial setup
- **[config Command](../user-guide/commands/config.md)** - Config commands
