# Validation Pipeline

The validation pipeline ensures generated Ansible code meets quality and best practice standards.

## Overview

All generated code passes through a four-stage validation pipeline before being written to disk.

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │    YAML      │───▶│    FQCN      │───▶│ IDEMPOTENCY  │      │
│  │   SYNTAX     │    │  COMPLIANCE  │    │   PATTERNS   │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│      ERROR              WARNING              WARNING            │
│      blocks             informs              informs            │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ ANSIBLE-LINT │───▶│   AUTO-FIX   │───▶│ WRITE FILES  │      │
│  │  (optional)  │    │  (optional)  │    │              │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                                                       │
│         ▼                                                       │
│   ERROR blocks                                                  │
│   WARNING + fixable                                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Stage 1: YAML Syntax Validation

**Purpose:** Ensure generated content is valid YAML.

**Location:** `src/generation/validation/yaml-validator.ts`

### Checks Performed

| Check | Description |
|-------|-------------|
| Structure | Valid YAML document structure |
| Indentation | Consistent indentation (2 spaces) |
| Keys | No duplicate keys |
| Quoting | Proper string quoting |
| Types | Valid YAML types |

### Error Handling

YAML errors **block generation**. Invalid YAML cannot proceed.

```typescript
interface YamlValidationResult {
  valid: boolean;
  errors: YamlError[];
}

interface YamlError {
  line: number;
  column: number;
  message: string;
}
```

### Example Error

```
YAML Syntax Error: Duplicate key "name" at line 15, column 3
```

## Stage 2: FQCN Compliance

**Purpose:** Verify all module names use Fully Qualified Collection Names.

**Location:** `src/generation/validation/fqcn-validator.ts`

### What is FQCN?

FQCN (Fully Qualified Collection Name) is the complete module path:

| Short Name | FQCN |
|------------|------|
| `apt` | `ansible.builtin.apt` |
| `yum` | `ansible.builtin.yum` |
| `service` | `ansible.builtin.service` |
| `template` | `ansible.builtin.template` |
| `file` | `ansible.builtin.file` |
| `copy` | `ansible.builtin.copy` |

### Module Mapping

The validator uses a comprehensive mapping file:

```typescript
// cc/common/references/fqcn.md contains the full mapping
const FQCN_MAP: Record<string, string> = {
  apt: 'ansible.builtin.apt',
  dnf: 'ansible.builtin.dnf',
  yum: 'ansible.builtin.yum',
  service: 'ansible.builtin.service',
  systemd: 'ansible.builtin.systemd',
  // ... 100+ mappings
};
```

### Error Handling

FQCN issues produce **warnings** (non-blocking):

```typescript
interface FqcnValidationResult {
  compliant: boolean;
  warnings: FqcnWarning[];
}

interface FqcnWarning {
  line: number;
  module: string;
  suggested: string;
}
```

### Auto-Fix Support

Non-compliant module names can be auto-fixed:

```yaml
# Before
- name: Install nginx
  apt:
    name: nginx

# After auto-fix
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
```

## Stage 3: Idempotency Patterns

**Purpose:** Detect patterns that may cause non-idempotent behavior.

**Location:** `src/generation/validation/idempotency-validator.ts`

### Patterns Detected

| Pattern | Issue | Recommendation |
|---------|-------|----------------|
| `shell:` without `creates:` | Runs every time | Add `creates:` or `when:` |
| `command:` without `creates:` | Runs every time | Add `creates:` or `when:` |
| `curl \| bash` | Not idempotent | Use `get_url` + script |
| Missing `state:` | Unclear intent | Always specify state |
| `rm -rf` | Destructive | Use `file: state=absent` |

### Detection Logic

```typescript
function checkIdempotency(task: Task): IdempotencyWarning[] {
  const warnings: IdempotencyWarning[] = [];

  // Check shell/command without creates
  if ((task.shell || task.command) && !task.creates && !task.when) {
    warnings.push({
      line: task.line,
      message: 'shell/command without creates may not be idempotent',
      suggestion: "Add 'creates:' parameter or 'when:' conditional"
    });
  }

  // Check for piped commands
  if (task.shell?.includes('|')) {
    warnings.push({
      line: task.line,
      message: 'Piped shell commands are often not idempotent'
    });
  }

  return warnings;
}
```

### Error Handling

Idempotency issues produce **warnings** (non-blocking):

```typescript
interface IdempotencyValidationResult {
  issues: IdempotencyWarning[];
}

interface IdempotencyWarning {
  line: number;
  message: string;
  suggestion?: string;
}
```

## Stage 4: ansible-lint

**Purpose:** Comprehensive rule-based linting.

**Location:** `src/generation/validation/ansible-lint.ts`

### Execution

ansible-lint is run as an external process:

