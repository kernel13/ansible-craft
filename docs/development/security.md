# Security Guide

Security considerations and best practices for ansible-craft development.

## Overview

ansible-craft handles sensitive data (API keys) and generates code that may run on production systems. Security is a priority.

## API Key Handling

### Storage

API keys can be stored in:
1. Environment variable (recommended)
2. Config file (`~/.config/ansible-craft/config.toml`)

### Environment Variable (Preferred)

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

Benefits:
- Not persisted to disk
- Not committed to version control
- Standard practice for secrets

### Config File Security

If using config file:

```bash
# Set restrictive permissions
chmod 600 ~/.config/ansible-craft/config.toml

# Verify
ls -la ~/.config/ansible-craft/config.toml
# Should show: -rw-------
```

### Never in Code

API keys must never appear in:
- Source code
- Test files
- Documentation
- Commit history

```typescript
// BAD - Never do this
const apiKey = 'sk-ant-api03-actual-key';

// GOOD - Use environment/config
const apiKey = process.env.ANTHROPIC_API_KEY || getConfigKey();
```

### CI/CD Secrets

In CI/CD pipelines:
- Use GitHub Secrets, GitLab CI Variables, etc.
- Never echo/print API keys
- Use secret masking

```yaml
# GitHub Actions example
env:
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Generated Code Security

### Avoid Dangerous Patterns

The generator should never produce:

```yaml
# BAD - Dangerous patterns
- name: Delete everything
  ansible.builtin.shell: rm -rf /

- name: Insecure permissions
  ansible.builtin.file:
    path: /etc/passwd
    mode: '0777'

- name: Hardcoded credentials
  ansible.builtin.user:
    name: admin
    password: 'plaintext-password'
```

### Validation Rules

Built-in validators check for:
- Dangerous shell commands
- Insecure file permissions
- Hardcoded secrets
- Non-idempotent patterns

### Secrets in Generated Code

Generated code should use:
- Ansible Vault for sensitive data
- Variable references, not values

```yaml
# GOOD - Reference to vaulted variable
- name: Set database password
  ansible.builtin.lineinfile:
    path: /etc/app/config.yml
    regexp: '^db_password:'
    line: "db_password: {{ vault_db_password }}"
```

## Input Validation

### User Input

All user input is treated as untrusted:

```typescript
// Validate description
function validateDescription(description: string): void {
  if (!description || description.trim().length === 0) {
    throw new ValidationError('Description is required');
  }

  if (description.length > 10000) {
    throw new ValidationError('Description too long');
  }

  // Check for injection attempts
  if (containsSuspiciousPatterns(description)) {
    throw new ValidationError('Invalid characters in description');
  }
}
```

### Path Validation

File paths are validated to prevent traversal:

```typescript
function validatePath(path: string, baseDir: string): string {
  const resolved = resolve(baseDir, path);

  // Ensure path stays within base directory
  if (!resolved.startsWith(baseDir)) {
    throw new SecurityError('Path traversal detected');
  }

  return resolved;
}
```

## Dependencies

### Audit Dependencies

```bash
# Check for vulnerabilities
bun audit

# Or use npm
npm audit
```

### Keep Updated

```bash
# Check for updates
bunx npm-check-updates

# Update dependencies
bun update
```

### Minimal Dependencies

- Prefer built-in functionality
- Evaluate new dependencies carefully
- Check maintenance status and security history

## Error Handling

### Don't Expose Internals

Error messages should not reveal:
- Internal file paths
- Stack traces (in production)
- System information
- API implementation details

```typescript
// BAD - Exposes internals
catch (error) {
  console.error('Error at /home/user/secret/path:', error.stack);
}

// GOOD - User-friendly message
catch (error) {
  console.error('An error occurred. Run with DEBUG=1 for details.');
  if (process.env.DEBUG) {
    console.error(error);
  }
}
```

### Log Safely

Don't log sensitive data:

```typescript
// BAD - Logs API key
console.log('Using key:', apiKey);

// GOOD - Mask sensitive data
console.log('Using key:', apiKey.slice(0, 10) + '...');
```

## Secure Defaults

### File Permissions

Generated files use secure defaults:

```typescript
// When writing files
await writeFile(path, content, { mode: 0o644 });

// Directories
await mkdir(path, { recursive: true, mode: 0o755 });
```

### No Execution

Generated code is never automatically executed:

```typescript
// We write files, never execute them
await writeFile('tasks/main.yml', content);

// User must explicitly run ansible-playbook
```

## Network Security

### HTTPS Only

All API calls use HTTPS:

```typescript
const client = new Anthropic({
  // SDK enforces HTTPS
  baseURL: 'https://api.anthropic.com'
});
```

### No Sensitive Data in URLs

Query parameters may be logged:

```typescript
// BAD - Key in URL
fetch(`https://api.example.com?key=${apiKey}`);

// GOOD - Key in header
fetch('https://api.example.com', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
```

## Development Security

### Don't Commit Secrets

`.gitignore` excludes sensitive files:

```
# .gitignore
.env
.env.local
*.pem
*.key
config.toml
```

### Pre-commit Checks

Consider using git hooks to prevent secret commits:

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for potential API keys
if git diff --cached | grep -E 'sk-ant-api|api[_-]?key\s*='; then
  echo "Potential API key detected in commit!"
  exit 1
fi
```

### Test with Mocks

Tests should not use real API keys:

```typescript
// Use mocks in tests
mock.module('../config', () => ({
  getApiKey: () => 'mock-key-for-testing'
}));
```

## Security Reporting

### Reporting Vulnerabilities

To report security issues:
1. Do NOT create a public GitHub issue
2. Email security@ansible-craft.example.com
3. Include detailed reproduction steps
4. Allow time for fix before disclosure

### Security Updates

Security updates are released as:
- Patch versions (x.x.PATCH)
- Announced via GitHub Security Advisories
- Documented in CHANGELOG.md

## Checklist for Contributors

Before submitting code:

- [ ] No hardcoded secrets or API keys
- [ ] User input is validated
- [ ] File paths are validated (no traversal)
- [ ] Error messages don't expose internals
- [ ] Generated code follows security best practices
- [ ] Dependencies are from trusted sources
- [ ] Tests don't use real API keys

## Related

- **[Development Setup](setup.md)** - Environment setup
- **[Contributing](contributing.md)** - Contribution guidelines
- **[SECURITY.md](../../SECURITY.md)** - Security policy
