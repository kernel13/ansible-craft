# Phase 10: Role Wizard - Research

**Researched:** 2026-01-22
**Domain:** Interactive CLI wizard using @inquirer/prompts
**Confidence:** HIGH

## Summary

Research focused on implementing an interactive 4-step role generation wizard using the existing @inquirer/prompts dependency. The wizard will collect user preferences for role structure (directories), target platforms, and handlers before passing this context to the AI generation phase.

**Key findings:**
- @inquirer/prompts 8.2.0 provides checkbox, select, confirm, and other prompt types with built-in keyboard navigation
- Progress indication best practices recommend "Step X of Y" format for sequential flows with < 10 steps
- Existing codebase already uses @inquirer/prompts (config wizard, preview confirmation) and has AbortSignal handling patterns
- Wizard context types from Phase 9 provide the type-safe foundation with formatters ready for AI prompt integration

**Primary recommendation:** Use checkbox for multi-select prompts (directories, platforms, handlers), implement linear 4-step flow with progress headers, handle Ctrl+C via try/catch on prompt calls (throws ExitPromptError), and pass formatted context to generateRolePlan() via clarifications parameter.

## Standard Stack

The established libraries/tools for interactive CLI wizards in this project:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @inquirer/prompts | 8.2.0 | Interactive CLI prompts | Already in use for config wizard and confirmations, comprehensive prompt types, TypeScript support |
| chalk | 5.4.1 | Terminal styling | Project standard for colored output (green for success, cyan for prompts) |
| ora | 9.0.0 | Loading spinners | Used throughout for async operation feedback |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.5 | Runtime validation | Validate wizard responses before formatting (already used in Phase 9 types) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @inquirer/prompts | prompts (npm) | prompts is lighter but @inquirer is already a dependency and more feature-rich |
| Manual progress display | cli-progress | cli-progress adds complexity for simple "Step X of Y" headers |
| Custom signal handling | Built-in prompt cancellation | @inquirer/prompts handles Ctrl+C natively via ExitPromptError |

**Installation:**
No new packages needed - all dependencies already present in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── wizard/
│   ├── types.ts              # Already exists (Phase 9)
│   ├── role-wizard.ts        # New: 4-step wizard orchestration
│   ├── prompts.ts            # New: Individual prompt definitions
│   └── role-wizard.test.ts   # New: Wizard integration tests
```

### Pattern 1: Linear Step Flow with State Accumulation
**What:** Sequential prompts that build up a state object, allowing back navigation to revise answers.

**When to use:** Multi-step wizards where later steps don't depend on earlier choices (directories, platforms, handlers are independent).

**Example:**
```typescript
// Source: CLI wizard best practices + @inquirer/prompts patterns
export async function runRoleWizard(): Promise<RoleWizardContext> {
  const state: Partial<RoleWizardContext> = { custom: {} };

  // Step 1: Directories
  console.log(chalk.cyan('\n=== Step 1 of 4: Role Structure ===\n'));
  state.structure = await promptDirectories();

  // Step 2: Platforms
  console.log(chalk.cyan('\n=== Step 2 of 4: Target Platforms ===\n'));
  state.platforms = await promptPlatforms();

  // Step 3: Handlers
  console.log(chalk.cyan('\n=== Step 3 of 4: Service Handlers ===\n'));
  state.handlers = await promptHandlers();

  // Step 4: Summary (optional - user decision was no confirmation screen)

  return roleWizardSchema.parse(state); // Zod validation before return
}
```

### Pattern 2: Checkbox Prompt with Required Selections
**What:** Multi-select checkboxes where certain options are pre-checked and required.

**When to use:** Directory selection where `tasks` is mandatory but other directories are optional.

**Example:**
```typescript
// Source: @inquirer/checkbox official docs
import { checkbox } from '@inquirer/prompts';

