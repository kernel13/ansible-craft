# Stack Research: Plan Mode Wizard

**Project:** ansible-craft v1.1
**Feature:** Interactive wizard flow for context-gathering before generation
**Researched:** 2026-01-21
**Confidence:** HIGH

## Executive Summary

The existing stack already contains all core dependencies needed for the wizard feature. @inquirer/prompts v8.2.0 provides `input`, `select`, `checkbox`, `confirm`, and `password` - covering all required prompt types. No new production dependencies are recommended.

The only consideration is whether to add a step-tracking utility, but this can be built trivially with the existing `chalk` and `ora` libraries already in use.

---

## Use Existing (No Changes Needed)

### @inquirer/prompts v8.2.0
**Currently used for:** Plan confirmation, model selection, API key input
**Already available prompts:**
- `input` - Free-form text input (used in new.ts for feedback)
- `select` - Single choice from list (used in new.ts for accept/modify/reject)
- `confirm` - Yes/no questions (used in preview.ts, writer.ts)
- `password` - Masked input (used in wizard.ts for API key)
- `checkbox` - Multi-select choices (available but not yet used)
- `number` - Numeric input with validation
- `search` - Searchable list selection
- `editor` - Open user's editor for long input

**Rationale:** The project already imports from @inquirer/prompts. Version 8.2.0 includes all prompt types needed for wizard flow. Adding `checkbox` import enables multi-select (e.g., "select platforms to support").

### chalk v5.6.2
**Currently used for:** Colored output throughout CLI
**Wizard use:** Step progress display ("Step 1 of 5"), section headers, validation feedback

### ora v9.0.0
**Currently used for:** Spinner during AI generation phases
**Wizard use:** Optional loading states during answer validation or API checks

### boxen v8.0.1
**Currently used for:** Error display boxes
**Wizard use:** Wizard summary/confirmation display boxes

### smol-toml v1.6.0
**Currently used for:** Reading/writing config.toml
**Wizard use:** Saving wizard answers as defaults (already supported by config system)

---

## Recommended Additions: NONE

### Why No New Dependencies?

1. **Step Progress Indicators**
   Simple "Step 1 of 5" progress can be built with `chalk`:
   ```typescript
   const stepIndicator = (current: number, total: number) =>
     chalk.dim(`[${current}/${total}]`) + ' ';
   ```
   No library needed for this.

2. **Multi-select Prompts**
   `checkbox` is already available in @inquirer/prompts - just needs importing:
   ```typescript
   import { checkbox, confirm, input, select } from '@inquirer/prompts';
   ```

3. **Configuration Saving**
   The existing config system (smol-toml + Config schema) already supports saving defaults. The wizard just needs to extend the schema if new defaults are needed.

4. **Wizard State Management**
   A simple object passed through steps is sufficient:
   ```typescript
   interface WizardState {
     description?: string;
     platforms?: string[];
     complexity?: 'simple' | 'moderate' | 'complex';
     // ... etc
   }
   ```

---

## Not Recommended

### listr2 (Task List Library)
- **What it does:** Beautiful task lists with progress tracking, supports prompts
- **Why not:** Overkill for a linear wizard. Designed for parallel/sequential task execution with status tracking. The wizard is sequential prompts, not background tasks.
- **Bundle size:** ~150KB+ with dependencies

### cli-progress / ts-progress
- **What they do:** Progress bars for long-running operations
- **Why not:** Wizard steps are user-paced, not time-based. A simple "Step 1/5" text is clearer than a progress bar that jumps.

### inquirer (classic)
- **What it does:** Original monolithic inquirer package
- **Why not:** @inquirer/prompts is the modern replacement, already in use. Classic inquirer is larger and has more dependencies.

### enquirer
- **What it does:** Alternative to inquirer with similar API
- **Why not:** Would duplicate functionality. @inquirer/prompts is already established in codebase.

### clack (by natemoo-re)
- **What it does:** Beautiful CLI prompts with step indicators
- **Why not:** While aesthetically appealing, switching from @inquirer/prompts would require rewriting existing prompts. Marginal visual improvement doesn't justify migration cost.

---

## Integration Notes

