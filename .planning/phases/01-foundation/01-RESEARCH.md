# Phase 1: Foundation - Research

**Researched:** 2026-01-18
**Domain:** TypeScript CLI skeleton with Bun runtime
**Confidence:** HIGH

## Summary

Phase 1 establishes the CLI foundation for ansible-craft: help system, version display, and exit code handling. The standard approach uses Commander.js v14 for argument parsing, combined with chalk/picocolors for terminal styling. Bun provides native TypeScript execution and simplifies the build toolchain.

Key research findings:
- Commander.js v14 has built-in help customization via `configureHelp()` and color styling via `styleTitle()` methods
- Exit code handling uses `configureOutput()` for stderr/stdout control and `exitOverride()` for custom error processing
- NO_COLOR and FORCE_COLOR environment variables are standard for terminal color respect
- Update checking should be async and non-blocking using established patterns from update-notifier

**Primary recommendation:** Use Commander.js v14 with custom help formatting, chalk for colors (respecting NO_COLOR), and boxen for error banners. Build with Bun targeting Node.js compatibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| commander | ^14.0.2 | CLI argument parsing, subcommands, help generation | 100K+ dependents, first-class TypeScript, zero dependencies |
| chalk | ^5.6.2 | Terminal string styling with ANSI colors | Standard for CLI coloring, supports NO_COLOR/FORCE_COLOR |
| boxen | ^8.x | Create bordered boxes in terminal | Standard for error banners, notices, version info |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| picocolors | ^1.1.x | Lightweight terminal colors | Alternative to chalk if bundle size critical (7KB vs 44KB) |
| update-notifier | ^7.3.1 | Check for npm updates | Version update notifications in CLI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| chalk | picocolors | Smaller (7KB vs 44KB), faster for single styles, but no truecolor support |
| chalk | ansis | Similar performance, supports chained syntax + truecolor |
| Commander.js | Oclif | More features but overkill for simple CLI |
| boxen | Manual ANSI | Less code but more maintenance, edge cases |

**Installation:**
```bash
bun add commander chalk boxen
bun add -D typescript bun-types @biomejs/biome
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── index.ts          # Entry point with shebang
│   ├── program.ts        # Commander setup and configuration
│   ├── help.ts           # Custom help formatting
│   ├── version.ts        # Version display logic
│   └── output.ts         # Console formatting utilities (colors, boxes)
├── errors/
│   └── cli-error.ts      # Custom error class with suggestions
└── types/
    └── cli.ts            # CLI-related TypeScript interfaces
```

### Pattern 1: Commander.js Program Setup
**What:** Configure Commander with custom output handling and help styling
**When to use:** Main CLI entry point initialization
**Example:**
```typescript
// Source: Commander.js official documentation
import { Command } from 'commander';
import { createCustomHelp } from './help.js';
import { handleError } from './output.js';

const program = new Command();

program
  .name('ansible-craft')
  .description('Generate production-ready Ansible roles from natural language')
  .version('0.1.0', '-V, --version', 'display version information')
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stderr.write(str),
    outputError: (str, write) => write(handleError(str)),
  })
  .configureHelp({
    sortSubcommands: true,
    sortOptions: true,
  })
  .showHelpAfterError('(run with --help for available options)');
```

### Pattern 2: Exit Code Handling
**What:** Consistent exit codes with proper error output to stderr
**When to use:** All command termination paths
**Example:**
```typescript
// Source: Node.js process documentation + Commander.js patterns
import { Command, CommanderError } from 'commander';

const program = new Command();

program.exitOverride((err: CommanderError) => {
  // Write error to stderr, not stdout
  if (err.code !== 'commander.helpDisplayed' && err.code !== 'commander.version') {
    process.stderr.write(`Error: ${err.message}\n`);
  }
  process.exit(err.exitCode);
});

// For success: process.exitCode = 0 (default, let process exit naturally)
// For error: process.exitCode = 1; then let process exit
// Avoid calling process.exit() directly when possible
```

### Pattern 3: Color Respect (NO_COLOR)
**What:** Respect NO_COLOR environment variable for accessibility
**When to use:** All terminal color operations
**Example:**
```typescript
// Source: chalk documentation, NO_COLOR standard
import chalk from 'chalk';

// Chalk automatically respects NO_COLOR and FORCE_COLOR
// But for custom color logic:
const useColors = !process.env.NO_COLOR && process.stdout.isTTY;

function colorize(text: string, color: 'red' | 'green' | 'yellow'): string {
  if (!useColors) return text;
  return chalk[color](text);
}
```

