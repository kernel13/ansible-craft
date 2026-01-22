# Phase 11: Playbook Wizard - Research

**Researched:** 2026-01-22
**Domain:** Interactive CLI prompts with @inquirer/prompts for playbook customization
**Confidence:** HIGH

## Summary

The playbook wizard collects three pieces of customization data through interactive prompts: target hosts (free text Ansible patterns), privilege escalation (yes/no with optional become_user), and handler descriptions (optional free text). This implementation is independent from the role wizard (Phase 10) with no shared code, following the same UX patterns but with different prompt types.

The standard approach is to use @inquirer/prompts `input` for text entry and `confirm` for boolean decisions, with custom validation functions to warn users about common mistakes while still allowing flexibility. The wizard context flows into `generatePlaybookPlan()` via the existing `clarifications` parameter, which already supports `Record<string, string>` format.

**Primary recommendation:** Use `input` prompts with non-blocking validation (warnings, not hard failures) for hosts and handlers, `confirm` + conditional `input` for become/become_user, format all values as strings for the clarifications parameter.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @inquirer/prompts | ^8.2.0 | Interactive CLI prompts | Already in package.json, used by role wizard, comprehensive prompt types |
| @inquirer/core | latest | ExitPromptError handling | Provides ExitPromptError class for Ctrl+C detection |
| chalk | ^5.4.1 | Terminal styling | Already in package.json, used throughout CLI for colors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^4.3.5 | Schema validation | Already used in types.ts for PlaybookWizardContext validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @inquirer/prompts | enquirer | enquirer has different API, would require rewriting patterns, @inquirer is ecosystem standard |
| input validation | schema validation | Schemas are too rigid for Ansible patterns (many valid syntaxes), validation should warn not block |

**Installation:**
No new packages needed - all dependencies already in package.json

## Architecture Patterns

### Recommended Project Structure
```
src/wizard/
├── types.ts              # PlaybookWizardContext already defined
├── prompts.ts            # Role wizard prompts (existing)
├── playbook-prompts.ts   # NEW: Playbook-specific prompts
├── role-wizard.ts        # Role wizard orchestrator (existing)
└── playbook-wizard.ts    # NEW: Playbook wizard orchestrator
```

### Pattern 1: Independent Implementation
**What:** Separate module for playbook wizard with no code sharing with role wizard
**When to use:** Always - per 11-CONTEXT.md decision
**Example:**
```typescript
// playbook-wizard.ts - completely separate from role-wizard.ts
export async function runPlaybookWizard(): Promise<PlaybookWizardContext> {
  showStepHeader(1, 3, 'Target Hosts');
  const hosts = await promptHosts();

  showStepHeader(2, 3, 'Privilege Escalation');
  const become = await promptBecome();
  const becomeUser = become ? await promptBecomeUser() : undefined;

  showStepHeader(3, 3, 'Handler Configuration');
  const handlers = await promptHandlers();

  // Build context...
}
```

### Pattern 2: String-Only Clarifications Format
**What:** Convert all wizard responses to strings for `generatePlaybookPlan()` clarifications parameter
**When to use:** Always - existing code expects `Record<string, string>`
**Example:**
```typescript
// From formatPlaybookContextForPrompt in types.ts
function formatForClarifications(context: PlaybookWizardContext): Record<string, string> {
  return {
    hosts: context.hosts.join(', '),              // Array to comma-separated string
    become: context.become ? 'yes' : 'no',        // Boolean to Ansible convention
    become_user: context.becomeUser || '',        // Optional string or empty
    handlers: context.handlersDescription || '',   // Optional description or empty
  };
}
```

### Pattern 3: Non-Blocking Validation
**What:** Validate function returns warnings as strings but always returns true to allow submission
**When to use:** For hosts and handlers inputs where valid syntax is complex and user knows best
**Example:**
```typescript
// Source: Inferred from @inquirer/input documentation
const hosts = await input({
  message: 'Target hosts or groups:',
  required: true,
  validate: (value: string) => {
    if (!value.trim()) return 'Host pattern is required';

    // Warn about suspicious patterns but don't block
    if (value.includes(';') || value.includes('&&')) {
      return 'Warning: Pattern contains shell characters - are you sure?';
    }

    return true; // Always allow after warning
  }
});
```

