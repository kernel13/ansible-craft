# Phase 12: CLI Integration - Research

**Researched:** 2026-01-22
**Domain:** CLI flag handling, TTY detection, wizard orchestration, context passing
**Confidence:** HIGH

## Summary

Phase 12 integrates the wizard system into the CLI workflow with opt-out behavior (wizards run by default), bypass flags (--quick/--no-interactive), TTY detection for non-interactive environments, and transparent context passing via temporary files. The integration point is in `commands/new.ts` before plan generation, where wizard context flows into the existing `clarifications` parameter that's already wired through to AI prompts.

The standard approach uses Commander.js option handling for flags, Node.js `process.stdin.isTTY` for terminal detection, and native fs.promises with try-finally for temp file cleanup. The wizard is invisible to users - context passes silently to improve AI generation quality without showing intermediate files or configuration.

**Primary recommendation:** Add --quick flag (alias for existing --no-interactive), check `process.stdin.isTTY` lazily before running wizard, write wizard context to temp YAML file (ecosystem fit), pass to generation functions via clarifications, clean up temp file in try-finally block.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Commander.js | ^14.0.2 | CLI flag parsing | Already used throughout CLI, well-established Node.js standard |
| Node.js process | Built-in | TTY detection via process.stdin.isTTY | Native API, no dependencies, reliable cross-platform |
| fs.promises | Built-in | Temp file creation and cleanup | Native async filesystem API, no dependencies needed |
| yaml | ^2.8.2 | YAML serialization | Already in package.json, used for parsing Ansible files |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @inquirer/core | Latest | ExitPromptError detection | Already used in wizards for Ctrl+C handling |
| chalk | ^5.4.1 | Error message styling | Already used throughout CLI for terminal colors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| YAML temp file | JSON temp file | JSON is slightly faster to parse but YAML is ecosystem standard for Ansible tooling |
| process.stdin.isTTY | External library | TTY detection is simple built-in, no library needed |
| Custom temp dir | tmp npm package | Built-in os.tmpdir() + fs.mkdtemp is sufficient, no extra dependency |

**Installation:**
No new packages needed - all dependencies already in package.json

## Architecture Patterns

### Recommended Project Structure
```
src/cli/commands/
└── new.ts              # Integration point: add wizard orchestration before plan generation

src/wizard/
├── types.ts            # Add formatRoleContextForPrompt (already exists)
├── role-wizard.ts      # runRoleWizard() (already exists)
└── playbook-wizard.ts  # runPlaybookWizard() (already exists)
```

### Pattern 1: Opt-Out Flag Behavior
**What:** Wizard runs by default, --quick or --no-interactive bypasses it
**When to use:** Always - per 12-CONTEXT.md decision
**Example:**
```typescript
// Source: Commander.js negatable options pattern
// https://github.com/tj/commander.js/blob/master/examples/options-negatable.js

newCommand
  .command('role <description>')
  .option('--no-interactive', 'Skip clarifying questions')
  .option('-q, --quick', 'Skip wizard and use defaults (alias for --no-interactive)')
  .action(async (description, options) => {
    // options.interactive is false if either flag is passed
    const skipWizard = !options.interactive || options.quick;

    if (!skipWizard) {
      // Run wizard
    } else {
      // Skip wizard, no clarifications
    }
  });
```

### Pattern 2: Lazy TTY Detection
**What:** Check TTY status only when wizard is about to run, not at program startup
**When to use:** Always - defers expensive checks until needed
**Example:**
```typescript
// Source: Node.js TTY documentation
// https://nodejs.org/api/tty.html

function shouldRunWizard(skipWizardFlag: boolean): { run: boolean; reason?: string } {
  // User explicitly wants to skip
  if (skipWizardFlag) {
    return { run: false };
  }

  // Check TTY status only when wizard would run
  if (!process.stdin.isTTY) {
    // Non-TTY: silently skip wizard, no error message
    return { run: false };
  }

  return { run: true };
}

// Usage
const wizardDecision = shouldRunWizard(skipWizard);
if (wizardDecision.run) {
  context = await runRoleWizard();
}
```

