# Installation

Complete installation guide for ansible-craft CLI.

## Prerequisites

- **Node.js**: Version 18 or higher
- **Anthropic API Key**: Required for AI-powered generation ([console.anthropic.com](https://console.anthropic.com))
- **ansible-lint** (optional): For lint validation (`pip install ansible-lint`)

### Verify Node.js Version

```bash
node --version
# Should output v18.x.x or higher
```

## Installation Methods

### npm (Recommended)

```bash
npm install -g ansible-craft
```

### yarn

```bash
yarn global add ansible-craft
```

### pnpm

```bash
pnpm add -g ansible-craft
```

### Bun

```bash
bun add -g ansible-craft
```

## Verify Installation

```bash
# Check version
ansible-craft --version

# Verify help works
ansible-craft --help
```

Expected output:
```
Usage: ansible-craft [options] [command]

Generate production-ready Ansible roles and playbooks from natural language

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  new             Generate new Ansible roles or playbooks
  explain         Explain existing Ansible code
  fix             Fix Ansible errors
  config          Configure ansible-craft settings
  setup           Install Claude Code integration
  completions     Generate shell completions
  help [command]  display help for command
```

## Run Without Installing

If you prefer not to install globally, you can run directly:

### npx

```bash
npx ansible-craft new role "nginx web server"
```

### bunx

```bash
bunx ansible-craft new role "nginx web server"
```

### pnpx

```bash
pnpx ansible-craft new role "nginx web server"
```

## API Key Configuration

ansible-craft requires an Anthropic API key. Get one from [console.anthropic.com](https://console.anthropic.com).

### Option 1: Interactive Setup (Recommended)

```bash
ansible-craft config save
```

This launches an interactive wizard that:
1. Prompts for your API key
2. Validates the key
3. Saves to `~/.config/ansible-craft/config.toml`

### Option 2: Environment Variable

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

Add to your shell profile (`~/.bashrc`, `~/.zshrc`) for persistence.

### Option 3: Direct Configuration

```bash
ansible-craft config save --api-key sk-ant-api03-... -y
```

## Shell Completions

Enable tab completion for faster CLI usage:

### Bash

```bash
ansible-craft completions bash >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
ansible-craft completions zsh >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
ansible-craft completions fish > ~/.config/fish/completions/ansible-craft.fish
```

## Claude Code Integration

If you use [Claude Code](https://claude.ai/code), install the slash commands:

### Global Installation (All Projects)

```bash
ansible-craft setup
```

### Project-Local Installation

```bash
ansible-craft setup --project
```

See [Setup Command](commands/setup.md) for details.

## Troubleshooting

### "command not found: ansible-craft"

Your npm global bin directory may not be in PATH:

```bash
# Find npm global bin path
npm config get prefix

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH="$(npm config get prefix)/bin:$PATH"
```

### Permission Errors

Avoid using `sudo` with npm. Instead, configure npm to use a different directory:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### API Key Not Found

If you get "API key not configured" errors:

1. Verify the key is set: `echo $ANTHROPIC_API_KEY`
2. Or check config file: `cat ~/.config/ansible-craft/config.toml`
3. Re-run config: `ansible-craft config save`

## Updating

```bash
# npm
npm update -g ansible-craft

# yarn
yarn global upgrade ansible-craft

# pnpm
pnpm update -g ansible-craft
```

## Uninstalling

```bash
# npm
npm uninstall -g ansible-craft

# yarn
yarn global remove ansible-craft

# pnpm
pnpm remove -g ansible-craft
```

Remove configuration (optional):
```bash
rm -rf ~/.config/ansible-craft
```

## Next Steps

- **[Quick Start](quick-start.md)** - Generate your first role
- **[Configuration](configuration.md)** - Configure preferences
- **[Commands Reference](commands/)** - Learn all commands