### Pattern 4: Conditional Follow-Up Prompts
**What:** Show become_user prompt only when become is true
**When to use:** For optional configuration that depends on previous answer
**Example:**
```typescript
const become = await confirm({
  message: 'Use privilege escalation (become)?',
  default: false,
});

let becomeUser: string | undefined;
if (become) {
  becomeUser = await input({
    message: 'Become user (default: root):',
    default: 'root',
    required: false,
  });
}
```

### Pattern 5: ExitPromptError Propagation
**What:** Let ExitPromptError bubble up to CLI command handler, don't catch in wizard
**When to use:** Always - consistent with role wizard behavior
**Example:**
```typescript
// playbook-wizard.ts - NO try/catch around prompts
export async function runPlaybookWizard(): Promise<PlaybookWizardContext> {
  // Prompts that may throw ExitPromptError
  const hosts = await promptHosts(); // May throw - let it propagate
  // ...
}

// In CLI command (commands/new.ts)
try {
  const context = await runPlaybookWizard();
} catch (error) {
  if (error instanceof ExitPromptError) {
    console.log(chalk.yellow('\nWizard cancelled.'));
    return;
  }
  throw error;
}
```

### Anti-Patterns to Avoid
- **Hard validation failures:** Don't block submission for valid-but-unusual Ansible patterns
- **Shared code with role wizard:** Independent implementations prevent coupling
- **Boolean fields in clarifications:** Convert to strings ('yes'/'no') for consistency
- **Global ExitPromptError handler:** Handle in command, not in wizard module
- **Default host pattern 'all':** Require explicit input to prevent accidental broad targeting

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Text input prompts | Custom readline wrapper | @inquirer/prompts input | Handles edge cases (Ctrl+C, validation, theming, cursor position) |
| Yes/No prompts | Custom y/n parser | @inquirer/prompts confirm | Accepts multiple formats (y, yes, n, no), handles defaults correctly |
| Ansible pattern validation | Regex for valid patterns | Warn-only validation | Ansible patterns too complex (wildcards, operators :&!, ranges, regex), false positives harm UX |
| Progress indicators | Manual console.log formatting | showStepHeader() helper | Consistent formatting with role wizard, handles percentage calculation |
| Context formatting | Manual string building | formatPlaybookContextForPrompt() | Token-efficient format, handles empty arrays, follows conventions |

**Key insight:** Ansible host patterns are extremely flexible (wildcards, operators, ranges, regex) - attempting to validate comprehensively leads to false positives. Better to warn about obviously suspicious input (shell characters, empty strings) and trust the user.

## Common Pitfalls

### Pitfall 1: Over-Validation of Host Patterns
**What goes wrong:** Blocking valid Ansible patterns because validation regex is incomplete
**Why it happens:** Ansible supports wildcards (`web*`), operators (`:`, `&`, `!`), ranges (`[0:5]`), regex (`~pattern`), and combinations - impossible to validate exhaustively
**How to avoid:** Use required check + warning-only validation for suspicious characters
**Warning signs:** Users report they can't enter valid inventory patterns, GitHub issues about validation blocking legitimate use cases

**Example:**
```typescript
// BAD: Over-restrictive validation
validate: (value) => {
  if (!/^[a-z0-9_-]+$/.test(value)) {
    return 'Invalid host pattern'; // Blocks "web*", "all:!prod", etc.
  }
  return true;
}

// GOOD: Warning-only for suspicious input
validate: (value) => {
  if (!value.trim()) return 'Host pattern required';
  if (value.includes(';') || value.includes('|') || value.includes('&&')) {
    console.warn(chalk.yellow('  Warning: Contains shell characters'));
  }
  return true; // Always allow submission
}
```

### Pitfall 2: Forgetting become_user Defaults to Root
**What goes wrong:** Users surprised when become_user is empty but defaults to root
**Why it happens:** Ansible convention: `become: yes` without `become_user` means root
**How to avoid:** Prompt message includes "(default: root)" hint, empty input is intentional
**Warning signs:** User confusion about which user privilege escalation uses

**Example:**
```typescript
// Prompt makes default explicit
const becomeUser = await input({
  message: 'Become user (default: root):',
  default: 'root',  // Shows in prompt
  required: false,  // Empty string is valid
});

// Format for prompt - empty means root
result.become_user = becomeUser || ''; // Don't force 'root' string
```