### Pattern 3: Temp File with Try-Finally Cleanup
**What:** Create temp file in os.tmpdir(), write wizard context, clean up in finally block
**When to use:** Always - ensures cleanup even if generation fails
**Example:**
```typescript
// Source: Node.js fs.promises with secure temp pattern
// https://advancedweb.hu/secure-tempfiles-in-nodejs-without-dependencies/

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { stringify } from 'yaml';

async function withWizardContext<T>(
  context: RoleWizardContext | PlaybookWizardContext,
  operation: (clarifications: Record<string, string>) => Promise<T>
): Promise<T> {
  // Create temp file with unique name
  const tempFile = join(tmpdir(), `ansible-craft-wizard-${Date.now()}.yml`);

  try {
    // Convert context to clarifications format
    const clarifications = formatRoleContextForPrompt(context);

    // Write YAML to temp file (not needed for current implementation)
    // Just pass clarifications directly - temp file is for future extensibility
    await writeFile(tempFile, stringify(clarifications), 'utf-8');

    // Pass clarifications to generation function
    return await operation(clarifications);
  } finally {
    // Always clean up, even on error
    await rm(tempFile, { force: true });
  }
}

// Usage in commands/new.ts
let clarifications: Record<string, string> | undefined;
if (wizardDecision.run) {
  const context = await runRoleWizard();
  clarifications = formatRoleContextForPrompt(context);
}

const plan = await generateRolePlan(client, description, clarifications, options);
```

### Pattern 4: Silent Context Passing
**What:** Pass wizard context to AI without showing it in CLI output
**When to use:** Always - context is implementation detail, not user-facing
**Example:**
```typescript
// In commands/new.ts - NO console.log of context

let clarifications: Record<string, string> | undefined;

if (!skipWizard && process.stdin.isTTY) {
  const context = await runRoleWizard();
  clarifications = formatRoleContextForPrompt(context);
  // No output - wizard already showed its own prompts
  // Context silently flows into plan generation
}

// Generate plan with wizard context (if any)
const plan = await generateRolePlan(client, description, clarifications, options);
// User sees plan preview - improved by wizard context but context itself is hidden
```

### Pattern 5: ExitPromptError Handling at Integration Point
**What:** Catch ExitPromptError from wizard and exit gracefully with clean message
**When to use:** In commands/new.ts action handler, around wizard calls
**Example:**
```typescript
// Source: Inquirer.js error handling recommendations
// https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md

import { ExitPromptError } from '@inquirer/core';

try {
  // Wizard may throw ExitPromptError on Ctrl+C
  if (wizardDecision.run) {
    context = await runRoleWizard();
  }

  // Continue with generation...

} catch (error) {
  // Handle wizard cancellation gracefully
  if (error instanceof ExitPromptError) {
    console.log(chalk.yellow('\nWizard cancelled by user.'));
    return; // Clean exit, no error code
  }

  // Re-throw other errors for normal error handling
  throw error;
}
```

### Pattern 6: Flag Precedence Resolution
**What:** When conflicting flags are passed, apply precedence rules
**When to use:** When user passes multiple flags that could conflict
**Example:**
```typescript
// Per 12-CONTEXT.md: --plan is explicit user intent to run wizard
// If both --plan and --quick are passed, --plan wins (wizard runs)

function resolveWizardFlags(options: {
  plan?: boolean;
  quick?: boolean;
  interactive?: boolean;
}): boolean {
  // Explicit --plan overrides everything (future flag)
  if (options.plan) {
    return true; // Run wizard
  }

  // --quick or --no-interactive skips wizard
  if (options.quick || options.interactive === false) {
    return false; // Skip wizard
  }

  // Default: run wizard (opt-out behavior)
  return true;
}
```

### Anti-Patterns to Avoid
- **Don't check TTY at startup:** Defer to when wizard is about to run (lazy evaluation)
- **Don't show temp file to user:** Context passing is transparent implementation detail
- **Don't add --context flag:** No external context file support (per 12-CONTEXT.md)
- **Don't prompt in non-TTY:** Silently skip wizard, don't error unless --plan was explicit
- **Don't catch ExitPromptError in wizards:** Let it bubble up to CLI command handler

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TTY detection | Custom terminal detection logic | process.stdin.isTTY | Built-in, cross-platform, handles edge cases (pipes, redirects, SSH) |
| Flag parsing | Manual argv parsing | Commander.js .option() | Already integrated, handles negation, type conversion, validation |
| Temp file cleanup | Manual tracking and deletion | Try-finally with fs.promises.rm | Guaranteed cleanup even on errors, no resource leaks |
| YAML serialization | String concatenation | yaml.stringify() | Handles escaping, special characters, Ansible-compatible format |

