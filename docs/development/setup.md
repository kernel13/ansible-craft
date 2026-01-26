# Development Setup

Guide to setting up a development environment for ansible-craft.

## Prerequisites

### Required

- **Bun** v1.0+ - JavaScript runtime
- **Node.js** 18+ - For compatibility
- **Git** - Version control
- **Anthropic API Key** - For testing generation

### Optional

- **ansible-lint** - For lint validation testing
- **Molecule** - For testing generated Molecule files
- **Docker** - For Molecule tests

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft
```

### 2. Install Bun

If you don't have Bun installed:

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (via npm)
npm install -g bun
```

### 3. Install Dependencies

```bash
bun install
```

### 4. Configure API Key

For testing generation features:

```bash
# Set environment variable
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or create config file
mkdir -p ~/.config/ansible-craft
echo '[api]
key = "sk-ant-api03-..."' > ~/.config/ansible-craft/config.toml
```

## Directory Structure

```
ansible-craft/
├── src/                    # Application source code
│   ├── ai/                 # Anthropic SDK integration
│   ├── cli/                # Commander.js CLI
│   ├── config/             # Configuration management
│   ├── core/               # Agent orchestration
│   ├── explain/            # Code explanation
│   ├── generation/         # Role/playbook generation
│   ├── wizard/             # Interactive wizards
│   └── __test-utils__/     # Test utilities
├── cc/                     # Claude Code integration
│   ├── agents/             # Agent definitions
│   ├── skills/             # Slash commands
│   ├── common/references/  # Shared docs
│   └── scripts/            # Install scripts
├── docs/                   # Documentation
├── dist/                   # Build output
└── tests/                  # Integration tests
```

## Running the CLI

### Development Mode

```bash
# Using bun run dev
bun run dev new role "nginx with SSL"
bun run dev explain ./path/to/role
bun run dev fix "error message"

# Or directly
bun run src/cli/index.ts new role "nginx"
```

### With Debug Output

```bash
DEBUG=1 bun run dev new role "nginx"
```

## Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| dev | `bun run dev` | Run CLI in development mode |
| build | `bun run build` | Build for distribution |
| test | `bun test` | Run all tests |
| lint | `bun run lint` | Check code with Biome |
| format | `bun run format` | Format code with Biome |

## IDE Setup

### VS Code

Recommended extensions:
- **Biome** - Formatting and linting
- **Pretty TypeScript Errors** - Better error display
- **GitLens** - Git integration

Settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "biomejs.biome",
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### JetBrains (WebStorm/IntelliJ)

1. Install Biome plugin
2. Enable format on save: Settings → Languages → JavaScript → Prettier
3. Configure TypeScript: Use project TypeScript version

### Vim/Neovim

With [conform.nvim](https://github.com/stevearc/conform.nvim):

```lua
require("conform").setup({
  formatters_by_ft = {
    typescript = { "biome" },
    javascript = { "biome" },
  },
})
```

## Building

### Development Build

```bash
bun run build
```

Output in `dist/`:
- `dist/cli/index.js` - Main CLI entry point

### Testing the Build

```bash
# Run built CLI
node dist/cli/index.js new role "nginx"

# Or link globally
bun link
ansible-craft new role "nginx"
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for generation |
| `DEBUG` | Enable debug output |
| `NO_COLOR` | Disable colored output |

## Troubleshooting

### Bun Not Found

```bash
# Verify installation
bun --version

# If not found, reload shell
source ~/.bashrc  # or ~/.zshrc
```

### TypeScript Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
bun install
```

### Tests Failing

```bash
# Run specific test
bun test src/ai/client.test.ts

# Run with verbose output
bun test --reporter=verbose
```

### API Key Issues

```bash
# Verify key is set
echo $ANTHROPIC_API_KEY

# Test key validity
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

## Next Steps

- **[Testing Guide](testing.md)** - Running and writing tests
- **[Code Style](code-style.md)** - Code conventions
- **[Adding Commands](adding-commands.md)** - Create new CLI commands
- **[Contributing](contributing.md)** - Contribution workflow