```typescript
async function runAnsibleLint(path: string): Promise<LintResult> {
  const result = await exec(`ansible-lint ${path} --parseable --nocolor`);
  return parseLintOutput(result.stdout);
}
```

### Optional Dependency

If ansible-lint is not installed, this stage is skipped with a warning:

```
⚠ ansible-lint not found. Skipping lint validation.
  Install with: pip install ansible-lint
```

### Rule Categories

| Category | Examples |
|----------|----------|
| yaml | `yaml[truthy]`, `yaml[indentation]` |
| name | `name[missing]`, `name[casing]` |
| no-* | `no-changed-when`, `no-handler` |
| risky-* | `risky-file-permissions` |
| command-* | `command-instead-of-module` |

### Severity Levels

| Level | Action |
|-------|--------|
| `error` | Must be fixed (blocking if `--fix` not used) |
| `warning` | Should be fixed (non-blocking) |
| `info` | Suggestion (non-blocking) |

### Error Handling

```typescript
interface LintResult {
  passed: boolean;
  errors: LintViolation[];
  warnings: LintViolation[];
}

interface LintViolation {
  rule: string;
  file: string;
  line: number;
  message: string;
  fixable: boolean;
}
```

## Auto-Fix System

**Purpose:** Automatically fix common issues.

**Location:** `src/generation/validation/fixer.ts`

### Fixable Issues

| Rule | Fix |
|------|-----|
| `yaml[truthy]` | `yes`→`true`, `no`→`false` |
| `yaml[indentation]` | Reindent to 2 spaces |
| Non-FQCN modules | Add `ansible.builtin.` prefix |
| `yaml[line-length]` | Split long lines |

### Fix Process

```typescript
async function autoFix(files: string[], violations: LintViolation[]): Promise<FixResult> {
  const fixable = violations.filter(v => v.fixable);

  for (const file of files) {
    let content = await readFile(file);

    for (const violation of fixable.filter(v => v.file === file)) {
      content = applyFix(content, violation);
    }

    await writeFile(file, content);
  }

  return { fixed: fixable.length };
}
```

### User Interaction

Without `--fix`, users are prompted:

```
ansible-lint found 3 fixable issues:
  • yaml[truthy]: 2 instances
  • yaml[indentation]: 1 instance

? Auto-fix these issues?
❯ Yes
  No
```

## Pipeline Integration

### Generation Flow Integration

The validation pipeline is integrated into the generation flow:

```typescript
// src/generation/generate-role.ts
async function generateRole(description: string): Promise<GenerationResult> {
  // 1. Plan phase
  const plan = await generatePlan(description);

  // 2. Code generation
  const code = await generateCode(plan);

  // 3. Validation pipeline
  const validation = await validateCode(code);

  if (!validation.yamlValid) {
    throw new ValidationError('Invalid YAML', validation.yamlErrors);
  }

  // 4. Lint (if available)
  if (isAnsibleLintAvailable()) {
    const lintResult = await runAnsibleLint(code);

    if (lintResult.errors.length > 0 && options.fix) {
      await autoFix(code, lintResult.errors);
    }
  }

  // 5. Write files
  await writeFiles(code, outputDir);

  return { success: true, warnings: validation.warnings };
}
```

### CLI Options

| Flag | Effect on Pipeline |
|------|-------------------|
| `--dry-run` | Run validation, don't write |
| `--fix` | Auto-fix without prompting |
| `--force` | Write even with warnings |
| `--no-interactive` | Use defaults for prompts |

## Error vs Warning

### Errors (Blocking)

- YAML syntax errors
- ansible-lint errors (without `--fix`)

### Warnings (Non-Blocking)

- FQCN warnings
- Idempotency warnings
- ansible-lint warnings

### User Feedback

```
✓ YAML Syntax: Valid
✓ FQCN Compliance: All modules use FQCN
⚠ Idempotency: 1 warning
  • shell task at line 23 may not be idempotent
✓ ansible-lint: Passed with warnings

Files written to ./nginx/
```

## Extending Validation

### Adding New Validators

1. Create validator in `src/generation/validation/`
2. Implement the `Validator` interface
3. Register in the pipeline

```typescript
interface Validator {
  name: string;
  validate(content: string): Promise<ValidationResult>;
  canFix: boolean;
  fix?(content: string, issues: Issue[]): Promise<string>;
}
```

### Custom Rules

ansible-lint can be configured with `.ansible-lint`:

```yaml
# .ansible-lint
skip_list:
  - experimental
warn_list:
  - no-changed-when
```

## Related

- **[Generation Flow](generation-flow.md)** - Overall generation process
- **[AI Integration](ai-integration.md)** - How AI generates code
- **[User Guide: Validation](../user-guide/validation.md)** - User-facing docs