**Key insight:** CLI integration is mostly plumbing - connecting existing pieces (wizards, flags, TTY detection, generation functions) rather than implementing new logic.

## Common Pitfalls

### Pitfall 1: Checking TTY Too Early
**What goes wrong:** Checking TTY at program startup wastes resources and makes testing harder
**Why it happens:** Natural to check all preconditions early
**How to avoid:** Lazy evaluation - check TTY only when wizard is about to run
**Warning signs:** TTY checks in program.ts or index.ts instead of command action handlers
**Example:**
```typescript
// BAD: Early TTY check
if (!process.stdin.isTTY) {
  console.log('Non-interactive environment detected');
}
await program.parseAsync();

// GOOD: Lazy TTY check
.action(async (description, options) => {
  if (!options.quick && process.stdin.isTTY) {
    // Run wizard only if needed and TTY available
  }
});
```

### Pitfall 2: Forgetting Temp File Cleanup
**What goes wrong:** Temp files accumulate in /tmp, eventually filling disk
**Why it happens:** Error paths skip cleanup, early returns miss finally block
**How to avoid:** Always use try-finally, never skip finally block even for early returns
**Warning signs:** Temp file creation without corresponding finally block
**Example:**
```typescript
// BAD: Missing cleanup on error
const tempFile = join(tmpdir(), `wizard-${Date.now()}.yml`);
await writeFile(tempFile, data);
await doGeneration();
await rm(tempFile); // Skipped if doGeneration throws!

// GOOD: Guaranteed cleanup
const tempFile = join(tmpdir(), `wizard-${Date.now()}.yml`);
try {
  await writeFile(tempFile, data);
  await doGeneration();
} finally {
  await rm(tempFile, { force: true }); // Always runs
}
```

### Pitfall 3: Flag Precedence Confusion
**What goes wrong:** Unexpected behavior when multiple flags are passed (e.g., --plan --quick)
**Why it happens:** No explicit precedence rules, last-flag-wins logic
**How to avoid:** Document and implement clear precedence: explicit intent (--plan) > skip flags (--quick) > defaults
**Warning signs:** Users report "flag doesn't work" when combined with other flags
**Example:**
```typescript
// BAD: Ambiguous precedence
const runWizard = options.plan || !options.quick;

// GOOD: Explicit precedence with comments
// Precedence: --plan (explicit) > --quick (skip) > default (run)
const runWizard = options.plan === true ? true :
                  options.quick === true ? false :
                  true; // default
```

### Pitfall 4: Non-TTY Error Message Spam
**What goes wrong:** Error messages when piping or in CI, even though wizard is optional
**Why it happens:** Treating non-TTY as error condition instead of silent skip
**How to avoid:** Non-TTY silently skips wizard with no output (unless --plan is explicit)
**Warning signs:** "Not a TTY" messages in CI logs, users report "errors" in scripts
**Example:**
```typescript
// BAD: Noisy non-TTY handling
if (!process.stdin.isTTY) {
  console.error('Error: Not a TTY, cannot run wizard');
  return;
}

// GOOD: Silent skip for non-TTY
if (!process.stdin.isTTY && !options.plan) {
  // Silently skip wizard, no output
  return { skipWizard: true };
}

// Only error if user explicitly requested wizard
if (!process.stdin.isTTY && options.plan) {
  throw new Error('--plan requires interactive terminal (TTY)');
}
```

### Pitfall 5: Context Visibility
**What goes wrong:** Showing temp file paths or wizard context to users
**Why it happens:** Natural to log operations for debugging
**How to avoid:** Keep context passing completely transparent - no console output
**Warning signs:** Users see temp file paths in output, ask "what's this file?"
**Example:**
```typescript
// BAD: Exposing implementation details
console.log(`Writing context to ${tempFile}`);
const clarifications = formatRoleContextForPrompt(context);
console.log('Context:', clarifications);

// GOOD: Silent operation
// No output - user just sees improved generation results
const clarifications = formatRoleContextForPrompt(context);
```

