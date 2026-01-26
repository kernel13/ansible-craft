# Configuration Guide

Complete guide to configuring ansible-craft settings.

## Configuration File Location

ansible-craft stores configuration in:

```
~/.config/ansible-craft/config.toml
```

## Configuration Methods

### 1. Interactive Configuration (Recommended)

```bash
ansible-craft config save
```

This wizard prompts for:
- **API Key**: Your Anthropic API key
- **Default Model**: `sonnet` (fast, cost-effective) or `opus` (powerful, expensive)
- **Complex Mode**: Enable opus model by default for all generations

### 2. Command-Line Configuration

```bash
# Save API key
ansible-craft config save --api-key sk-ant-api03-xxxxx

# Set default model
ansible-craft config save --model sonnet

# Enable complex mode by default
ansible-craft config save --complex

# Skip confirmation
ansible-craft config save --api-key sk-ant-... --model sonnet -y
```

### 3. Environment Variables

Environment variables override config file settings:

```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Then run commands
ansible-craft new role "nginx"
```

## Configuration File Format

### Complete Configuration

```toml
[api]
key = "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

[defaults]
model = "sonnet"  # or "opus"
complex = false
```

### Configuration Options

#### `[api]` Section

| Option | Type | Description | Required |
|--------|------|-------------|----------|
| `key` | string | Anthropic API key | Yes |

#### `[defaults]` Section

| Option | Type | Values | Default | Description |
|--------|------|--------|---------|-------------|
| `model` | string | `"sonnet"`, `"opus"` | `"sonnet"` | Default AI model |
| `complex` | boolean | `true`, `false` | `false` | Use Opus model by default |

## AI Models

### Sonnet (Default)

- **Model**: `claude-sonnet-4-5-20250929`
- **Best For**: Most role and playbook generations
- **Speed**: Fast (5-15 seconds)
- **Cost**: ~$0.02-0.05 per generation
- **Quality**: High quality, follows Ansible best practices

**Use When:**
- Generating standard roles
- Creating playbooks
- Most daily tasks

### Opus (Complex Mode)

- **Model**: `claude-opus-4-5-20251031`
- **Best For**: Complex, multi-component systems
- **Speed**: Slower (15-30 seconds)
- **Cost**: ~$0.10-0.25 per generation
- **Quality**: Highest quality, deep analysis

**Use When:**
- Complex multi-service deployments
- Advanced security hardening
- Intricate template generation
- Deep code explanation needed

### Enabling Complex Mode

**Per-command:**
```bash
ansible-craft new role "kubernetes HA cluster" --complex
```

**By default:**
```bash
ansible-craft config save --complex
```

**Temporarily disable:**
```bash
# Complex mode is enabled in config, but use sonnet for this command
ansible-craft new role "simple nginx" --no-complex
```

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | API key (overrides config) | `sk-ant-api03-...` |

### Using Environment Variables

```bash
# Temporary (current session only)
export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx
ansible-craft new role "nginx"

# Permanent (add to shell profile)
echo 'export ANTHROPIC_API_KEY=sk-ant-api03-xxxxx' >> ~/.bashrc
source ~/.bashrc
```

## Obtaining an API Key

### 1. Sign Up for Anthropic

Visit [console.anthropic.com](https://console.anthropic.com) and create an account.

### 2. Add Credits

Navigate to **Settings** → **Billing** and add credits to your account.

### 3. Generate API Key

1. Go to **Settings** → **API Keys**
2. Click **Create Key**
3. Name your key (e.g., "ansible-craft")
4. Copy the key (starts with `sk-ant-api03-`)
5. ⚠️ **Save it securely** - it won't be shown again

### 4. Configure ansible-craft

```bash
ansible-craft config save --api-key sk-ant-api03-... -y
```

## Security Best Practices

### Protect Your API Key

```bash
# Check config file permissions (should be 600)
ls -la ~/.config/ansible-craft/config.toml

# Fix if needed
chmod 600 ~/.config/ansible-craft/config.toml
```

### Never Commit API Keys

Add to `.gitignore`:
```gitignore
# ansible-craft config
.ansible-craft/
config.toml
```

### Use Environment Variables in CI/CD

```yaml
# GitHub Actions example
jobs:
  generate:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
    steps:
      - uses: actions/checkout@v3
      - run: npx ansible-craft new role "nginx" --no-interactive
```

### Rotate Keys Regularly

Generate new API keys periodically and revoke old ones.

## Configuration Validation

### Test Configuration

```bash
# This implicitly validates the API key
ansible-craft new role "test" --dry-run
```

### Validate API Key Only

```bash
# Save and validate
ansible-craft config save --api-key sk-ant-... --no-skip-validate
```

## Multiple Configurations

### Per-Project Configuration

Not currently supported. Use environment variables for project-specific keys:

```bash
# In project directory
echo 'export ANTHROPIC_API_KEY=sk-ant-project-specific' > .env
source .env
ansible-craft new role "nginx"
```

### Team Configuration

For teams, use a shared secret manager:

```bash
# Fetch from 1Password, Vault, etc.
export ANTHROPIC_API_KEY=$(op read "op://vault/ansible-craft/api-key")
ansible-craft new role "nginx"
```

## Resetting Configuration

### Remove All Settings

```bash
rm ~/.config/ansible-craft/config.toml
```

### Reconfigure

```bash
ansible-craft config save
```

## Configuration Troubleshooting

### Config File Not Found

**Error:**
```
Error: Configuration file not found
```

**Solution:**
```bash
# Create config directory if it doesn't exist
mkdir -p ~/.config/ansible-craft

# Run config wizard
ansible-craft config save
```

### Permission Denied

**Error:**
```
Error: EACCES: permission denied, open '~/.config/ansible-craft/config.toml'
```

**Solution:**
```bash
# Check ownership
ls -la ~/.config/ansible-craft/

# Fix ownership
chown $USER:$USER ~/.config/ansible-craft/config.toml

# Fix permissions
chmod 600 ~/.config/ansible-craft/config.toml
```

### Invalid TOML Format

**Error:**
```
Error: Failed to parse configuration file
```

**Solution:**
1. Backup current config:
   ```bash
   cp ~/.config/ansible-craft/config.toml ~/.config/ansible-craft/config.toml.bak
   ```

2. Recreate config:
   ```bash
   ansible-craft config save
   ```

3. Or manually fix TOML syntax:
   ```bash
   nano ~/.config/ansible-craft/config.toml
   ```

## Advanced Configuration

### Config File Precedence

Configuration sources in order of precedence (highest to lowest):

1. **Environment Variables** (`ANTHROPIC_API_KEY`)
2. **Config File** (`~/.config/ansible-craft/config.toml`)
3. **Default Values** (built into CLI)

### Future Configuration Options

Planned for future releases:

- Custom output directory default
- Template preferences
- Validation rule customization
- Custom prompts
- Model fine-tuning parameters

## See Also

- **[Quick Start](quick-start.md)** - Getting started guide
- **[Troubleshooting](troubleshooting.md)** - Common configuration issues
- **[Security Best Practices](../development/security.md)** - Advanced security
