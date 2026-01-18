# Phase 2: Configuration - Research

**Researched:** 2026-01-18
**Domain:** CLI configuration management with TOML, environment variables, and interactive prompts
**Confidence:** HIGH

## Summary

Phase 2 establishes the configuration system for ansible-craft: API key management, persistent preferences in TOML format, and interactive setup. The standard approach uses smol-toml for TOML parsing/serialization (fastest, TOML 1.0+ compliant), @inquirer/prompts for interactive configuration, and Node.js built-in modules for file system operations.

Key research findings:
- **smol-toml** is the recommended TOML library: fastest performance, TOML 1.1.0 compliant, native TypeScript, supports parse and stringify
- **@inquirer/prompts** provides modern, modular interactive prompts with full TypeScript support
- Anthropic API has a **token counting endpoint** (`/v1/messages/count_tokens`) that can validate API keys without consuming tokens
- File permissions (`0o600`) can be set via `fs.chmod()` but Windows only supports write permission changes
- Config location `~/.ansible-craft/config.toml` uses `os.homedir()` + `path.join()` for cross-platform paths

**Primary recommendation:** Use smol-toml for config file parsing/writing, @inquirer/prompts for interactive setup, and the token counting endpoint for API key validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| smol-toml | ^1.3.1 | TOML parsing and serialization | Fastest (2-4x faster parsing, 4-18x faster stringify), TOML 1.1.0 compliant, native TypeScript |
| @inquirer/prompts | ^7.x | Interactive CLI prompts | Modern API, modular imports, full TypeScript support, async/await native |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @inquirer/password | ^4.x | Masked password/key input | API key entry (separate import for smaller bundle) |
| @inquirer/confirm | ^5.x | Yes/no confirmation prompts | Config overwrite confirmation |
| @inquirer/select | ^4.x | Single-choice selection | Model selection (sonnet/opus) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| smol-toml | @iarna/toml | Slower (2x), but supports async/streaming for huge files |
| smol-toml | js-toml | Similar features, but smol-toml is more actively maintained and faster |
| @inquirer/prompts | enquirer | Similar features, but @inquirer/prompts is more actively maintained |
| Manual prompts | prompts | Simpler API but less TypeScript support |

**Installation:**
```bash
bun add smol-toml @inquirer/prompts
```

Or for granular imports (smaller bundle):
```bash
bun add smol-toml @inquirer/input @inquirer/password @inquirer/confirm @inquirer/select
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── config/
│   ├── index.ts          # Public config API (loadConfig, saveConfig)
│   ├── schema.ts         # Config TypeScript interfaces and validation
│   ├── paths.ts          # Config file path resolution
│   ├── toml.ts           # TOML read/write with smol-toml
│   └── defaults.ts       # Default configuration values
├── api/
│   └── validate-key.ts   # API key validation via token counting endpoint
├── cli/
│   ├── commands/
│   │   └── config.ts     # config save subcommand
│   └── prompts/
│       └── setup.ts      # Interactive setup wizard prompts
└── types/
    └── config.ts         # Config-related TypeScript types
```

### Pattern 1: Config File Structure (TOML)
**What:** Structured configuration with grouped sections
**When to use:** Default config file format
**Example:**
```toml
# ansible-craft configuration
# Location: ~/.ansible-craft/config.toml

[api]
# Your Anthropic API key (get one at https://console.anthropic.com/)
# Can also be set via ANTHROPIC_API_KEY environment variable
key = "sk-ant-api03-..."

[defaults]
# Default model for generation (sonnet = faster, opus = more capable)
model = "sonnet"

# Use complex mode by default (more detailed output)
complex = false

[output]
# Default output format (json, yaml, plain)
format = "plain"

# Show verbose output by default
verbose = false

# Default to dry-run mode (preview without writing files)
dry_run = false
```

