# Phase 13: Defaults Management - Research

**Researched:** 2026-01-23
**Domain:** Configuration persistence, TOML serialization, interactive prompts
**Confidence:** HIGH

## Summary

Phase 13 implements wizard defaults management for ansible-craft using existing infrastructure: `smol-toml` for TOML serialization, `@inquirer/prompts` for interactive confirmation, and the established config file system at `~/.config/ansible-craft/config.toml`. The phase extends the current TOML schema with nested `[defaults.role]` and `[defaults.playbook]` sections, adds post-generation save prompts, and implements `--quick` mode to apply stored defaults.

The existing codebase already has mature TOML reading/writing (`src/config/loader.ts`, `src/config/writer.ts`), interactive prompts (`@inquirer/prompts` throughout wizard code), and wizard context types (`src/wizard/types.ts`). The research confirms no new dependencies are needed - implementation requires extending existing patterns to support wizard defaults.

**Primary recommendation:** Extend the existing `Config` type with wizard defaults, reuse `saveConfig()` with new nested sections, add post-generation prompts using `confirm()`, and implement `--quick` mode logic in CLI commands by pre-populating wizard context from stored defaults.

## Standard Stack

The established libraries already in use for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| smol-toml | 1.6.0 | TOML parsing and serialization | Most downloaded TOML parser on npm, battle-tested, fully TOML 1.1.0 compliant |
| @inquirer/prompts | 8.2.0 | Interactive CLI prompts | Already used throughout wizard code, provides `confirm`, `select`, `checkbox` |
| zod | 4.3.5 | Runtime validation | Already validates wizard context, will validate defaults schema |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| chalk | 5.4.1 | Terminal styling | Display save previews, success messages |
| node:fs/promises | Built-in | File operations | Already used in config writer for atomic writes |
| node:path | Built-in | Path resolution | Project-level `.ansible-craft.toml` lookup |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| smol-toml | @iarna/toml | smol-toml is faster, more downloads, better maintained |
| @inquirer/prompts | prompts | Already using inquirer throughout codebase - consistency matters |
| JSON | YAML | TOML is better for human-editable config - existing choice |

**Installation:**
```bash
# No new dependencies needed - all libraries already in package.json
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── config/
│   ├── schema.ts          # Extend Config type with defaults.role/playbook
│   ├── writer.ts          # Extend generateConfigToml() for new sections
│   ├── loader.ts          # Extend loadConfig() to merge project-level files
│   └── defaults.ts        # New: default values for wizard defaults
├── wizard/
│   ├── types.ts           # Already has RoleWizardContext, PlaybookWizardContext
│   ├── role-wizard.ts     # Modify to accept pre-populated defaults
│   └── playbook-wizard.ts # Modify to accept pre-populated defaults
└── cli/
    └── commands/
        ├── new.ts         # Add post-generation save prompt, --quick logic
        └── config.ts      # Add `config defaults [role|playbook]` subcommand
```

### Pattern 1: TOML Schema Extension

**What:** Nested sections for role and playbook wizard defaults
**When to use:** Storing structured wizard preferences in TOML config
**Example:**
```toml
# Source: Existing pattern in src/config/writer.ts + TOML spec
[defaults]
model = "sonnet"
complex = false
defaults_version = 1  # Schema version for migration

[defaults.role]
structure = ["tasks", "handlers", "templates"]
platforms = ["Ubuntu", "RHEL"]
handlers = ["restart", "reload"]

[defaults.playbook]
hosts = ["all"]
become = true
include_handlers = true
```

**Implementation note:** Arrays use native TOML syntax `["item1", "item2"]`, booleans use `true`/`false`, strings remain quoted.

### Pattern 2: Config Hierarchy Resolution

**What:** Project-level `.ansible-craft.toml` overrides global `~/.config/ansible-craft/config.toml`
**When to use:** Per-project customization of wizard defaults
**Example:**
```typescript
// Source: Common pattern from dbt, ESLint (see web search results)
async function loadConfigWithOverrides(): Promise<Config> {
  let config = await loadConfig(); // Global from ~/.config/

  // Check for project-level override
  const projectConfigPath = path.join(process.cwd(), '.ansible-craft.toml');
  if (existsSync(projectConfigPath)) {
    const projectContent = readFileSync(projectConfigPath, 'utf-8');
    const projectConfig = parse(projectContent) as Partial<Config>;
    config = mergeConfig(config, projectConfig);
  }

  return config;
}
```

**Best practice:** Later configs override earlier ones only for conflicting keys. Non-conflicting settings from all configs are preserved (additive merge).

### Pattern 3: Post-Generation Save Prompt