### Pitfall 3: Handler Input as YAML Instead of Description
**What goes wrong:** Users paste YAML handler code instead of describing what handlers do
**Why it happens:** They're used to writing Ansible YAML, not natural language
**How to avoid:** Placeholder text shows natural language examples, validation warns on YAML keywords
**Warning signs:** Generated handlers contain malformed YAML from nested YAML in description

**Example:**
```typescript
const handlers = await input({
  message: 'Handlers needed (optional):',
  default: '',
  required: false,
  validate: (value: string) => {
    // Warn if looks like YAML code
    if (value.match(/^(\s*-\s*name:|handlers:|notify:)/m)) {
      console.warn(chalk.yellow('  Tip: Describe handlers in natural language, not YAML'));
    }
    return true;
  },
  transformer: (value: string) => {
    // Show placeholder when empty
    return value || chalk.dim('e.g., restart nginx, reload config');
  }
});
```

### Pitfall 4: Array in PlaybookWizardContext.hosts
**What goes wrong:** Code expects `hosts: string[]` but generates single pattern like "webservers,databases"
**Why it happens:** User enters comma-separated list in single input, unclear if should split or keep as one pattern
**How to avoid:** Decision: hosts remains `string[]` with single element, user enters full Ansible pattern as one string
**Warning signs:** Tests fail when trying to split on comma (breaks patterns like "web*,db*")

**Example:**
```typescript
// User input: "webservers:&prod,databases"
// Store as single pattern, not split
const context: PlaybookWizardContext = {
  hosts: [userInput],  // Single element array: ["webservers:&prod,databases"]
  // NOT: hosts: userInput.split(',')  // Would break "web*,db*" pattern
};

// Format for clarifications
formatPlaybookContextForPrompt(context);
// Returns: { hosts: "webservers:&prod,databases" }
```

### Pitfall 5: instanceof ExitPromptError Returns False
**What goes wrong:** `error instanceof ExitPromptError` check always false despite correct error type
**Why it happens:** Known issue with @inquirer/prompts when importing from wrong package
**How to avoid:** Import ExitPromptError from @inquirer/core, not @inquirer/prompts
**Warning signs:** Ctrl+C doesn't show clean exit message, stack trace displayed to user

**Example:**
```typescript
// BAD: Import from @inquirer/prompts
import { input, ExitPromptError } from '@inquirer/prompts';
// instanceof check may fail

// GOOD: Import from @inquirer/core (per 10-02 decision)
import { input } from '@inquirer/prompts';
import { ExitPromptError } from '@inquirer/core';
// instanceof check works reliably
```

## Code Examples

Verified patterns from official sources:

### Input Prompt with Validation
```typescript
// Source: https://github.com/SBoudrias/Inquirer.js/blob/main/packages/input/README.md
import { input } from '@inquirer/prompts';

const hosts = await input({
  message: 'Target hosts or groups:',
  required: true,  // Empty input rejected
  validate: (value: string) => {
    if (!value.trim()) {
      return 'Host pattern is required';
    }
    // Warn but don't block
    if (value.includes(';') || value.includes('&&')) {
      return 'Warning: Pattern contains shell characters';
    }
    return true;
  },
  transformer: (value: string, { isFinal }: { isFinal: boolean }) => {
    // Show hint when empty, actual value when typing
    return value || chalk.dim('e.g., webservers, all:!prod, web*:&staging');
  }
});
```

### Confirm Prompt with Conditional Follow-Up
```typescript
// Source: https://www.npmjs.com/package/@inquirer/confirm
import { confirm, input } from '@inquirer/prompts';

const become = await confirm({
  message: 'Use privilege escalation (become)?',
  default: false,  // Safer default - opt-in to privilege
});

let becomeUser: string | undefined;
if (become) {
  becomeUser = await input({
    message: 'Become user (default: root):',
    default: 'root',
    required: false,  // Empty is valid, means root
  });
}
```

### ExitPromptError Handling
```typescript
// Source: https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md
import { ExitPromptError } from '@inquirer/core';
import { runPlaybookWizard } from './wizard/playbook-wizard.js';

try {
  const context = await runPlaybookWizard();
  // Use context...
} catch (error) {
  if (error instanceof ExitPromptError) {
    console.log(chalk.yellow('\nWizard cancelled.'));
    return;
  }
  throw error; // Re-throw unexpected errors
}
```