### Pitfall 6: ExitPromptError Not Caught
**What goes wrong:** Ugly stack traces when user presses Ctrl+C, looks like crash
**Why it happens:** Forgetting wizards throw ExitPromptError, not handling at integration point
**How to avoid:** Wrap wizard calls in try-catch, check for ExitPromptError, show friendly message
**Warning signs:** Stack traces on Ctrl+C, users think tool crashed
**Example:**
```typescript
// BAD: Unhandled ExitPromptError
const context = await runRoleWizard(); // May throw ExitPromptError

// GOOD: Graceful cancellation handling
try {
  const context = await runRoleWizard();
} catch (error) {
  if (error instanceof ExitPromptError) {
    console.log(chalk.yellow('\nWizard cancelled.'));
    return; // Clean exit
  }
  throw error; // Other errors propagate normally
}
```

## Code Examples

Verified patterns from official sources:

### Commander.js Flag Aliases
```typescript
// Source: Commander.js documentation
// https://github.com/tj/commander.js

newCommand
  .command('role <description>')
  .option('--no-interactive', 'Skip clarifying questions')
  .option('-q, --quick', 'Skip wizard and use defaults')
  .action(async (description, options) => {
    // Both flags set options.interactive to false
    // --quick is shorter, more discoverable
    // --no-interactive is explicit, descriptive
    const skipWizard = !options.interactive;
  });
```

### Node.js TTY Detection
```typescript
// Source: Node.js TTY module documentation
// https://nodejs.org/api/tty.html

// Check if stdin is connected to a terminal (can accept user input)
const isInteractive = process.stdin.isTTY;

// Check if stdout is connected to a terminal (human is viewing output)
const hasTerminal = process.stdout.isTTY;

// For wizard: check stdin (need interactive input capability)
if (process.stdin.isTTY) {
  // Safe to show prompts
  await runWizard();
}
```

### Temp File Pattern with Cleanup
```typescript
// Source: Modern Node.js fs.promises pattern
// https://advancedweb.hu/secure-tempfiles-in-nodejs-without-dependencies/

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function withTempFile<T>(
  content: string,
  operation: (filePath: string) => Promise<T>
): Promise<T> {
  const tempFile = join(tmpdir(), `ansible-craft-${Date.now()}.tmp`);

  try {
    await writeFile(tempFile, content, 'utf-8');
    return await operation(tempFile);
  } finally {
    await rm(tempFile, { force: true }); // force: true = no error if missing
  }
}
```

### YAML Context Serialization
```typescript
// Source: yaml npm package (already in dependencies)
// https://github.com/eemeli/yaml

import { stringify } from 'yaml';

const wizardContext: RoleWizardContext = {
  structure: ['tasks', 'handlers'],
  platforms: ['Ubuntu', 'RHEL'],
  handlers: ['restart'],
  custom: {}
};

const clarifications = formatRoleContextForPrompt(wizardContext);

// Convert to YAML for temp file (if needed)
const yamlContent = stringify(clarifications);
// Output:
// structure: tasks, handlers
// platforms: Ubuntu, RHEL
// handlers: restart
```