### Pattern 2: Config Loading with Environment Override
**What:** Load config from file with environment variable support and conflict detection
**When to use:** Application initialization
**Example:**
```typescript
// Source: Best practices for CLI config management
import { parse } from 'smol-toml';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface Config {
  api: { key?: string };
  defaults: { model: 'sonnet' | 'opus'; complex: boolean };
  output: { format: string; verbose: boolean; dry_run: boolean };
}

const CONFIG_DIR = path.join(os.homedir(), '.ansible-craft');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.toml');

export async function loadConfig(): Promise<Config> {
  const envKey = process.env.ANTHROPIC_API_KEY;

  // Load file config if exists
  let fileConfig: Partial<Config> = {};
  if (existsSync(CONFIG_PATH)) {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    fileConfig = parse(content) as Partial<Config>;
  }

  const fileKey = fileConfig.api?.key;

  // Detect conflict: both set and different
  if (envKey && fileKey && envKey !== fileKey) {
    throw new CLIError(
      'API key conflict: ANTHROPIC_API_KEY and config file have different values',
      'CONFIG_CONFLICT',
      'Remove API key from one source, or ensure they match'
    );
  }

  // Merge with defaults
  return {
    api: { key: envKey || fileKey },
    defaults: {
      model: fileConfig.defaults?.model ?? 'sonnet',
      complex: fileConfig.defaults?.complex ?? false,
    },
    output: {
      format: fileConfig.defaults?.format ?? 'plain',
      verbose: fileConfig.defaults?.verbose ?? false,
      dry_run: fileConfig.defaults?.dry_run ?? false,
    },
  };
}
```

### Pattern 3: Config Saving with Merge and Permissions
**What:** Write config to TOML file with existing config merge and secure permissions
**When to use:** config save command
**Example:**
```typescript
// Source: Node.js fs documentation, smol-toml documentation
import { parse, stringify } from 'smol-toml';
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';

export async function saveConfig(updates: Partial<Config>): Promise<void> {
  // Ensure directory exists
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
    console.log(`Created config directory: ${CONFIG_DIR}`);
  }

  // Load existing config
  let existing: Partial<Config> = {};
  if (existsSync(CONFIG_PATH)) {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    existing = parse(content) as Partial<Config>;
  }

  // Deep merge updates into existing
  const merged = deepMerge(existing, updates);

  // Generate TOML with comments (smol-toml stringify doesn't preserve comments)
  const toml = generateConfigToml(merged);

  // Write with secure permissions
  await writeFile(CONFIG_PATH, toml, { encoding: 'utf-8', mode: 0o600 });

  // Explicit chmod for systems where mode in writeFile is ignored
  await chmod(CONFIG_PATH, 0o600);
}
```

### Pattern 4: Interactive Setup Wizard
**What:** Guide user through first-time configuration
**When to use:** First run or `ansible-craft config save` without flags
**Example:**
```typescript
// Source: @inquirer/prompts documentation
import { input, password, select, confirm } from '@inquirer/prompts';

export async function runSetupWizard(): Promise<Partial<Config>> {
  console.log('\nWelcome to ansible-craft! Let\'s set up your configuration.\n');

  const apiKey = await password({
    message: 'Enter your Anthropic API key:',
    mask: '*',
    validate: (value) => {
      if (!value) return 'API key is required';
      if (!value.startsWith('sk-ant-')) return 'Invalid API key format (should start with sk-ant-)';
      return true;
    },
  });

  const model = await select({
    message: 'Choose your default model:',
    choices: [
      { name: 'Sonnet (faster, good for most tasks)', value: 'sonnet' },
      { name: 'Opus (more capable, best for complex tasks)', value: 'opus' },
    ],
    default: 'sonnet',
  });

  const complex = await confirm({
    message: 'Enable complex mode by default?',
    default: false,
  });

  return {
    api: { key: apiKey },
    defaults: { model, complex },
  };
}
```

### Pattern 5: API Key Validation via Token Counting
**What:** Validate API key works without consuming tokens
**When to use:** Before saving API key to config, on first API call
**Example:**
```typescript
// Source: Anthropic API documentation - /v1/messages/count_tokens
const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1';

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${ANTHROPIC_API_BASE}/messages/count_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022', // Cheapest model for validation
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    if (response.status === 403) {
      return { valid: false, error: 'API key lacks required permissions' };
    }

    const data = await response.json().catch(() => ({}));
    return { valid: false, error: data.error?.message || `API error: ${response.status}` };
  } catch (error) {
    return { valid: false, error: `Network error: ${error instanceof Error ? error.message : 'Unknown'}` };
  }
}
```

### Pattern 6: API Key Masking
**What:** Mask API key in all output for security
**When to use:** Any display of API key (config show, errors, verbose output)
**Example:**
```typescript
// Source: Best practices for credential masking
export function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '***';

  // Show first 7 chars (sk-ant-) and last 4 chars, mask the rest
  const prefix = key.slice(0, 11); // "sk-ant-api0"
  const suffix = key.slice(-4);
  return `${prefix}***...***${suffix}`;
}

// Example: "sk-ant-api03-abc...xyz1234" -> "sk-ant-api0***...***1234"
```