### Adding checkbox to Existing Code
Current import in `src/cli/commands/new.ts`:
```typescript
import { confirm, input, select } from '@inquirer/prompts';
```

Extended for wizard:
```typescript
import { checkbox, confirm, input, select, number } from '@inquirer/prompts';
```

### Wizard Module Structure
```
src/
  wizard/
    index.ts           # Main wizard orchestrator
    steps/             # Individual step handlers
      description.ts   # Natural language description step
      platforms.ts     # Target platform selection
      complexity.ts    # Complexity estimation
      features.ts      # Feature selection (handlers, templates, etc.)
      review.ts        # Summary and confirmation
    state.ts           # WizardState type and initial values
    progress.ts        # Step indicator utility
```

### Step Indicator Implementation
```typescript
// src/wizard/progress.ts
import chalk from 'chalk';

export function formatStepHeader(
  step: number,
  total: number,
  title: string
): string {
  return `${chalk.cyan(`[${step}/${total}]`)} ${chalk.bold(title)}`;
}

export function formatStepDivider(): string {
  return chalk.dim('─'.repeat(40));
}
```

### Config Schema Extension
Current schema in `src/config/schema.ts`:
```typescript
export interface DefaultsConfig {
  model: 'sonnet' | 'opus';
  complex: boolean;
}
```

Extended for wizard defaults:
```typescript
export interface DefaultsConfig {
  model: 'sonnet' | 'opus';
  complex: boolean;
  // Wizard defaults (optional, saved when user chooses "save as default")
  wizard?: {
    platforms?: string[];
    include_handlers?: boolean;
    include_templates?: boolean;
    include_molecule?: boolean;
  };
}
```

### --quick Flag Implementation
Skip wizard when `--quick` flag is present:
```typescript
if (options.quick) {
  // Use saved defaults from config or hardcoded sensible defaults
  const defaults = config.defaults.wizard ?? DEFAULT_WIZARD_STATE;
  return defaults;
}
// Otherwise run interactive wizard
return await runWizard(description);
```

---

## Checkbox Prompt API Reference

From @inquirer/prompts v8.2.0 (verified via official docs):

```typescript
import { checkbox, Separator } from '@inquirer/prompts';

const platforms = await checkbox({
  message: 'Which platforms should this role support?',
  choices: [
    { name: 'Ubuntu 22.04', value: 'ubuntu-22.04', checked: true },
    { name: 'Ubuntu 20.04', value: 'ubuntu-20.04' },
    new Separator('-- RHEL Family --'),
    { name: 'RHEL 9', value: 'rhel-9' },
    { name: 'Rocky Linux 9', value: 'rocky-9' },
    { name: 'CentOS Stream 9', value: 'centos-stream-9' },
  ],
  pageSize: 10,
  loop: false,
  required: true,  // At least one must be selected
});
```

**Choice Properties:**
- `value` (required): The value returned when selected
- `name` (optional): Display text (defaults to value)
- `description` (optional): Additional context shown below choice
- `checked` (optional): Pre-selected state
- `disabled` (optional): Greyed out, cannot select

---

## Package.json - No Changes Required

Current relevant dependencies (all sufficient):
```json
{
  "dependencies": {
    "@inquirer/prompts": "^8.2.0",
    "chalk": "^5.4.1",
    "ora": "^9.0.0",
    "boxen": "^8.0.1",
    "smol-toml": "^1.6.0"
  }
}
```

---

## Summary

| Need | Solution | New Dependency? |
|------|----------|-----------------|
| Step-by-step prompts | @inquirer/prompts (existing) | No |
| Multi-select | @inquirer/prompts checkbox (existing, add import) | No |
| Progress indicators | chalk formatting (existing) | No |
| Save defaults | smol-toml + config system (existing) | No |
| --quick flag | Commander option (existing) | No |

**Conclusion:** The wizard feature can be fully implemented with the existing stack. No new dependencies recommended.

---

## Sources

- [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts)
- [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js)
- [@inquirer/checkbox documentation](https://github.com/SBoudrias/Inquirer.js/blob/main/packages/checkbox/README.md)
- [listr2 documentation](https://listr2.kilic.dev/) (evaluated, not recommended)
- [cli-progress npm](https://www.npmjs.com/package/cli-progress) (evaluated, not recommended)