### Integration Point in commands/new.ts
```typescript
// Pseudocode showing integration structure

import { ExitPromptError } from '@inquirer/core';
import { runRoleWizard } from '../../wizard/role-wizard.js';
import { formatRoleContextForPrompt } from '../../wizard/types.js';

newCommand
  .command('role <description>')
  .option('-q, --quick', 'Skip wizard and use defaults')
  .option('--no-interactive', 'Skip clarifying questions')
  .action(async (description, options) => {
    try {
      // 1. Determine if wizard should run
      const skipWizard = options.quick || !options.interactive;
      let clarifications: Record<string, string> | undefined;

      // 2. Run wizard if conditions are met
      if (!skipWizard && process.stdin.isTTY) {
        const context = await runRoleWizard();
        clarifications = formatRoleContextForPrompt(context);
        // Context is now ready - no output, silently passed to generation
      }

      // 3. Generate plan with wizard context (if any)
      const plan = await generateRolePlan(client, description, clarifications, options);

      // 4. Continue with existing workflow...

    } catch (error) {
      // Handle wizard cancellation gracefully
      if (error instanceof ExitPromptError) {
        console.log(chalk.yellow('\nWizard cancelled.'));
        return;
      }

      // Other errors handled by existing error handlers
      throw error;
    }
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Opt-in wizards with --wizard flag | Opt-out wizards (run by default) | Modern CLI trend (2024+) | Better UX: users get wizard benefits automatically, power users can skip |
| Separate stdin/stdout TTY checks | Single process.stdin.isTTY check | Node.js best practice | Simpler: wizard only cares about input capability |
| JSON for config files | YAML for Ansible ecosystem | Ansible community standard | Ecosystem consistency: users expect YAML in Ansible tooling |
| tmp npm package | Native fs.promises + os.tmpdir() | Node.js 18+ native features | Zero dependencies: built-in APIs are sufficient |

**Deprecated/outdated:**
- **tmp package:** Native Node.js provides mkdtemp and tmpdir(), no need for external library
- **Early TTY checks:** Modern pattern is lazy evaluation - check when needed, not at startup
- **Verbose non-TTY errors:** Silent skipping is better UX than error messages for optional features

## Open Questions

Things that couldn't be fully resolved:

1. **Temp file actually needed?**
   - What we know: clarifications parameter already exists and works, formatters produce Record<string, string>
   - What's unclear: Whether temp file provides any benefit over direct passing
   - Recommendation: Skip temp file entirely - just pass clarifications directly. Simpler, no cleanup needed, same result. Temp file was over-engineering.

2. **--plan flag timing**
   - What we know: 12-CONTEXT.md mentions --plan flag for explicit wizard request
   - What's unclear: --plan flag doesn't exist in current codebase, may be future feature
   - Recommendation: Implement basic integration without --plan, add it later if needed. Current flags (--quick, --no-interactive) are sufficient.

3. **JSON mode interaction**
   - What we know: --json flag exists, sets quiet=true and force=true
   - What's unclear: Should --json automatically skip wizard, or require explicit --quick?
   - Recommendation: --json should imply --quick (skip wizard) for machine-readable output consistency. JSON mode users don't want prompts.

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub Repository](https://github.com/tj/commander.js) - Official documentation for negatable options and flag handling
- [Commander.js options-negatable.js example](https://github.com/tj/commander.js/blob/master/examples/options-negatable.js) - Negatable boolean option patterns
- [Node.js TTY Documentation](https://nodejs.org/api/tty.html) - Official process.stdin.isTTY documentation
- [Secure tempfiles in Node.js](https://advancedweb.hu/secure-tempfiles-in-nodejs-without-dependencies/) - Modern temp file patterns with try-finally
- [Inquirer.js README](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md) - ExitPromptError handling recommendations

### Secondary (MEDIUM confidence)
- [JSON vs YAML comparison 2026](https://dev.to/jsontoall_tools/json-vs-yaml-vs-toml-which-configuration-format-should-you-use-in-2026-1hlb) - Format selection guidance
- [YAML vs JSON Complete Guide](https://www.ilovedevtool.com/en-US/blog/yaml-vs-json-complete-guide) - Ecosystem considerations
- [Commander.js Definitive Guide](https://betterstack.com/community/guides/scaling-nodejs/commander-explained/) - Best practices and patterns
- [Node.js CLI Best Practices](https://github.com/lirantal/nodejs-cli-apps-best-practices) - Industry standards for CLI design

### Tertiary (LOW confidence)
- Web search results about flag precedence - No authoritative source found, applied common sense precedence rules (explicit > implicit > default)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, Node.js built-ins for TTY/fs
- Architecture: HIGH - Integration point clear (commands/new.ts), patterns verified from official docs
- Pitfalls: HIGH - Common CLI integration mistakes are well-documented in Node.js community

**Research date:** 2026-01-22
**Valid until:** 90 days (stable ecosystem - Commander.js, Node.js APIs change slowly)
