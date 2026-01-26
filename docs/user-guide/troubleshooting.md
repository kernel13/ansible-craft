# Troubleshooting Guide

Common issues and solutions when using ansible-craft.

## API & Authentication Issues

### Error: "API key not configured"

**Symptom:**
```
Error: API key not configured. Run 'ansible-craft config save' or set ANTHROPIC_API_KEY environment variable.
```

**Solution:**
1. Configure API key interactively:
   ```bash
   ansible-craft config save
   ```

2. Or set environment variable:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

3. Or pass API key directly:
   ```bash
   ansible-craft config save --api-key sk-ant-api03-... -y
   ```

### Error: "Invalid API key"

**Symptom:**
```
Error: Authentication failed: Invalid API key
```

**Causes:**
- API key is incorrect or expired
- API key format is wrong
- Billing issue with Anthropic account

**Solution:**
1. Verify your API key at [console.anthropic.com](https://console.anthropic.com)
2. Check for typos (keys start with `sk-ant-api03-`)
3. Ensure your Anthropic account has available credits
4. Reconfigure with correct key:
   ```bash
   ansible-craft config save --api-key <correct-key> -y
   ```

### Error: "Rate limit exceeded"

**Symptom:**
```
Error: Rate limit exceeded. Please try again in X seconds.
```

**Solution:**
- Wait for the specified time
- Check your Anthropic usage limits
- Upgrade your Anthropic plan if needed

## Generation Issues

### Error: "Failed to generate plan"

**Symptom:**
```
Error: Failed to generate plan preview
```

**Causes:**
- Description is too vague or ambiguous
- Network connectivity issues
- API service temporarily unavailable

**Solution:**
1. Make description more specific:
   ```bash
   # Too vague
   ansible-craft new role "webserver"

   # Better
   ansible-craft new role "nginx reverse proxy with SSL and gzip compression"
   ```

2. Check network connectivity:
   ```bash
   curl https://api.anthropic.com
   ```

3. Retry with `--complex` flag for better results:
   ```bash
   ansible-craft new role "your description" --complex
   ```

### Generated Code Has Lint Errors

**Symptom:**
```
✗ ansible-lint found 5 errors
```

**Solution:**
1. Auto-fix common issues:
   ```bash
   ansible-craft new role "nginx" --fix
   ```

2. Review and manually fix remaining issues
3. Run ansible-lint directly:
   ```bash
   ansible-lint roles/nginx/
   ```

### Role Directory Already Exists

**Symptom:**
```
Error: Directory 'nginx' already exists
```

**Solution:**
1. Use a different name:
   ```bash
   ansible-craft new role "nginx setup" -n nginx_v2
   ```

2. Use a different output directory:
   ```bash
   ansible-craft new role "nginx" -o ./roles_backup/
   ```

3. Force overwrite (⚠️ destructive):
   ```bash
   ansible-craft new role "nginx" --force
   ```

## Validation Issues

### Error: "YAML syntax error"

**Symptom:**
```
✗ YAML syntax error in tasks/main.yml:15
  mapping values are not allowed here
```

**Causes:**
- Invalid YAML indentation
- Missing colons or quotes
- Special characters not escaped

**Solution:**
1. Use `--fix` flag to auto-correct:
   ```bash
   ansible-craft new role "description" --fix
   ```

2. Manually check YAML syntax:
   ```bash
   yamllint roles/nginx/tasks/main.yml
   ```

3. Regenerate with more specific description

### Error: "Module not using FQCN"

**Symptom:**
```
✗ Use FQCN for module 'apt' (should be 'ansible.builtin.apt')
```

**Solution:**
- This should not occur with ansible-craft generated code
- If it does, use `--fix` flag or report as bug
- Manually update to FQCN format:
  ```yaml
  # Before
  - name: Install nginx
    apt:
      name: nginx

  # After
  - name: Install nginx
    ansible.builtin.apt:
      name: nginx
  ```

### Error: "Idempotency issues detected"

**Symptom:**
```
⚠ Task may not be idempotent: using shell module without creates/removes
```

**Solution:**
1. Add idempotency checks:
   ```yaml
   - name: Run script
     ansible.builtin.shell: /path/to/script.sh
     args:
       creates: /path/to/marker_file
   ```

2. Or use `changed_when`:
   ```yaml
   - name: Check status
     ansible.builtin.shell: some-command
     register: result
     changed_when: false
   ```

## CLI Issues

### Command Not Found

**Symptom:**
```bash
ansible-craft: command not found
```

**Solution:**
1. If using global install, ensure npm global bin is in PATH:
   ```bash
   npm config get prefix
   # Add <prefix>/bin to your PATH
   ```

2. Or use without installing:
   ```bash
   npx ansible-craft new role "nginx"
   ```

3. Reinstall:
   ```bash
   npm install -g ansible-craft
   ```

### Wrong Node.js Version

**Symptom:**
```
Error: ansible-craft requires Node.js 18 or higher
```

**Solution:**
1. Check Node.js version:
   ```bash
   node --version
   ```

2. Upgrade Node.js:
   ```bash
   # Using nvm
   nvm install 18
   nvm use 18

   # Or download from nodejs.org
   ```

### Permission Denied

**Symptom:**
```
Error: EACCES: permission denied, mkdir '/path/to/role'
```

**Solution:**
1. Check directory permissions:
   ```bash
   ls -la ./
   ```

2. Use a directory you have write access to:
   ```bash
   ansible-craft new role "nginx" -o ~/ansible/roles/
   ```

3. Or fix permissions:
   ```bash
   chmod u+w ./
   ```

## Output & File Issues

### No Output Directory Created

**Symptom:**
- Command completes but no files written
- Using `--dry-run` flag unintentionally

**Solution:**
1. Remove `--dry-run` flag:
   ```bash
   ansible-craft new role "nginx"  # Not --dry-run
   ```

2. Check output directory:
   ```bash
   ls -la ./nginx/
   ```

### Files Not in Expected Location

**Symptom:**
- Files created in unexpected directory

**Solution:**
1. Specify output directory explicitly:
   ```bash
   ansible-craft new role "nginx" -o /path/to/roles/
   ```

2. Check current working directory:
   ```bash
   pwd
   ansible-craft new role "nginx"
   ```

## Performance Issues

### Generation Takes Too Long

**Symptom:**
- Command hangs or takes more than 2 minutes

**Causes:**
- Complex description requiring deep analysis
- Network latency
- API rate limiting

**Solution:**
1. Simplify description:
   ```bash
   # Too complex
   ansible-craft new role "complete infrastructure with web, db, cache, monitoring, logging, and security"

   # Better - break into multiple roles
   ansible-craft new role "nginx web server with SSL"
   ansible-craft new role "PostgreSQL database with replication"
   ```

2. Check network:
   ```bash
   ping api.anthropic.com
   ```

3. Use sonnet model instead of opus (faster):
   ```bash
   ansible-craft config save --model sonnet -y
   ```

### High API Costs

**Symptom:**
- Anthropic API costs higher than expected

**Solution:**
1. Use sonnet model (cheaper) instead of opus:
   ```bash
   ansible-craft config save --model sonnet -y
   ```

2. Avoid `--complex` flag unless necessary
3. Be specific in descriptions to reduce API calls
4. Use `--dry-run` to preview before committing:
   ```bash
   ansible-craft new role "nginx" --dry-run
   ```

## Integration Issues

### ansible-lint Not Found

**Symptom:**
```
⚠ ansible-lint not found, skipping lint checks
```

**Solution:**
1. Install ansible-lint:
   ```bash
   pip install ansible-lint
   ```

2. Verify installation:
   ```bash
   ansible-lint --version
   ```

3. Ensure it's in PATH:
   ```bash
   which ansible-lint
   ```

### JSON Output Malformed

**Symptom:**
- Using `--json` flag but output is not valid JSON

**Causes:**
- Mixed with progress output
- Not suppressing progress with `--quiet`

**Solution:**
```bash
# Wrong
ansible-craft new role "nginx" --json

# Correct
ansible-craft new role "nginx" --json --quiet > output.json
```

## Debug Mode

### Enable Verbose Logging

For debugging purposes:

```bash
# Set debug environment variable
export DEBUG=ansible-craft:*

# Run command
ansible-craft new role "nginx"
```

This shows:
- API requests/responses
- Validation steps
- File operations
- Error details

## Common Workarounds

### Bypass Clarifying Questions

```bash
# Use --no-interactive flag for CI/CD
ansible-craft new role "nginx" --no-interactive
```

### Skip Validation

Not recommended, but possible:

```bash
# Generate without validation (not available yet, but planned)
ansible-craft new role "nginx" --no-validate
```

### Force Regeneration

```bash
# Overwrite existing directory
ansible-craft new role "nginx" --force
```

## Getting More Help

### Check Logs

Configuration and logs location:
```bash
# Config file
cat ~/.config/ansible-craft/config.toml

# Check for error logs (if logging implemented)
ls -la ~/.config/ansible-craft/logs/
```

### Report Issues

If none of these solutions work:

1. **GitHub Issues**: https://github.com/ansible-craft/ansible-craft/issues
2. **Include**:
   - ansible-craft version: `ansible-craft --version`
   - Node.js version: `node --version`
   - Operating system
   - Full error message
   - Command that failed
   - Steps to reproduce

3. **Minimal reproduction**:
   ```bash
   # Example bug report
   # ansible-craft version: 1.0.0
   # Node.js version: v18.19.0
   # OS: Ubuntu 22.04

   # Command:
   ansible-craft new role "nginx" --fix

   # Error:
   # [paste full error here]
   ```

## FAQ

**Q: Can I use ansible-craft offline?**
A: No, ansible-craft requires internet connection to access the Anthropic API.

**Q: Does ansible-craft work on Windows?**
A: Yes, ansible-craft works on Windows, macOS, and Linux.

**Q: Can I customize the generated code?**
A: Yes, generated code is yours to modify. Use `explain` command to understand it first.

**Q: Is my API key stored securely?**
A: Yes, it's stored in `~/.config/ansible-craft/config.toml` with restricted permissions (600).

**Q: Can I use my own prompts?**
A: Not currently, but custom prompts are planned for future releases.

## Still Stuck?

- **Documentation**: [User Guide](README.md)
- **Examples**: [Examples](../examples/README.md)
- **Architecture**: [System Design](../architecture/README.md)
- **Discussions**: https://github.com/ansible-craft/ansible-craft/discussions