async function promptDirectories(): Promise<RoleStructureDirectory[]> {
  return await checkbox({
    message: 'Select role directories to generate:',
    choices: [
      {
        name: 'tasks - main role tasks (required)',
        value: 'tasks',
        checked: true,
        disabled: true // Cannot be unchecked
      },
      { name: 'handlers - service restart/reload actions', value: 'handlers' },
      { name: 'templates - Jinja2 config templates', value: 'templates' },
      { name: 'files - static files to copy', value: 'files' },
      { name: 'vars - role variables', value: 'vars' },
      { name: 'defaults - default variable values', value: 'defaults' },
      { name: 'meta - role metadata and dependencies', value: 'meta' },
    ],
    pageSize: 10,
    loop: true,
    validate: (answer) => {
      return answer.includes('tasks') || 'tasks directory is required';
    },
  });
}
```

### Pattern 3: Mutually Exclusive Selections
**What:** Multi-select where choosing one option deselects others (Generic platform vs specific platforms).

**When to use:** Platform selection where Generic is incompatible with specific OS choices.

**Example:**
```typescript
// Source: @inquirer/checkbox validation + project requirements
async function promptPlatforms(): Promise<RolePlatform[]> {
  const platforms = await checkbox({
    message: 'Select target platforms (or Generic for platform-agnostic):',
    choices: [
      { name: 'Ubuntu', value: 'Ubuntu' },
      { name: 'Debian', value: 'Debian' },
      { name: 'RHEL/CentOS', value: 'RHEL' },
      { name: 'Windows', value: 'Windows' },
      new Separator(),
      { name: 'Generic - no platform-specific tasks', value: 'Generic' },
    ],
    validate: (answer) => {
      if (answer.length === 0) return 'Select at least one platform';

      // Generic is mutually exclusive with specific platforms
      if (answer.includes('Generic' as RolePlatform) && answer.length > 1) {
        return 'Generic cannot be combined with specific platforms';
      }

      return true;
    },
  });

  return platforms as RolePlatform[];
}
```

### Pattern 4: Graceful Ctrl+C Handling
**What:** Catch ExitPromptError from @inquirer/prompts to detect user cancellation and exit cleanly.

**When to use:** All wizard flows to prevent stack traces on Ctrl+C.

**Example:**
```typescript
// Source: @inquirer/prompts error handling docs
import { ExitPromptError } from '@inquirer/prompts';

try {
  const context = await runRoleWizard();
  // Proceed with generation
} catch (error) {
  if (error instanceof ExitPromptError) {
    console.log(chalk.yellow('\n\nWizard cancelled. Using defaults.'));
    process.exit(0);
  }
  throw error; // Re-throw unexpected errors
}
```

### Pattern 5: Progress Indication with Tab-Style Headers
**What:** Visual step headers showing current position in multi-step flow.

**When to use:** Every step in the wizard for user orientation.

**Example:**
```typescript
// Source: CLI UX best practices from clig.dev
function showStepHeader(current: number, total: number, title: string): void {
  const percentage = Math.round((current / total) * 100);
  const progress = `[${current}/${total}]`;

  console.log(chalk.cyan(`\n${'='.repeat(60)}`));
  console.log(chalk.cyan.bold(`${progress} ${title} (${percentage}% complete)`));
  console.log(chalk.cyan(`${'='.repeat(60)}\n`));
}

// Usage in wizard:
showStepHeader(1, 4, 'Role Structure');
state.structure = await promptDirectories();

showStepHeader(2, 4, 'Target Platforms');
state.platforms = await promptPlatforms();
```

### Anti-Patterns to Avoid
- **Blocking without progress indication:** Always show which step user is on (violates CLI UX principle of responding within 100ms)
- **Prompts without defaults:** Provide sensible defaults for all prompts to enable quick workflows
- **Silent failures:** Always explain why validation failed (e.g., "Generic cannot be combined with specific platforms")
- **Non-linear flows:** Don't allow jumping to Step 3 before completing Step 2 (enforces sequential completion)

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyboard navigation | Custom keypress handling | @inquirer/prompts checkbox/select | Arrow keys, space toggle, enter confirm all handled with accessibility features |
| Input validation | Regex checks in wizard code | Zod schemas from Phase 9 | Runtime validation already defined, type-safe, reusable |
| Progress bars | Manual terminal cursor manipulation | Simple "Step X of Y" headers + chalk | Progress bars add complexity; step counters are clearer for <10 steps |
| Signal handling | Manual process.on('SIGINT') | Try/catch ExitPromptError | @inquirer/prompts handles Ctrl+C natively, cleaner than global handlers |
| Prompt styling | ANSI escape codes | chalk + @inquirer/prompts theming | Chalk is project standard, prompt theming provides consistent UX |
| Multi-select with constraints | Custom checkbox with state management | @inquirer/prompts validate function | Validation runs on every selection, can prevent invalid states |

**Key insight:** @inquirer/prompts is a mature library (used by Angular CLI, Vue CLI, etc.) that handles edge cases like terminal resize, non-TTY environments, and accessibility that custom implementations often miss.

## Common Pitfalls

### Pitfall 1: Forgetting to Check stdin is Interactive
**What goes wrong:** Wizard prompts hang or fail when run in CI/CD or piped contexts.

**Why it happens:** @inquirer/prompts requires an interactive terminal (TTY) but doesn't automatically skip prompts in non-interactive environments.

**How to avoid:** Check `process.stdin.isTTY` before running wizard. If false, skip wizard and use defaults or error if `--plan` was explicitly requested.

**Warning signs:** Wizard hangs in GitHub Actions, Docker builds, or when output is piped.

```typescript
// Prevention pattern
export async function maybeRunWizard(): Promise<RoleWizardContext | undefined> {
  // Skip wizard if not in interactive terminal
  if (!process.stdin.isTTY) {
    return undefined; // Caller uses defaults
  }

  return await runRoleWizard();
}
```

### Pitfall 2: Not Validating Before Formatting
**What goes wrong:** Invalid wizard state reaches AI prompt, causing generation failures or incorrect output.

**Why it happens:** Skipping Zod validation and passing unvalidated user input directly to formatRoleContextForPrompt().

**How to avoid:** Always validate with roleWizardSchema.parse() before calling formatRoleContextForPrompt().

**Warning signs:** AI generates roles without required directories, or formatters throw unexpected errors.

```typescript
// Wrong: Skip validation
const clarifications = formatRoleContextForPrompt(wizardState);

