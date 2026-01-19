# Phase 6: Quality Assurance - Research

**Researched:** 2026-01-19
**Domain:** Ansible-lint integration, CLI streaming UX, dry-run preview
**Confidence:** HIGH

## Summary

Phase 6 adds quality gates and UX improvements to the existing generation workflow. The research covers four main areas: (1) ansible-lint integration for code validation, (2) enhanced progress display with phase names and elapsed time, (3) dry-run preview with YAML syntax highlighting, and (4) auto-fix capabilities for lint violations.

The project already has strong foundations to build on: ora spinners for progress indication, chalk for terminal styling, existing YAML and FQCN validation, and a clear generation flow (plan -> generate -> validate -> write). The main additions are subprocess spawning for ansible-lint, syntax highlighting for previews, and enhanced progress feedback.

**Primary recommendation:** Use Bun.spawn for ansible-lint subprocess calls with SARIF output format for machine-readable results. Add cli-highlight for YAML syntax highlighting in dry-run mode. Implement progressive logging with ora's stopAndPersist() method to show phase completion history.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ansible-lint | latest | Ansible code validation | Official Ansible tooling, comprehensive rule set |
| cli-highlight | ^2.1.11 | Terminal syntax highlighting | 3M+ weekly downloads, TypeScript support, highlight.js based |
| ora | ^9.0.0 | Spinner/progress display | Already in project, well-maintained |
| chalk | ^5.4.1 | Terminal styling | Already in project |
| @inquirer/prompts | ^8.2.0 | User confirmation prompts | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bun.spawn | built-in | Subprocess execution | Calling ansible-lint CLI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| cli-highlight | emphasize | emphasize is from same highlight.js ecosystem, slightly different API |
| ansible-lint CLI | ansible-lint Python API | CLI is simpler, no Python dependency management |

**Installation:**
```bash
bun add cli-highlight
# ansible-lint is external Python tool, installed via pip
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  generation/
    validation/
      ansible-lint.ts     # NEW: ansible-lint integration
      index.ts            # Updated: export ansible-lint functions
  cli/
    output.ts             # ENHANCED: progress display utilities
    preview.ts            # NEW: dry-run preview with syntax highlighting
```

### Pattern 1: Subprocess Validation with SARIF Output
**What:** Call ansible-lint as subprocess, parse SARIF JSON output
**When to use:** Validating generated files before/after writing
**Example:**
```typescript
// Source: Bun docs + ansible-lint docs
interface AnsibleLintResult {
  violations: LintViolation[];
  exitCode: number;
}

async function runAnsibleLint(targetPath: string): Promise<AnsibleLintResult> {
  const proc = Bun.spawn([
    'ansible-lint',
    '--format', 'sarif',
    '--nocolor',
    targetPath
  ], {
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  await proc.exited;

  // Parse SARIF JSON from stdout
  const sarif = JSON.parse(stdout);
  const violations = parseSarifResults(sarif);

  return {
    violations,
    exitCode: proc.exitCode ?? 1,
  };
}
```

### Pattern 2: Progressive Log with Phase Completion
**What:** Show each phase as a completed line, current phase as spinner
**When to use:** Multi-phase generation workflow
**Example:**
```typescript
// Source: ora docs
import ora from 'ora';
import chalk from 'chalk';

interface PhaseTracker {
  start(phaseName: string): void;
  succeed(message?: string): void;
  fail(message?: string): void;
}

function createPhaseTracker(quiet: boolean): PhaseTracker {
  let startTime = Date.now();
  let spinner: ReturnType<typeof ora> | null = null;

  return {
    start(phaseName: string) {
      startTime = Date.now();
      if (!quiet) {
        spinner = ora({
          text: phaseName,
          color: 'cyan',
          spinner: 'dots',
          stream: process.stderr,
        }).start();
      }
    },
    succeed(message?: string) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const text = message ?? spinner?.text ?? '';
      spinner?.stopAndPersist({
        symbol: chalk.green('✓'),
        text: `${text} ${chalk.dim(`(${elapsed}s)`)}`,
      });
    },
    fail(message?: string) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      spinner?.stopAndPersist({
        symbol: chalk.red('✗'),
        text: `${message ?? spinner?.text} ${chalk.dim(`(${elapsed}s)`)}`,
      });
    },
  };
}
```