### Anti-Patterns to Avoid
- **Storing API key in code:** Always use env vars or config file, never hardcode
- **Logging unmasked keys:** Always mask before any logging, even in debug mode
- **Ignoring file permissions:** Always set 0o600 on config files containing secrets
- **Silent config overwrites:** Always confirm before overwriting existing config
- **Blocking on first-run wizard:** Help/version should work without any config

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOML parsing | JSON with comments, custom parser | smol-toml | Edge cases in TOML spec (multiline strings, dates, inline tables) |
| Interactive prompts | readline, raw stdin handling | @inquirer/prompts | Cursor control, validation, masking, history |
| Path joining | String concatenation | path.join() | Cross-platform path separators (/ vs \) |
| Home directory | $HOME / USERPROFILE | os.homedir() | Cross-platform, handles edge cases |
| API key format validation | Simple startsWith | Regex with full pattern | Key formats may evolve, handle prefix variations |

**Key insight:** Configuration management has many edge cases (character encoding, atomic writes, cross-platform paths) that established libraries handle correctly.

## Common Pitfalls

### Pitfall 1: Config File Race Conditions
**What goes wrong:** Concurrent processes read/write config, causing data loss
**Why it happens:** Multiple CLI invocations or editor + CLI both writing
**How to avoid:** Use atomic writes (write to temp file, then rename), or file locking for read-modify-write
**Warning signs:** Users report config values reverting randomly

### Pitfall 2: Losing Comments on Config Save
**What goes wrong:** smol-toml stringify doesn't preserve comments, users lose documentation
**Why it happens:** TOML comments aren't part of the data model
**How to avoid:** Generate config file with template strings including comments, or use a template-based approach
**Warning signs:** Users confused about config options after editing

### Pitfall 3: Environment Variable Precedence Confusion
**What goes wrong:** User sets config file value, but env var overrides unexpectedly
**Why it happens:** Unclear precedence rules, no warning when both are set
**How to avoid:** Per CONTEXT.md decision: error on conflict if both env var and config file have different values
**Warning signs:** "My config changes don't work" bug reports

### Pitfall 4: File Permission Issues on Windows
**What goes wrong:** chmod(0o600) doesn't work on Windows, false sense of security
**Why it happens:** Windows doesn't support Unix permissions
**How to avoid:** Document the limitation, use ACLs on Windows, or accept the limitation with clear docs
**Warning signs:** Security audits flag config file permissions on Windows

### Pitfall 5: First-Run Blocking Help/Version
**What goes wrong:** `--help` or `--version` triggers setup wizard or errors about missing config
**Why it happens:** Config loading happens too early in command lifecycle
**How to avoid:** Per CONTEXT.md: help/version always work without any config; defer config loading until actually needed
**Warning signs:** Users can't get help when first installing

### Pitfall 6: Exposing API Key in Error Messages
**What goes wrong:** Error message includes full API key: "Invalid key: sk-ant-api03-xyz..."
**Why it happens:** Directly interpolating key into error strings
**How to avoid:** Always use maskApiKey() before any string that might be logged or displayed
**Warning signs:** API keys appearing in error screenshots, logs, or issue reports

## Code Examples

Verified patterns from official sources:

### smol-toml Parse and Stringify
```typescript
// Source: smol-toml GitHub README
import { parse, stringify } from 'smol-toml';

// Parse TOML string to JavaScript object
const config = parse(`
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"
`);
// Result: { api: { key: "sk-ant-..." }, defaults: { model: "sonnet" } }

// Stringify JavaScript object to TOML
const toml = stringify({
  api: { key: 'sk-ant-api03-...' },
  defaults: { model: 'sonnet', complex: false },
});
// Result: "[api]\nkey = \"sk-ant-api03-...\"\n\n[defaults]\nmodel = \"sonnet\"\ncomplex = false\n"
```

### @inquirer/prompts Composition
```typescript
// Source: Inquirer.js GitHub README
import { input, password, confirm, select } from '@inquirer/prompts';

// Collect multiple answers sequentially
const answers = {
  apiKey: await password({
    message: 'API key:',
    mask: '*',
  }),
  model: await select({
    message: 'Default model:',
    choices: [
      { name: 'Sonnet', value: 'sonnet' },
      { name: 'Opus', value: 'opus' },
    ],
  }),
  confirmSave: await confirm({
    message: 'Save configuration?',
    default: true,
  }),
};
```

### Cross-Platform Config Path
```typescript
// Source: Node.js os and path documentation
import os from 'node:os';
import path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.ansible-craft');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.toml');

// Results:
// macOS/Linux: /Users/username/.ansible-craft/config.toml
// Windows: C:\Users\username\.ansible-craft\config.toml
```