// Right: Validate first
const validated = roleWizardSchema.parse(wizardState);
const clarifications = formatRoleContextForPrompt(validated);
```

### Pitfall 3: Mutually Exclusive Validation Only on Submit
**What goes wrong:** User selects Generic + Ubuntu, presses enter, sees error, has to redo selection causing frustration.

**Why it happens:** Validation runs once on submission instead of during selection.

**How to avoid:** Use @inquirer/prompts validate function which runs on every change (not just submit).

**Warning signs:** Users repeatedly getting validation errors after making selections.

```typescript
// Wrong: Validation only catches at end
const platforms = await checkbox({ choices: [...] });
if (platforms.includes('Generic') && platforms.length > 1) {
  throw new Error('Generic conflicts with specific platforms');
}

// Right: Real-time validation during selection
const platforms = await checkbox({
  choices: [...],
  validate: (answer) => {
    if (answer.includes('Generic') && answer.length > 1) {
      return 'Generic cannot be combined with specific platforms';
    }
    return true;
  }
});
```

### Pitfall 4: Not Handling Empty Selections Gracefully
**What goes wrong:** User unchecks all platforms, wizard crashes or proceeds with empty array causing AI generation to fail.

**Why it happens:** Missing validation for minimum selections on optional prompts.

**How to avoid:** Require at least one selection for critical prompts (platforms, handlers).

**Warning signs:** Validation errors deep in AI generation phase instead of at wizard time.

```typescript
validate: (answer) => {
  if (answer.length === 0) {
    return 'Select at least one platform';
  }
  return true;
}
```

### Pitfall 5: Inconsistent Progress Display
**What goes wrong:** Users lose orientation in multi-step wizard, don't know how many steps remain.

**Why it happens:** Progress indicators missing or inconsistent between steps.

**How to avoid:** Use consistent step header format at every step: "Step X of Y: Title"

**Warning signs:** User confusion about wizard length, abandonment mid-flow.

```typescript
// Consistent pattern for all steps
console.log(chalk.cyan('\n=== Step 1 of 4: Role Structure ===\n'));
console.log(chalk.cyan('\n=== Step 2 of 4: Target Platforms ===\n'));
console.log(chalk.cyan('\n=== Step 3 of 4: Service Handlers ===\n'));
console.log(chalk.cyan('\n=== Step 4 of 4: Review ===\n'));
```

## Code Examples

Verified patterns from official sources and project conventions:

### Complete Wizard Orchestration
```typescript
// Source: Project patterns + @inquirer/prompts best practices
import { checkbox, Separator } from '@inquirer/prompts';
import chalk from 'chalk';
import type { RoleWizardContext, RoleStructureDirectory, RolePlatform, RoleHandler } from './types.js';
import { roleWizardSchema } from './types.js';

/**
 * Run the interactive role wizard to collect user preferences.
 *
 * @returns Validated wizard context ready for AI generation
 * @throws ExitPromptError if user cancels with Ctrl+C
 */