**What:** Prompt to save wizard choices after successful generation
**When to use:** Only when generation succeeds AND choices differ from existing defaults
**Example:**
```typescript
// Source: Existing patterns in src/cli/commands/new.ts + @inquirer/prompts docs
import { confirm } from '@inquirer/prompts';

// After successful generation
if (shouldPromptToSave(wizardContext, existingDefaults)) {
  console.log(chalk.cyan('\nWizard choices to save as defaults:'));
  displayDefaultsPreview(wizardContext);

  const save = await confirm({
    message: 'Save these choices as defaults for future sessions?',
    default: true,
  });

  if (save) {
    await saveWizardDefaults('role', wizardContext);
    console.log(chalk.green('Defaults saved successfully'));
  }
}
```

### Pattern 4: Quick Mode with Defaults

**What:** `--quick` flag pre-populates wizard from stored defaults
**When to use:** Fast generation using previous choices
**Example:**
```typescript
// Source: Existing --quick logic in src/cli/commands/new.ts
const skipWizard = options.quick || options.interactive === false || jsonMode || !process.stdin.isTTY;

let clarifications: Record<string, string> | undefined;

if (!skipWizard) {
  // Run wizard (potentially pre-populated)
  const context = await runRoleWizard(loadedDefaults?.role);
  clarifications = formatRoleContextForPrompt(context);
} else if (options.quick && loadedDefaults?.role) {
  // Use stored defaults directly
  clarifications = formatRoleContextForPrompt(loadedDefaults.role);
} else if (options.quick) {
  // Fallback: use hard-coded safe defaults
  clarifications = getQuickModeDefaults('role');
}
```

### Anti-Patterns to Avoid

- **Storing raw wizard context**: Transform to TOML-friendly format (arrays of strings, not complex objects)
- **Breaking changes without migration**: Always include `defaults_version` field for schema evolution
- **Overwriting entire config**: Use `mergeConfig()` to preserve non-defaults sections
- **Prompting on failure**: Only prompt to save when generation succeeds

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOML serialization | Custom TOML stringifier | `smol-toml`'s `stringify()` | Handles edge cases: special chars, floats, dates, escaping |
| Config file merging | Object spread operator | Existing `mergeConfig()` in loader.ts | Deep merge of nested sections, type-safe |
| Diff detection | Manual field-by-field comparison | `JSON.stringify()` comparison or lodash `isEqual()` | Reliable equality checking for complex objects |
| Path resolution | String concatenation | `path.join(process.cwd(), '.ansible-craft.toml')` | Cross-platform path handling |

**Key insight:** The existing config infrastructure (loader, writer, schema, mergeConfig) is production-ready. Extend it rather than building parallel systems.

## Common Pitfalls

### Pitfall 1: TOML Array vs Inline Table Confusion

**What goes wrong:** Mixing TOML syntax `["item"]` with `{key = "value"}` for wizard context arrays
**Why it happens:** Wizard context has both arrays (`platforms: RolePlatform[]`) and objects (`custom: Record<string, string>`)
**How to avoid:**
- Arrays of strings: Use native TOML arrays `platforms = ["Ubuntu", "RHEL"]`
- Objects: Use nested sections `[defaults.role.custom]` with key-value pairs
**Warning signs:** Parse errors when reading config, `smol-toml` rejecting complex objects

### Pitfall 2: Forgetting Project-Level Override

**What goes wrong:** Always loading from `~/.config/ansible-craft/config.toml`, ignoring project `.ansible-craft.toml`
**Why it happens:** Existing `loadConfig()` doesn't check `process.cwd()`
**How to avoid:** Create `loadConfigWithProjectOverride()` that checks both locations
**Warning signs:** Users report "my project config isn't working", defaults don't match expectations

### Pitfall 3: Schema Version Migration Neglect

**What goes wrong:** Adding new wizard fields breaks existing saved defaults
**Why it happens:** Not planning for schema evolution from the start
**How to avoid:**
- Always include `defaults_version = 1` in initial implementation
- Check version on load, skip unknown fields, prompt for new required fields
- Log warnings when loading older schema versions
**Warning signs:** Crashes when loading old config files, `zod` validation failures

### Pitfall 4: Prompting Every Time

**What goes wrong:** Asking "Save as defaults?" even when user chose same values as existing defaults
**Why it happens:** Not comparing wizard context to loaded defaults before prompting
**How to avoid:** Implement `hasChangedFromDefaults()` comparison function
**Warning signs:** User frustration, "why does it keep asking me to save the same thing?"

## Code Examples

Verified patterns from official sources and existing codebase:

### TOML Stringify for Wizard Defaults

```typescript
// Source: smol-toml GitHub docs + existing src/config/writer.ts pattern
import { stringify } from 'smol-toml';
import type { RoleWizardContext } from '../wizard/types.js';

function serializeRoleDefaults(context: RoleWizardContext): string {
  const tomlData = {
    defaults: {
      defaults_version: 1,
      role: {
        structure: context.structure,
        platforms: context.platforms,
        handlers: context.handlers,
        // Spread custom fields directly
        ...context.custom,
      },
    },
  };

  return stringify(tomlData);
}
```

### Loading Defaults with Fallback