### Pattern 3: Syntax-Highlighted Preview
**What:** Display YAML content with terminal syntax highlighting
**When to use:** Dry-run mode showing file contents
**Example:**
```typescript
// Source: cli-highlight docs
import { highlight } from 'cli-highlight';
import chalk from 'chalk';

function displayFilePreview(path: string, content: string): void {
  console.log(chalk.cyan(`\n=== ${path} ===\n`));
  console.log(highlight(content, {
    language: 'yaml',
    ignoreIllegals: true,
  }));
}
```

### Anti-Patterns to Avoid
- **Parsing ansible-lint text output:** Use SARIF JSON format instead - it's structured and won't break with version updates
- **Running ansible-lint on in-memory content:** ansible-lint needs files on disk - write to temp directory first
- **Single spinner for entire generation:** Use progressive log with stopAndPersist() to show history
- **Blocking on ansible-lint availability check:** Detect lazily when first needed, provide clear install instructions

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML syntax highlighting | ANSI escape code generation | cli-highlight | 190+ language support, themes, well-tested |
| Ansible rule validation | Custom rule checking | ansible-lint | Official tool, comprehensive rules, auto-fix |
| SARIF parsing | Custom JSON traversal | Standard SARIF schema | Well-defined spec, consistent across tools |
| Spinner management | Raw terminal control codes | ora | Handles clearing, persistence, multiple outputs |

**Key insight:** ansible-lint is the authoritative tool for Ansible code quality. Building custom validation beyond basic YAML/FQCN checks would duplicate effort and miss edge cases.

## Common Pitfalls

### Pitfall 1: ansible-lint Not Installed
**What goes wrong:** Subprocess spawn fails with ENOENT or "command not found"
**Why it happens:** ansible-lint is a Python tool, not bundled with ansible-craft
**How to avoid:** Check for ansible-lint availability before attempting validation, provide helpful installation instructions
**Warning signs:** Process exit code non-zero without SARIF output

### Pitfall 2: ansible-lint Requires Files on Disk
**What goes wrong:** Cannot validate in-memory generated content
**Why it happens:** ansible-lint expects filesystem paths, not stdin
**How to avoid:** For pre-write validation, use temp directory; for post-write validation, use actual paths
**Warning signs:** Attempting to pipe content to ansible-lint

### Pitfall 3: SARIF Output Differences
**What goes wrong:** Parsing errors on different ansible-lint versions
**Why it happens:** SARIF schema may have minor variations
**How to avoid:** Use defensive parsing, handle missing optional fields gracefully
**Warning signs:** JSON parse errors or missing properties

### Pitfall 4: Spinner vs Console.log Mixing
**What goes wrong:** Output scrambled when mixing spinner updates with console.log
**Why it happens:** Spinner uses terminal control codes that conflict with normal output
**How to avoid:** Use spinner.stopAndPersist() before any console.log, or use spinner.text for updates
**Warning signs:** Garbled terminal output, lines overwriting each other

### Pitfall 5: Auto-fix Altering More Than Expected
**What goes wrong:** ansible-lint --fix makes unexpected changes to yaml formatting
**Why it happens:** The yaml rule auto-fixes run even when not explicitly requested
**How to avoid:** Use specific write_list to control which rules auto-fix, or fix programmatically
**Warning signs:** Unexpected formatting changes in generated files

## Code Examples

Verified patterns from official sources:

### SARIF Result Structure
```typescript
// Source: OASIS SARIF v2.1.0 spec
interface SarifLog {
  version: string;
  runs: SarifRun[];
}

interface SarifRun {
  tool: { driver: { name: string; rules?: SarifRule[] } };
  results: SarifResult[];
}

interface SarifResult {
  ruleId: string;
  level: 'error' | 'warning' | 'note';
  message: { text: string };
  locations?: Array<{
    physicalLocation?: {
      artifactLocation?: { uri: string };
      region?: { startLine: number; startColumn?: number };
    };
  }>;
}
```