export async function runRoleWizard(): Promise<RoleWizardContext> {
  console.log(chalk.cyan.bold('\n🎯 Role Generation Wizard\n'));
  console.log('Customize your role structure, platforms, and handlers.\n');
  console.log(chalk.dim('Use arrow keys to navigate, space to select, enter to confirm.'));
  console.log(chalk.dim('Press Ctrl+C at any time to cancel and use defaults.\n'));

  // Step 1: Role structure
  console.log(chalk.cyan('='.repeat(60)));
  console.log(chalk.cyan.bold('[1/4] Role Structure (25% complete)'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  const structure = await promptDirectories();

  // Step 2: Target platforms
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('[2/4] Target Platforms (50% complete)'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  const platforms = await promptPlatforms();

  // Step 3: Handlers
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('[3/4] Service Handlers (75% complete)'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  const handlers = await promptHandlers();

  // Step 4: Completion
  console.log(chalk.cyan('\n' + '='.repeat(60)));
  console.log(chalk.cyan.bold('[4/4] Configuration Complete (100%)'));
  console.log(chalk.cyan('='.repeat(60) + '\n'));

  console.log(chalk.green('✓ Wizard complete! Starting role generation...\n'));

  // Validate and return
  const context: RoleWizardContext = {
    structure,
    platforms,
    handlers,
    custom: {},
  };

  return roleWizardSchema.parse(context);
}

async function promptDirectories(): Promise<RoleStructureDirectory[]> {
  return await checkbox({
    message: 'Select role directories to generate:',
    choices: [
      {
        name: 'tasks - main role tasks (required)',
        value: 'tasks',
        checked: true,
        disabled: true,
      },
      { name: 'handlers - service restart/reload actions', value: 'handlers' },
      { name: 'templates - Jinja2 config templates', value: 'templates' },
      { name: 'files - static files to copy', value: 'files' },
      { name: 'vars - role variables', value: 'vars' },
      { name: 'defaults - default variable values', value: 'defaults' },
      { name: 'meta - role metadata and dependencies', value: 'meta', checked: true },
    ],
    pageSize: 10,
    loop: true,
    validate: (answer) => {
      return answer.includes('tasks') || 'tasks directory is required';
    },
  }) as Promise<RoleStructureDirectory[]>;
}

async function promptPlatforms(): Promise<RolePlatform[]> {
  return await checkbox({
    message: 'Select target platforms (or Generic for platform-agnostic):',
    choices: [
      { name: 'Ubuntu', value: 'Ubuntu' },
      { name: 'Debian', value: 'Debian' },
      { name: 'RHEL/CentOS', value: 'RHEL' },
      { name: 'Windows', value: 'Windows' },
      new Separator(),
      { name: 'Generic - no platform-specific tasks', value: 'Generic' },
    ],
    pageSize: 8,
    loop: true,
    validate: (answer) => {
      if (answer.length === 0) {
        return 'Select at least one platform';
      }

      if (answer.includes('Generic' as RolePlatform) && answer.length > 1) {
        return 'Generic cannot be combined with specific platforms';
      }

      return true;
    },
  }) as Promise<RolePlatform[]>;
}

async function promptHandlers(): Promise<RoleHandler[]> {
  return await checkbox({
    message: 'Select handlers needed for service management:',
    choices: [
      { name: 'restart - restart service', value: 'restart' },
      { name: 'reload - reload service configuration', value: 'reload' },
      { name: 'enable - enable service at boot', value: 'enable' },
      { name: 'custom - custom handler actions', value: 'custom' },
    ],
    pageSize: 6,
    loop: true,
  }) as Promise<RoleHandler[]>;
}
```

### Integration with Command Handler
```typescript
// Source: Existing src/cli/commands/new.ts patterns
import { ExitPromptError } from '@inquirer/prompts';
import { runRoleWizard } from '../../wizard/role-wizard.js';
import { formatRoleContextForPrompt } from '../../wizard/types.js';

// In the --plan flag handler:
if (options.plan) {
  try {
    // Check if interactive terminal
    if (!process.stdin.isTTY) {
      console.error(chalk.red('Error: --plan requires an interactive terminal'));
      console.log('Run without --plan to use default settings.');
      process.exit(1);
    }

    // Run wizard
    const wizardContext = await runRoleWizard();

    // Convert to clarifications for AI
    const clarifications = formatRoleContextForPrompt(wizardContext);

    // Pass to existing generation flow
    const plan = await generateRolePlan(client, description, clarifications, {
      quiet: true,
    });

    // Continue with normal plan review/generation...

  } catch (error) {
    if (error instanceof ExitPromptError) {
      console.log(chalk.yellow('\n\nWizard cancelled.'));
      console.log('Using default role settings...\n');

      // Proceed without clarifications (use AI defaults)
      const plan = await generateRolePlan(client, description, undefined, {
        quiet: true,
      });
    } else {
      throw error;
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic inquirer package | Modular @inquirer/* packages | 2023 (v9 rewrite) | Smaller bundle size, tree-shakeable, ESM-first |
| Callbacks for prompts | Async/await API | 2023 (v9 rewrite) | Cleaner code, easier error handling |
| Manual theme objects | Theme functions + icon customization | 2024 (v8+) | More flexible styling, per-prompt theming |
| Separate validation step | Real-time validate function | Always supported | Immediate feedback vs delayed errors |

**Deprecated/outdated:**
- `inquirer` (monolithic package): Use `@inquirer/prompts` instead (project already uses modern package)
- Callback-style `.then()` chains: Use async/await for cleaner error handling
- `choices` as simple strings: Use objects with `name`, `value`, `description` for better UX

## Open Questions

Things that couldn't be fully resolved:

1. **Back Button Navigation**
   - What we know: Context document mentions "Back option available at each step"
   - What's unclear: @inquirer/prompts doesn't have built-in back navigation; would require custom implementation
   - Recommendation: Defer back navigation to future enhancement. Focus on linear flow for MVP. If needed, could implement by re-running previous prompts with previous answers as defaults.

2. **Extended Platform List**
   - What we know: Context document lists Ubuntu, Debian, RHEL/CentOS, Amazon Linux, Alpine, Arch, macOS, Windows
   - What's unclear: Phase 9 types.ts only defines Ubuntu, RHEL, Debian, Windows, Generic
   - Recommendation: Stick with Phase 9 types (locked decisions). Extended platforms can be added later by updating the enum and wizard choices together.

3. **Handler Prompt Wording**
   - What we know: Context document deferred this to "Claude's Discretion"
   - What's unclear: Exact phrasing for handler options beyond basic "restart", "reload", "enable", "custom"
   - Recommendation: Use Ansible handler best practices: "restart - restart service", "reload - reload service configuration", "enable - enable service at boot", "custom - custom handler actions"

## Sources

### Primary (HIGH confidence)
- [@inquirer/prompts npm documentation](https://www.npmjs.com/package/@inquirer/prompts) - Package overview and API
- [@inquirer/checkbox GitHub documentation](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/checkbox) - Checkbox prompt API, validation, theming
- [Inquirer.js main repository README](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md) - All prompt types, context options, error handling
- [CLI Guidelines (clig.dev)](https://clig.dev/) - Interactive prompt best practices, progress indication, error handling
- Existing project code patterns:
  - src/config/wizard.ts - Setup wizard implementation
  - src/cli/preview.ts - Confirmation prompts
  - src/ai/retry.ts - AbortSignal handling patterns
  - src/wizard/types.ts - Type definitions and formatters (Phase 9)

### Secondary (MEDIUM confidence)
- [Evil Martians CLI UX best practices](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays) - Progress display patterns
- [Nielsen Norman Group - Wizards](https://www.nngroup.com/articles/wizards/) - Multi-step wizard UX principles
- [Ansible Roles documentation](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html) - Role directory structure

### Tertiary (LOW confidence)
- WebSearch results on signal handling and CLI progress bars - General patterns but not specific to @inquirer/prompts
- Bootstrap wizard comparisons - Web-focused, not applicable to CLI

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - @inquirer/prompts is already a dependency, version verified, patterns exist in codebase
- Architecture: HIGH - Patterns verified in official docs and existing project code
- Pitfalls: HIGH - Based on common @inquirer/prompts issues and CLI UX research
- Integration: HIGH - generateRolePlan() clarifications parameter exists (verified in code), formatters ready (Phase 9)

**Research date:** 2026-01-22
**Valid until:** ~60 days (stable library, patterns unlikely to change rapidly)

**Cross-phase dependencies verified:**
- Phase 9 (wizard types): ✓ Complete - types, schemas, formatters all ready
- generateRolePlan() API: ✓ Verified - accepts clarifications parameter as designed
- CLI command structure: ✓ Verified - new.ts command already handles --plan flag parsing