### Pattern 4: Error Banner Display
**What:** Display errors in bordered boxes for visibility
**When to use:** User-facing error messages
**Example:**
```typescript
// Source: boxen documentation
import boxen from 'boxen';
import chalk from 'chalk';

function displayError(message: string, suggestion?: string): void {
  const content = suggestion
    ? `${chalk.red(message)}\n\n${chalk.yellow('Suggestion:')} ${suggestion}`
    : chalk.red(message);

  const box = boxen(content, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red',
    title: 'Error',
    titleAlignment: 'center',
  });

  process.stderr.write(box + '\n');
}
```

### Anti-Patterns to Avoid
- **Calling process.exit() early:** Let async operations complete; use process.exitCode instead
- **Mixing stdout/stderr:** Errors and warnings to stderr, normal output to stdout
- **Hardcoding colors:** Always check NO_COLOR/FORCE_COLOR or use chalk which handles it
- **Blocking update checks:** Update notifier must be async and non-blocking

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CLI argument parsing | Custom argv parsing | Commander.js | Edge cases in option parsing, help generation, validation |
| Terminal colors | Manual ANSI codes | chalk | NO_COLOR support, color level detection, cross-platform |
| Bordered boxes | Manual box drawing | boxen | Unicode handling, terminal width, padding math |
| Version comparison | String comparison | semver | Pre-release versions, range matching, edge cases |
| Update checking | fetch to npm registry | update-notifier | Caching, async, respects user opt-out |

**Key insight:** Terminal handling has many edge cases (Unicode width, color support detection, terminal resize) that established libraries handle correctly.

## Common Pitfalls

### Pitfall 1: Stdout/Stderr Confusion
**What goes wrong:** Help and version go to stderr instead of stdout, or errors go to stdout
**Why it happens:** Default behavior varies by framework; developers don't test piping output
**How to avoid:** Use `configureOutput()` in Commander.js; test with `cmd --help > file.txt`
**Warning signs:** Users can't pipe help output to grep/less

### Pitfall 2: Exit Before Async Complete
**What goes wrong:** `process.exit()` called while async operations (like update check) still running
**Why it happens:** Exit called immediately after sync command completes
**How to avoid:** Use `process.exitCode = n` and let event loop drain, or await all promises
**Warning signs:** Incomplete file writes, truncated network requests

### Pitfall 3: Color in Non-TTY
**What goes wrong:** ANSI escape codes appear in redirected output or CI logs
**Why it happens:** Not checking `process.stdout.isTTY` or not respecting NO_COLOR
**How to avoid:** Use chalk (handles automatically) or check TTY manually
**Warning signs:** Users report garbled output in scripts

### Pitfall 4: Help Not Showing on No Arguments
**What goes wrong:** User runs `ansible-craft` with no args and gets cryptic error instead of help
**Why it happens:** Commander.js default is to do nothing with no args
**How to avoid:** Add check for `process.argv.length <= 2` and call `program.help()`
**Warning signs:** User confusion reported in issues

### Pitfall 5: Version Without Runtime Info
**What goes wrong:** Bug reports can't be reproduced because version alone isn't enough
**Why it happens:** Only showing package version, not runtime environment
**How to avoid:** Include Bun/Node version, OS, architecture in --version output
**Warning signs:** "Works on my machine" bug reports

## Code Examples

Verified patterns from official sources:

### Entry Point with Shebang
```typescript
#!/usr/bin/env node
// Source: npm package publishing best practices
// Use node shebang for wide compatibility; Bun users still get Bun speed

import { program } from './program.js';

try {
  await program.parseAsync(process.argv);
} catch (err) {
  process.exitCode = 1;
}
```

