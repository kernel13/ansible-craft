# Adding Validators

Guide to adding new validation rules to ansible-craft.

## Overview

Validators check generated Ansible code for quality and best practices. The validation pipeline runs after code generation and before file writing.

## Validation Pipeline

```
Generated Code
      │
      ▼
┌─────────────┐
│ YAML Syntax │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│    FQCN     │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Idempotency │
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ansible-lint │
└─────┬───────┘
      │
      ▼
   Write Files
```

## Validator Interface

All validators implement the `Validator` interface:

```typescript
// src/generation/validation/types.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ValidationIssue {
  type: string;
  message: string;
  file?: string;
  line?: number;
  column?: number;
  fixable?: boolean;
  fix?: string;
}

export interface Validator {
  name: string;
  validate(content: string, options?: ValidatorOptions): Promise<ValidationResult>;
  canFix: boolean;
  fix?(content: string, issues: ValidationIssue[]): Promise<string>;
}

export interface ValidatorOptions {
  file?: string;
  strictMode?: boolean;
}
```

## Creating a New Validator

### Step 1: Create Validator File

Create a new file in `src/generation/validation/`:

```typescript
// src/generation/validation/my-validator.ts

import type { Validator, ValidationResult, ValidationIssue } from './types';

export class MyValidator implements Validator {
  name = 'my-validator';
  canFix = false; // Set to true if auto-fix is supported

  async validate(content: string): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];

    // Parse and validate content
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for issues
      if (this.hasIssue(line)) {
        warnings.push({
          type: 'my-rule',
          message: 'Description of the issue',
          line: lineNumber,
          fixable: false
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  private hasIssue(line: string): boolean {
    // Implement your check logic
    return false;
  }
}
```

### Step 2: Add Auto-Fix (Optional)

If your validator can fix issues:

```typescript
export class MyValidator implements Validator {
  name = 'my-validator';
  canFix = true;

  async validate(content: string): Promise<ValidationResult> {
    // ... validation logic
  }

  async fix(content: string, issues: ValidationIssue[]): Promise<string> {
    let fixedContent = content;

    for (const issue of issues) {
      if (issue.fixable && issue.fix) {
        // Apply fix
        fixedContent = this.applyFix(fixedContent, issue);
      }
    }

    return fixedContent;
  }

  private applyFix(content: string, issue: ValidationIssue): string {
    const lines = content.split('\n');

    if (issue.line) {
      // Replace the problematic line
      lines[issue.line - 1] = issue.fix!;
    }

    return lines.join('\n');
  }
}
```

### Step 3: Register Validator

Add the validator to the pipeline:

```typescript
// src/generation/validation/index.ts

import { MyValidator } from './my-validator';

export const validators: Validator[] = [
  new YamlValidator(),
  new FqcnValidator(),
  new IdempotencyValidator(),
  new MyValidator(), // Add your validator
];

export async function runValidation(content: string): Promise<ValidationResult> {
  const allErrors: ValidationIssue[] = [];
  const allWarnings: ValidationIssue[] = [];

  for (const validator of validators) {
    const result = await validator.validate(content);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);

    // Stop on errors if validator blocks
    if (result.errors.length > 0 && validator.name === 'yaml') {
      break;
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}
```

### Step 4: Add Tests

```typescript
// src/generation/validation/my-validator.test.ts

import { describe, test, expect } from 'bun:test';
import { MyValidator } from './my-validator';

describe('MyValidator', () => {
  const validator = new MyValidator();

  test('should detect issue', async () => {
    const content = `
- name: Task with issue
  problematic_thing: value
`;

    const result = await validator.validate(content);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].type).toBe('my-rule');
  });

  test('should pass valid content', async () => {
    const content = `
- name: Valid task
  ansible.builtin.debug:
    msg: Hello