```typescript
// Source: Existing loader.ts + CONTEXT decisions for project-level override
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';

async function loadWizardDefaults(
  type: 'role' | 'playbook'
): Promise<RoleWizardContext | PlaybookWizardContext | undefined> {
  const config = await loadConfig();

  // Check for project-level override
  const projectPath = join(process.cwd(), '.ansible-craft.toml');
  if (existsSync(projectPath)) {
    const content = readFileSync(projectPath, 'utf-8');
    const projectConfig = parse(content) as Partial<Config>;
    if (projectConfig.defaults?.[type]) {
      return projectConfig.defaults[type];
    }
  }

  // Fallback to global defaults
  return config.defaults?.[type];
}
```

### Post-Generation Save Flow

```typescript
// Source: Existing new.ts patterns + CONTEXT decisions for save timing
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';

async function promptToSaveDefaults(
  type: 'role' | 'playbook',
  context: RoleWizardContext | PlaybookWizardContext,
  existingDefaults?: RoleWizardContext | PlaybookWizardContext,
): Promise<void> {
  // Only prompt if values differ
  if (existingDefaults && JSON.stringify(context) === JSON.stringify(existingDefaults)) {
    return;
  }

  console.log(chalk.cyan('\nWizard choices:'));
  displayDefaultsPreview(context);

  const save = await confirm({
    message: 'Save these choices as defaults for future sessions?',
    default: true,
  });

  if (save) {
    const updates: Partial<Config> = {
      defaults: {
        ...config.defaults,
        [type]: context,
      },
    };
    await saveConfig(updates);
    console.log(chalk.green(`\n${type} defaults saved successfully`));
  }
}
```

### Config Defaults Subcommand

```typescript
// Source: Existing config.ts save command pattern
configCommand
  .command('defaults <type>')
  .description('Update wizard defaults (role or playbook)')
  .action(async (type: 'role' | 'playbook') => {
    if (type !== 'role' && type !== 'playbook') {
      console.error(chalk.red('Type must be either "role" or "playbook"'));
      process.exit(1);
    }

    // Run wizard to collect new defaults
    const context = type === 'role'
      ? await runRoleWizard()
      : await runPlaybookWizard();

    // Save without generation
    const updates: Partial<Config> = {
      defaults: {
        ...config.defaults,
        [type]: context,
      },
    };
    await saveConfig(updates);
    console.log(chalk.green(`\n${type} defaults updated successfully`));
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Global config only | Hierarchical config (global + project) | 2020s (dbt, ESLint) | Per-project customization |
| Manual TOML editing | Interactive wizards + save prompts | 2020s (Poetry 2.0) | Better UX |
| Hard-coded defaults | Persisted user preferences | Always standard | User efficiency |
| Schema-less config | Versioned schemas with migration | Database tools, modern CLIs | Future-proof evolution |

**Deprecated/outdated:**
- **Single config location**: Modern tools use hierarchy (project > user > system)
- **Unversioned schemas**: Schema version field is now standard practice
- **JSON for config**: TOML/TOML have largely replaced JSON for human-editable configs

## Open Questions

1. **Quick Mode Fallback Strategy**
   - What we know: `--quick` should use defaults if available
   - What's unclear: Exact behavior when no defaults exist (error vs interactive vs hard-coded)
   - Recommendation: Fall back to interactive wizard (graceful degradation), warn user to save defaults

2. **Partial Override UI**
   - What we know: Users should be able to selectively override fields
   - What's unclear: Interactive prompt flow for partial overrides
   - Recommendation: Show loaded defaults in wizard with option to change each field

3. **Migration on Schema Change**
   - What we know: Need to handle schema evolution
   - What's unclear: Automatic migration vs manual vs prompt user
   - Recommendation: Best-effort load (skip unknown fields), prompt for new required fields, log warnings

## Sources

### Primary (HIGH confidence)

- smol-toml GitHub documentation - https://github.com/squirrelchat/smol-toml
- TOML 1.0.0 specification - https://toml.io/en/v1.0.0
- Existing codebase patterns:
  - `src/config/writer.ts` - TOML generation with comments
  - `src/config/loader.ts` - Config loading and merging
  - `src/wizard/types.ts` - Wizard context types
  - `src/cli/commands/new.ts` - `--quick` flag logic
  - `src/cli/commands/config.ts` - Interactive config save pattern

### Secondary (MEDIUM confidence)

- @inquirer/prompts npm package - https://www.npmjs.com/package/@inquirer/prompts
- TOML arrays guide on Medium - https://medium.com/softaai-blogs/toml-arrays-made-simple-a-complete-guide-with-clear-examples-37be1769bbe7
- Config hierarchy patterns (dbt, ESLint, OpenCode) - https://docs.getdbt.com/reference/global-configs/about-global-configs
- Database schema versioning best practices - https://www.bytebase.com/blog/database-version-control-best-practice/

### Tertiary (LOW confidence)

- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions confirmed
- Architecture: HIGH - Patterns extracted from existing working code
- Pitfalls: MEDIUM - Inferred from TOML spec and config best practices

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable stack)
