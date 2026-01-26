# fix Command

Interpret Ansible error messages and get suggested fixes.

## Synopsis

```bash
ansible-craft fix "<error>" [options]
```

## Description

The `fix` command analyzes Ansible error messages and provides:

- Plain English explanation of what went wrong
- Specific suggestions to fix the issue
- Optional auto-apply of fixes to files

## Arguments

| Argument | Description |
|----------|-------------|
| `<error>` | The error message to analyze (quote the entire message) |

## Options

| Option | Description |
|--------|-------------|
| `--playbook <path>` | Provide context from a playbook or role |
| `--complex` | Use Claude Opus for deeper analysis (higher cost) |
| `--apply` | Apply the suggested fix without confirmation |
| `-q, --quiet` | Suppress progress output |

## Examples

### Basic Error Analysis

```bash
ansible-craft fix "FAILED! => {'msg': 'The task includes an option with an undefined variable'}"
```

Output:
```
Error Analysis: Undefined Variable

The task is trying to use a variable that hasn't been defined.

Likely causes:
1. Variable not defined in defaults/main.yml or vars/main.yml
2. Typo in variable name
3. Variable should come from inventory but host not in group
4. Missing include_vars or set_fact

Suggested fix:
1. Check if the variable is defined in defaults/main.yml
2. Verify the variable name spelling matches usage
3. Add a default value: {{ my_var | default('fallback') }}
```

### With Context

Providing context helps identify the exact issue:

```bash
ansible-craft fix "ERROR! couldn't resolve module/action 'apt'" --playbook site.yml
```

Output:
```
Error Analysis: Module Not Found

The module 'apt' couldn't be resolved.

Analysis of site.yml shows this task:
  - name: Install packages
    apt:
      name: nginx

Likely causes:
1. Module name should use FQCN: ansible.builtin.apt
2. Running on a non-Debian system where apt isn't available

Suggested fix:
Change the task to use FQCN:
  - name: Install packages
    ansible.builtin.apt:
      name: nginx

File: site.yml
Line: 15
```

### Auto-Apply Fix

When confident about the fix, apply it automatically:

```bash
ansible-craft fix "ERROR! couldn't resolve module/action 'apt'" \
  --playbook site.yml \
  --apply
```

Output:
```
Error Analysis: Module Not Found
...

Applying fix to site.yml...
✓ Changed 'apt' to 'ansible.builtin.apt' at line 15
✓ File saved
```

### Complex Errors

For cryptic or multi-part errors:

```bash
ansible-craft fix "fatal: [webserver]: FAILED! => {'changed': false, 'msg': 'Unable to start service nginx: Job for nginx.service failed because the control process exited with error code.'}" --complex
```

Output:
```
Error Analysis: Service Start Failure

The nginx service failed to start. This is typically a configuration
error, not an Ansible issue.

Possible causes:
1. Invalid nginx.conf syntax
2. Port 80/443 already in use
3. Missing SSL certificates referenced in config
4. Incorrect file permissions

Debugging steps:
1. SSH to the server and run: sudo nginx -t
2. Check journal: journalctl -xeu nginx.service
3. Verify ports: sudo ss -tlnp | grep ':80\|:443'

If this is a configuration error, check your template:
- templates/nginx.conf.j2 for syntax errors
- Ensure all referenced files exist (SSL certs, includes)
```

## Error Categories

The fix command recognizes common error patterns:

### Syntax Errors

```
ERROR! Syntax Error while loading YAML
```

- YAML parsing failures
- Indentation issues
- Invalid characters

### Variable Errors

```
The task includes an option with an undefined variable
```

- Undefined variables
- Typos in variable names
- Missing default values

### Module Errors

```
couldn't resolve module/action
```

- Module not found
- FQCN required
- Collection not installed

### Connection Errors

```
Failed to connect to the host
```

- SSH failures
- Authentication issues
- Network problems

### Permission Errors

```
Permission denied
```

- Missing sudo/become
- File permission issues
- SELinux/AppArmor blocks

### Template Errors

```
AnsibleUndefinedVariable in template
```

- Undefined template variables
- Jinja2 syntax errors
- Filter issues

## Fix Application

When `--apply` is used, the command can:

**What it can fix:**
- FQCN conversions (`apt` → `ansible.builtin.apt`)
- Simple syntax fixes
- Missing quotes
- Boolean values (`yes` → `true`)

**What it cannot fix:**
- Logic errors
- Missing files
- Server-side issues
- Complex refactoring

### Confirmation Prompt

Without `--apply`, you're prompted:

```
Suggested fix ready to apply:
  File: tasks/main.yml
  Line 15: Change 'apt' to 'ansible.builtin.apt'

? Apply this fix? (y/N)
```

## Tips

### Quote the Entire Error

Always quote the full error message:

```bash
# Good - full error preserved
ansible-craft fix "FAILED! => {'msg': 'The task includes an option with an undefined variable. The error was: 'nginx_port' is undefined'}"

# Bad - error truncated
ansible-craft fix "undefined variable"
```

### Provide Context

Context dramatically improves suggestions:

```bash
# Better - knows the exact code
ansible-craft fix "error message" --playbook site.yml

# Less helpful - guesses at the code
ansible-craft fix "error message"
```

### Copy Errors Directly

Copy the exact error from your terminal. Ansible errors often contain important context in the full message.

### For Recurring Errors

If you see the same error pattern often:
1. Use `--complex` for a deeper analysis
2. Look for root cause in your workflow
3. Consider adding to your templates/defaults

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (fix suggested or applied) |
| 1 | Error (couldn't analyze or apply) |

## Related

- **[explain Command](explain.md)** - Understand existing code
- **[Validation Guide](../validation.md)** - Prevent errors
- **[Troubleshooting](../troubleshooting.md)** - Common issues