`;

    const result = await validator.validate(content);

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  test('should fix issues', async () => {
    const content = `problematic line`;

    const issues = [{
      type: 'my-rule',
      message: 'Issue',
      line: 1,
      fixable: true,
      fix: 'fixed line'
    }];

    const fixed = await validator.fix(content, issues);

    expect(fixed).toBe('fixed line');
  });
});
```

## Example: Custom Security Validator

```typescript
// src/generation/validation/security-validator.ts

import type { Validator, ValidationResult, ValidationIssue } from './types';

export class SecurityValidator implements Validator {
  name = 'security';
  canFix = false;

  private readonly DANGEROUS_PATTERNS = [
    { pattern: /rm\s+-rf\s+\//, message: 'Dangerous: rm -rf on root' },
    { pattern: /chmod\s+777/, message: 'Insecure permissions: 777' },
    { pattern: /password:\s*\{\{.*\}\}/, message: 'Password in plain text variable' },
  ];

  async validate(content: string): Promise<ValidationResult> {
    const warnings: ValidationIssue[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      for (const { pattern, message } of this.DANGEROUS_PATTERNS) {
        if (pattern.test(line)) {
          warnings.push({
            type: 'security',
            message,
            line: lineNumber,
            fixable: false
          });
        }
      }
    }

    return {
      valid: true, // Security issues are warnings, not errors
      errors: [],
      warnings
    };
  }
}
```

## Example: Naming Convention Validator

```typescript
// src/generation/validation/naming-validator.ts

import yaml from 'yaml';
import type { Validator, ValidationResult, ValidationIssue } from './types';

export class NamingValidator implements Validator {
  name = 'naming';
  canFix = true;

  async validate(content: string): Promise<ValidationResult> {
    const warnings: ValidationIssue[] = [];

    try {
      const doc = yaml.parse(content);

      if (Array.isArray(doc)) {
        for (const task of doc) {
          if (task.name && !this.isValidTaskName(task.name)) {
            warnings.push({
              type: 'naming',
              message: `Task name should be sentence case: "${task.name}"`,
              fixable: true,
              fix: this.toSentenceCase(task.name)
            });
          }
        }
      }
    } catch {
      // YAML parse error handled by yaml validator
    }

    return {
      valid: true,
      errors: [],
      warnings
    };
  }

  async fix(content: string, issues: ValidationIssue[]): Promise<string> {
    let fixed = content;

    for (const issue of issues) {
      if (issue.fixable && issue.fix) {
        // Replace the original task name with fixed version
        const originalName = issue.message.match(/"([^"]+)"/)?.[1];
        if (originalName) {
          fixed = fixed.replace(
            `name: ${originalName}`,
            `name: ${issue.fix}`
          );
        }
      }
    }

    return fixed;
  }

  private isValidTaskName(name: string): boolean {
    // Should start with uppercase
    return /^[A-Z]/.test(name);
  }

  private toSentenceCase(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }
}
```

## Validator Best Practices

### Error vs Warning

| Issue Type | Severity | Behavior |
|------------|----------|----------|
| Critical issues | Error | Blocks generation |
| Best practice violations | Warning | Shown but continues |
| Suggestions | Warning | Optional to fix |

### Performance

- Parse YAML once if multiple checks needed
- Use early return for obvious passes
- Cache compiled regex patterns

### Messages

- Be specific about what's wrong
- Suggest how to fix
- Include line numbers when possible

### Fixability

Only mark as fixable if:
- The fix is deterministic
- It won't break other code
- It can be done safely

## Integration with CLI

Validators are called during generation:

```typescript
// In generation flow
const result = await runValidation(generatedCode);

if (!result.valid) {
  throw new ValidationError('Validation failed', result.errors);
}

if (result.warnings.length > 0) {
  displayWarnings(result.warnings);

  if (options.fix) {
    const fixed = await applyFixes(generatedCode, result.warnings);
    return fixed;
  }
}
```

## Related

- **[Validation Pipeline](../architecture/validation-pipeline.md)** - Pipeline architecture
- **[Testing Guide](testing.md)** - Writing validator tests
- **[Code Style](code-style.md)** - Code conventions
