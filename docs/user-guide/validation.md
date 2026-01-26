# Validation Guide

ansible-craft validates all generated code through a multi-stage pipeline to ensure quality and best practices.

## Validation Pipeline

Generated code passes through four validation stages:

```
┌─────────────────┐
│  YAML Syntax    │──Error──▶ Generation fails
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│ FQCN Compliance │──Warning──▶ Shown in output
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  Idempotency    │──Warning──▶ Shown in output
│    Patterns     │
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  ansible-lint   │──Error/Warning──▶ Auto-fix offered
└────────┬────────┘
         │ Pass
         ▼
┌─────────────────┐
│  Write Files    │
└─────────────────┘
```

## Stage 1: YAML Syntax

Validates that generated output is syntactically correct YAML.

**Checks:**
- Valid YAML structure
- Proper indentation
- No duplicate keys
- Correct quoting

**Errors at this stage block generation** - you cannot proceed with invalid YAML.

**Example error:**
```
YAML Syntax Error: Duplicate key "name" at line 15
```

## Stage 2: FQCN Compliance

Verifies all module names use Fully Qualified Collection Names.

**What is FQCN?**

FQCN (Fully Qualified Collection Name) is the complete module path including the collection namespace:

| Short Name | FQCN |
|------------|------|
| `apt` | `ansible.builtin.apt` |
| `yum` | `ansible.builtin.yum` |
| `service` | `ansible.builtin.service` |
| `template` | `ansible.builtin.template` |
| `file` | `ansible.builtin.file` |
| `copy` | `ansible.builtin.copy` |
| `shell` | `ansible.builtin.shell` |
| `command` | `ansible.builtin.command` |

**Why FQCN matters:**
- Required for Ansible 2.10+
- Prevents naming collisions
- Makes dependencies explicit
- Required by ansible-lint

**Example warning:**
```
FQCN Warning: Module "apt" should be "ansible.builtin.apt" at line 8
```

ansible-craft generates FQCN-compliant code by default. Warnings at this stage are rare.

## Stage 3: Idempotency Patterns

Checks for common patterns that may cause non-idempotent behavior.

**What is idempotency?**

Idempotent tasks produce the same result whether run once or multiple times. This is a core Ansible principle.

**Patterns checked:**

| Pattern | Issue | Solution |
|---------|-------|----------|
| `shell:` without `creates:` | Runs every time | Add `creates:` or `when:` |
| `command:` without `creates:` | Runs every time | Add `creates:` or `when:` |
| `curl \| bash` | Not idempotent | Use `get_url` + script |
| Missing `state:` | Unclear intent | Always specify state |

**Example warning:**
```
Idempotency Warning: shell task at line 23 may not be idempotent. Consider adding 'creates:' parameter.
```

## Stage 4: ansible-lint

Runs ansible-lint for comprehensive rule checking.

**Requirements:**
- ansible-lint must be installed: `pip install ansible-lint`
- If not installed, this stage is skipped with a warning

**Severity levels:**

| Level | Meaning | Action |
|-------|---------|--------|
| Error | Must be fixed | Auto-fix offered |
| Warning | Should be fixed | Shown in output |
| Info | Suggestion | Shown in output |

**Common rules checked:**

| Rule | Description |
|------|-------------|
| `yaml[truthy]` | Use `true`/`false` not `yes`/`no` |
| `yaml[indentation]` | Consistent 2-space indentation |
| `name[missing]` | All tasks should have names |
| `no-changed-when` | shell/command needs changed_when |
| `risky-file-permissions` | Files should have explicit mode |
| `no-handler` | Use handlers for service restarts |

## Auto-Fix

When ansible-lint finds issues, you're prompted to auto-fix:

```
ansible-lint found 3 fixable issues:
  • yaml[truthy]: Use true/false instead of yes/no (2 instances)
  • yaml[indentation]: Wrong indentation (1 instance)

? Auto-fix these issues?
❯ Yes
  No
```

**What can be auto-fixed:**
- `yaml[truthy]`: `yes` → `true`, `no` → `false`
- `yaml[indentation]`: Reindent to 2 spaces
- Short module names → FQCN
- Common formatting issues

**What cannot be auto-fixed:**
- Missing task names
- Missing `changed_when`/`creates`
- Architectural issues
- Logic errors

### Always Auto-Fix

Use `--fix` to auto-fix without prompting:

```bash
ansible-craft new role "nginx" --fix
```

## Validation Output

### Successful Validation

```
✓ YAML Syntax: Valid
✓ FQCN Compliance: All modules use FQCN
✓ Idempotency: No issues detected
✓ ansible-lint: Passed (0 errors, 0 warnings)

Files written to ./nginx/
```

### Validation with Warnings

```
✓ YAML Syntax: Valid
✓ FQCN Compliance: All modules use FQCN
⚠ Idempotency: 1 warning
  • shell task at line 23 may not be idempotent
✓ ansible-lint: Passed with warnings
  • name[casing]: Task name should be sentence case at line 15

Files written to ./nginx/
```

### Validation with Errors

```
✓ YAML Syntax: Valid
✓ FQCN Compliance: All modules use FQCN
✓ Idempotency: No issues detected
✗ ansible-lint: 2 errors, 1 warning
  • yaml[truthy]: Use true/false instead of yes/no at line 8
  • yaml[truthy]: Use true/false instead of yes/no at line 12
  • name[missing]: Task should have a name at line 20

? Auto-fix these issues? (Y/n)
```

## Dry Run Mode

Use `--dry-run` to see validation results without writing files:

```bash
ansible-craft new role "nginx" --dry-run
```

This shows:
- Generated plan preview
- Validation results
- What files would be created

No files are written.

## Skipping Validation

**Not recommended**, but you can bypass lint with CI/CD flags:

```bash
ansible-craft new role "nginx" --no-interactive --force
```

Note: YAML syntax validation cannot be skipped - invalid YAML will always fail.

## Troubleshooting

### "ansible-lint not found"

Install it:
```bash
pip install ansible-lint
```

### "YAML parsing failed"

The AI occasionally generates invalid YAML. Try:
1. Run again - results vary
2. Simplify your description
3. Report persistent issues

### "Too many lint errors"

Complex descriptions may produce code with many warnings:
1. Use `--fix` to auto-fix what's possible
2. Review remaining warnings manually
3. Consider breaking into smaller roles

## Related

- **[new role Command](commands/new-role.md)**
- **[new playbook Command](commands/new-playbook.md)**
- **[Troubleshooting](troubleshooting.md)**
- **[Architecture: Validation Pipeline](../architecture/validation-pipeline.md)**