### Secure File Write with Permissions
```typescript
// Source: Node.js fs documentation
import { writeFile, chmod, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function writeSecureConfig(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);

  // Create directory if needed
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  // Write file
  await writeFile(filePath, content, { encoding: 'utf-8' });

  // Set permissions (owner read/write only)
  // Note: On Windows, only affects write permission
  await chmod(filePath, 0o600);
}
```

### Error Message for Missing API Key
```typescript
// Source: CONTEXT.md requirements - multi-line guided setup
import chalk from 'chalk';
import boxen from 'boxen';

function displayMissingApiKeyError(): void {
  const message = `
${chalk.bold('API key required')}

ansible-craft needs an Anthropic API key to generate Ansible roles.

${chalk.yellow('To get an API key:')}
  1. Go to ${chalk.cyan('https://console.anthropic.com/')}
  2. Sign in or create an account
  3. Navigate to API Keys and create a new key

${chalk.yellow('To configure ansible-craft:')}
  ${chalk.dim('Option 1:')} Set environment variable
    ${chalk.green('export ANTHROPIC_API_KEY="sk-ant-..."')}

  ${chalk.dim('Option 2:')} Run setup wizard
    ${chalk.green('ansible-craft config save')}

${chalk.dim('Documentation: https://github.com/your-repo/ansible-craft#configuration')}
`;

  const box = boxen(message.trim(), {
    padding: 1,
    borderStyle: 'round',
    borderColor: 'yellow',
    title: 'Configuration Required',
    titleAlignment: 'center',
  });

  process.stderr.write(box + '\n');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| toml (v0.4 spec) | smol-toml (v1.1 spec) | 2023-2024 | Full TOML 1.0+ support, better perf |
| inquirer (legacy) | @inquirer/prompts | 2023 | Smaller bundle, modern API, better TS |
| Manual env parsing | Built-in process.env | Always | Standard Node.js pattern |
| configstore | Manual TOML + fs | Varies | More control, standard format |

**Deprecated/outdated:**
- `toml` package: Only supports TOML v0.4, not maintained
- `inquirer` (main package): Works but legacy, prefer @inquirer/prompts
- Custom INI/JSON configs: TOML is more human-readable for CLI config

## Open Questions

Things that couldn't be fully resolved:

1. **Token counting endpoint token consumption**
   - What we know: The `/v1/messages/count_tokens` endpoint exists for counting tokens
   - What's unclear: Whether it consumes any tokens/credits for the request itself (likely no, but unverified)
   - Recommendation: Test with a real API key; if it does consume tokens, fall back to minimal messages request with `max_tokens: 1`

2. **Windows file permissions**
   - What we know: `chmod(0o600)` on Windows only affects write permission
   - What's unclear: Whether we need Windows ACL support for true security
   - Recommendation: Document the limitation; config file security on Windows is inherently weaker

3. **First-run wizard vs command flow**
   - What we know: CONTEXT.md says "offer to run interactive config save wizard automatically" on first run
   - What's unclear: Exact UX for when to trigger (every command? only generation commands?)
   - Recommendation: Only trigger for commands that need API key, not for help/version/config commands

## Sources

### Primary (HIGH confidence)
- [smol-toml GitHub](https://github.com/squirrelchat/smol-toml) - TOML parsing/stringify, TypeScript support, performance benchmarks
- [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js) - @inquirer/prompts API, TypeScript usage, prompt types
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages) - API endpoint details, authentication, error responses
- [Anthropic Token Counting API](https://platform.claude.com/docs/en/api/messages-count-tokens) - Lightweight key validation
- [Node.js fs documentation](https://nodejs.org/api/fs.html) - chmod, writeFile, permissions

### Secondary (MEDIUM confidence)
- [Node.js os module](https://nodejs.org/api/os.html) - os.homedir() for cross-platform paths
- [Node.js path module](https://nodejs.org/api/path.html) - path.join() for cross-platform path building
- WebSearch results for TOML library comparison (multiple sources agree on smol-toml performance)

### Tertiary (LOW confidence)
- WebSearch results on Windows file permissions - general consensus but not officially documented
- Best practices for API key masking - derived from common patterns, no single authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - smol-toml and @inquirer/prompts are well-documented with official sources
- Architecture: HIGH - Patterns verified from library documentation and Node.js best practices
- API validation: MEDIUM - Token counting endpoint exists, exact behavior for validation use case unverified
- Pitfalls: MEDIUM - Based on common CLI config issues, some Windows-specific behavior unverified

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable technologies)