### Custom Help Formatting (gh-style)
```typescript
// Source: Commander.js configureHelp documentation
import { Command, Help } from 'commander';
import chalk from 'chalk';

class CustomHelp extends Help {
  formatHelp(cmd: Command, helper: Help): string {
    const title = chalk.bold.cyan(cmd.name());
    const description = cmd.description();

    // Group commands by category
    const sections = [
      chalk.bold('USAGE'),
      `  ${cmd.name()} <command> [options]`,
      '',
      chalk.bold('COMMANDS'),
      ...this.visibleCommands(cmd).map(c =>
        `  ${chalk.green(c.name().padEnd(15))} ${c.description()}`
      ),
      '',
      chalk.bold('OPTIONS'),
      ...this.visibleOptions(cmd).map(o =>
        `  ${chalk.yellow(o.flags.padEnd(20))} ${o.description}`
      ),
      '',
      chalk.bold('EXAMPLES'),
      `  ${chalk.dim('$')} ansible-craft new role nginx`,
      `  ${chalk.dim('$')} ansible-craft explain roles/webserver/`,
      '',
    ];

    return sections.join('\n');
  }
}

program.configureHelp({ formatHelp: (cmd, helper) => new CustomHelp().formatHelp(cmd, helper) });
```

### Version Display with Environment
```typescript
// Source: Bun documentation, Node.js process documentation
import { version } from '../package.json';
import boxen from 'boxen';
import chalk from 'chalk';

function displayVersion(): void {
  const runtime = typeof Bun !== 'undefined'
    ? `bun ${Bun.version}`
    : `node ${process.version}`;

  const info = [
    `${chalk.bold('ansible-craft')} version ${chalk.green(version)}`,
    `Runtime: ${runtime}`,
    `OS: ${process.platform}-${process.arch}`,
  ].join('\n');

  console.log(boxen(info, { padding: 1, borderStyle: 'round' }));
}
```

### Error Class with Suggestions
```typescript
// Source: Best practices for CLI error handling
export class CLIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string,
    public readonly exitCode: number = 1,
  ) {
    super(message);
    this.name = 'CLIError';
  }

  display(): void {
    const content = this.suggestion
      ? `${this.message}\n\n${chalk.yellow('Try:')} ${this.suggestion}`
      : this.message;

    process.stderr.write(boxen(chalk.red(content), {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'red',
      title: 'Error',
    }) + '\n');
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| colors.js | chalk 5 (ESM) | 2022 | ESM-only, cleaner API |
| inquirer | @inquirer/prompts | 2023 | Smaller bundle, modern API |
| yargs | Commander.js 14 | Ongoing | Simpler for basic CLIs |
| console.log colors | NO_COLOR standard | 2019 | Accessibility requirement |

**Deprecated/outdated:**
- colors.js: Security incident, abandoned
- Commander.js <14: Missing Node 20 features, TypeScript improvements

## Open Questions

Things that couldn't be fully resolved:

1. **Update notifier caching behavior**
   - What we know: update-notifier caches in ~/.config/configstore/
   - What's unclear: Exact behavior with Bun runtime vs Node
   - Recommendation: Test with both runtimes, document any differences

2. **Boxen terminal width handling**
   - What we know: boxen auto-sizes to content
   - What's unclear: Behavior when terminal narrower than content
   - Recommendation: Test with very narrow terminals, consider maxWidth option

## Sources

### Primary (HIGH confidence)
- [Commander.js GitHub](https://github.com/tj/commander.js) - Program setup, help customization, error handling
- [Commander.js npm](https://www.npmjs.com/package/commander) - Version 14 features, configureOutput, configureHelp
- [chalk GitHub](https://github.com/chalk/chalk) - NO_COLOR support, FORCE_COLOR levels
- [Node.js process documentation](https://nodejs.org/api/process.html) - Exit codes, stdout/stderr

### Secondary (MEDIUM confidence)
- [boxen GitHub](https://github.com/sindresorhus/boxen) - Terminal box creation patterns
- [update-notifier npm](https://www.npmjs.com/package/update-notifier) - Version checking patterns
- [picocolors vs chalk comparison](https://dev.to/webdiscus/comparison-of-nodejs-libraries-to-colorize-text-in-terminal-4j3a) - Performance benchmarks
- [GitHub CLI](https://cli.github.com/) - Help output style inspiration

### Tertiary (LOW confidence)
- [Bun shell documentation](https://bun.com/reference/bun/$) - Exit code handling in Bun

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Commander.js, chalk, boxen are established standards with official documentation
- Architecture: HIGH - Patterns verified from Commander.js docs and Node.js best practices
- Pitfalls: MEDIUM - Based on common CLI development issues, some Bun-specific behavior unverified

**Research date:** 2026-01-18
**Valid until:** 2026-02-18 (30 days - stable technologies)