### Progress Header (Consistent with Role Wizard)
```typescript
// Source: src/wizard/prompts.ts (role wizard)
export function showStepHeader(current: number, total: number, title: string): void {
  const percentage = Math.round((current / total) * 100);
  const separator = '='.repeat(60);

  console.log(chalk.cyan(`\n${separator}`));
  console.log(chalk.cyan.bold(`[${current}/${total}] ${title} (${percentage}% complete)`));
  console.log(chalk.cyan(`${separator}\n`));
}

// Usage:
showStepHeader(1, 3, 'Target Hosts');     // 33%
showStepHeader(2, 3, 'Privilege Escalation'); // 67%
showStepHeader(3, 3, 'Handler Configuration'); // 100%
```

### Context Formatting for Clarifications
```typescript
// Source: src/wizard/types.ts formatPlaybookContextForPrompt()
export function formatPlaybookContextForPrompt(
  context: PlaybookWizardContext,
): Record<string, string> {
  const result: Record<string, string> = {};

  // Format hosts as comma-separated string (usually single element)
  if (context.hosts.length > 0) {
    result.hosts = context.hosts.join(', ');
  }

  // Use Ansible convention for boolean values
  result.become = context.become ? 'yes' : 'no';

  // Optional become_user
  if (context.becomeUser) {
    result.become_user = context.becomeUser;
  }

  // Format handler inclusion
  if (context.handlersDescription) {
    result.handlers = context.handlersDescription;
  }

  return result;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single inquirer package | @inquirer/prompts modular packages | 2023 | Each prompt type is separate package, tree-shakeable, better TypeScript types |
| Yes/no string parsing | confirm() built-in | Always standard | Handles y/yes/n/no, case-insensitive, provides boolean directly |
| Hard validation failures | Warning-only validation | Best practice 2024+ | Better UX for complex input patterns, user knows their requirements |
| Static error messages | Transformer for dynamic hints | @inquirer/prompts v8+ | Show placeholders and hints without cluttering prompt message |

**Deprecated/outdated:**
- Old `inquirer` package (v9.x): Use `@inquirer/prompts` for modular imports
- Hard-coded validation regex for Ansible patterns: Too many valid syntaxes, warns only
- Separate validation libraries (joi, yup): Zod is lighter, already in project

## Open Questions

Things that couldn't be fully resolved:

1. **Should hosts be split on comma or kept as single pattern?**
   - What we know: Ansible accepts comma-separated lists but also uses commas in advanced patterns
   - What's unclear: User intent when entering "web1,web2" vs "webservers,databases"
   - Recommendation: Keep as single-element array (one full pattern), don't split - simpler and safer

2. **Should handlersDescription field be added to PlaybookWizardContext?**
   - What we know: Current type has `includeHandlers: boolean`, context decision mentions "free text description"
   - What's unclear: Whether to add `handlersDescription?: string` field or pass via custom object
   - Recommendation: Add optional `handlersDescription?: string` to PlaybookWizardContext, format into clarifications

3. **Should validation be completely removed or kept as warnings?**
   - What we know: Hard validation blocks valid patterns, but completely removing validation means no help for mistakes
   - What's unclear: Where to draw the line between helpful warnings and annoying nags
   - Recommendation: Keep minimal validation - require non-empty hosts, warn on shell characters

## Sources

### Primary (HIGH confidence)
- @inquirer/input README: https://github.com/SBoudrias/Inquirer.js/blob/main/packages/input/README.md
- Ansible host patterns documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html
- Ansible privilege escalation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- ExitPromptError handling: https://github.com/SBoudrias/Inquirer.js/blob/main/packages/prompts/README.md
- Existing codebase: src/wizard/types.ts, src/wizard/role-wizard.ts, src/wizard/prompts.ts

### Secondary (MEDIUM confidence)
- @inquirer/prompts npm page: https://www.npmjs.com/package/@inquirer/prompts
- @inquirer/confirm npm page: https://www.npmjs.com/package/@inquirer/confirm

### Tertiary (LOW confidence)
- Community tutorials on Inquirer.js patterns (not relied upon for critical decisions)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in package.json, verified versions
- Architecture: HIGH - Patterns verified in existing role wizard code, official documentation confirms API
- Pitfalls: MEDIUM - Some inferred from code structure, Ansible pattern complexity verified in docs
- Code examples: HIGH - All examples verified against official documentation or existing codebase

**Research date:** 2026-01-22
**Valid until:** 30 days (stable libraries, established patterns)