### Check ansible-lint Availability
```typescript
// Source: Bun docs
async function isAnsibleLintAvailable(): Promise<boolean> {
  try {
    const proc = Bun.spawn(['ansible-lint', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
```

### Run ansible-lint with Auto-Fix
```typescript
// Source: ansible-lint docs
async function runAnsibleLintFix(
  targetPath: string,
  rules?: string[]
): Promise<void> {
  const args = ['ansible-lint', '--fix'];

  if (rules && rules.length > 0) {
    args.push(`--fix=${rules.join(',')}`);
  }

  args.push(targetPath);

  const proc = Bun.spawn(args, {
    stdout: 'inherit',
    stderr: 'inherit',
  });

  await proc.exited;
}
```

### Dry-Run Preview with Confirmation
```typescript
// Source: @inquirer/prompts docs
import { confirm } from '@inquirer/prompts';
import { highlight } from 'cli-highlight';

async function previewAndConfirm(files: GeneratedFile[]): Promise<boolean> {
  for (const file of files) {
    console.log(chalk.cyan(`\n=== ${file.path} ===\n`));
    console.log(highlight(file.content, { language: 'yaml' }));
  }

  return confirm({
    message: 'Write these files?',
    default: false,
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ansible-lint JSON (codeclimate) | SARIF format | ansible-lint 6.x | SARIF is more complete, has full spec |
| Manual FQCN fixing | ansible-lint --fix fqcn | ansible-lint 6.14+ | Automated FQCN corrections |
| Text-based lint output | Structured SARIF | 2023 | Machine-parseable results |

**Deprecated/outdated:**
- `--format json` historically meant Code Climate format, now points to SARIF
- Direct Code Climate format less recommended than SARIF

## Open Questions

Things that couldn't be fully resolved:

1. **Temp directory for pre-write validation**
   - What we know: ansible-lint needs files on disk
   - What's unclear: Best temp directory location (system temp vs project-relative)
   - Recommendation: Use system temp with unique subdirectory, clean up after

2. **ansible-lint version compatibility**
   - What we know: SARIF output exists in recent versions
   - What's unclear: Minimum required version for all features
   - Recommendation: Document minimum version (ansible-lint 6.0+), detect and warn

3. **Auto-fix interaction with generated content**
   - What we know: --fix can modify yaml formatting beyond requested rules
   - What's unclear: Exactly which rules are safe for auto-application
   - Recommendation: Be conservative, only auto-fix fqcn and explicit formatting rules

## Sources

### Primary (HIGH confidence)
- [Ansible Lint Documentation - Usage](https://docs.ansible.com/projects/lint/usage/) - CLI options, output formats
- [Ansible Lint Documentation - Autofix](https://docs.ansible.com/projects/lint/autofix/) - Auto-fix capabilities, rules
- [Bun Documentation - Spawn](https://bun.com/docs/runtime/child-process) - Subprocess API
- [ora GitHub](https://github.com/sindresorhus/ora) - Spinner API, stopAndPersist
- [cli-highlight GitHub](https://github.com/felixfbecker/cli-highlight) - Syntax highlighting API

### Secondary (MEDIUM confidence)
- [SARIF v2.1.0 Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html) - Output format schema
- [npm cli-highlight](https://www.npmjs.com/package/cli-highlight) - Package details, weekly downloads

### Tertiary (LOW confidence)
- GitHub issues on ansible-lint --fix behavior - Real-world edge cases

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using official tools (ansible-lint) and well-established npm packages (cli-highlight, ora)
- Architecture: HIGH - Patterns follow existing codebase conventions and official documentation
- Pitfalls: MEDIUM - Some based on documentation, some inferred from GitHub issues

**Research date:** 2026-01-19
**Valid until:** 30 days (ansible-lint may receive updates, core patterns stable)
