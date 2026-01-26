# Exit Codes

Complete reference for ansible-craft CLI exit codes.

## Overview

Exit codes allow scripts and CI/CD systems to determine the outcome of ansible-craft commands.

## Exit Code Reference

| Code | Name | Description |
|------|------|-------------|
| 0 | SUCCESS | Command completed successfully |
| 1 | ERROR | General error occurred |
| 2 | USER_CANCELLED | User cancelled the operation |

## Detailed Descriptions

### 0 - SUCCESS

The command completed successfully.

**Conditions:**
- Role/playbook generated and written to disk
- Explain command completed
- Fix command completed (even if no fix available)
- Config saved successfully
- Setup completed successfully

**Example:**
```bash
ansible-craft new role "nginx"
echo $?  # 0
```

### 1 - ERROR

An error occurred that prevented completion.

**Conditions:**
- API authentication failed
- API rate limit exceeded
- API connection error
- Invalid input or arguments
- YAML syntax error in generated code
- File system error (can't write)
- Configuration error (missing API key)
- Validation errors (when blocking)

**Examples:**

```bash
# Missing API key
ansible-craft new role "nginx"
# Error: API key not configured
echo $?  # 1

# Invalid description
ansible-craft new role ""
# Error: Description is required
echo $?  # 1

# Directory exists (without --force)
ansible-craft new role "nginx"
# Error: Directory 'nginx' already exists
echo $?  # 1
```

### 2 - USER_CANCELLED

The user explicitly cancelled the operation.

**Conditions:**
- User rejected the plan preview
- User answered "No" to overwrite prompt
- User pressed Ctrl+C during execution
- User declined to apply fix

**Examples:**

```bash
# User rejects plan
ansible-craft new role "nginx"
# [Plan preview shown]
# ? Accept this plan? Reject
echo $?  # 2

# User cancels with Ctrl+C
ansible-craft new role "nginx"
# ^C
echo $?  # 2
```

## CI/CD Integration

### GitHub Actions

```yaml
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - name: Generate role
        run: |
          ansible-craft new role "${{ inputs.description }}" \
            --no-interactive \
            --fix \
            --json > result.json
        continue-on-error: true

      - name: Check result
        run: |
          if [ $? -eq 0 ]; then
            echo "Generation successful"
          elif [ $? -eq 1 ]; then
            echo "Generation failed"
            exit 1
          elif [ $? -eq 2 ]; then
            echo "Generation cancelled"
            exit 0
          fi
```

### GitLab CI

```yaml
generate:
  script:
    - ansible-craft new role "$DESCRIPTION" --no-interactive --fix --json
  allow_failure: false
```

### Shell Scripts

```bash
#!/bin/bash
set -e

ansible-craft new role "$1" --no-interactive --fix --json > result.json
exit_code=$?

case $exit_code in
  0)
    echo "Success"
    ;;
  1)
    echo "Error occurred"
    cat result.json | jq '.error'
    exit 1
    ;;
  2)
    echo "Cancelled by user"
    exit 0
    ;;
esac
```

### Makefile

```makefile
.PHONY: generate-role
generate-role:
	@ansible-craft new role "$(DESCRIPTION)" --no-interactive --fix; \
	exit_code=$$?; \
	if [ $$exit_code -eq 0 ]; then \
		echo "Role generated successfully"; \
	elif [ $$exit_code -eq 1 ]; then \
		echo "Generation failed"; \
		exit 1; \
	elif [ $$exit_code -eq 2 ]; then \
		echo "Generation cancelled"; \
	fi
```

## Error Handling Patterns

### Retry on Transient Errors

```bash
#!/bin/bash

MAX_RETRIES=3
RETRY_DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
  ansible-craft new role "$1" --no-interactive --fix
  exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo "Success"
    exit 0
  elif [ $exit_code -eq 2 ]; then
    echo "Cancelled"
    exit 0
  else
    echo "Attempt $i failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

echo "All retries exhausted"
exit 1
```

### Conditional Processing

```bash
#!/bin/bash

# Generate role
ansible-craft new role "nginx" --json > result.json
exit_code=$?

# Process based on exit code
if [ $exit_code -eq 0 ]; then
  # Success - run tests
  cd nginx
  molecule test
elif [ $exit_code -eq 2 ]; then
  # Cancelled - clean up
  rm -f result.json
else
  # Error - report
  cat result.json | jq '.error'
  exit 1
fi
```

## Combining with JSON Output

For detailed error information, combine exit codes with JSON output:

```bash
#!/bin/bash

output=$(ansible-craft new role "nginx" --json 2>&1)
exit_code=$?

case $exit_code in
  0)
    echo "$output" | jq '.files[] | .path'
    ;;
  1)
    error_code=$(echo "$output" | jq -r '.error.code')
    error_msg=$(echo "$output" | jq -r '.error.message')
    echo "Error [$error_code]: $error_msg"
    ;;
  2)
    echo "User cancelled"
    ;;
esac
```

## Signal Handling

When ansible-craft receives signals:

| Signal | Exit Code | Behavior |
|--------|-----------|----------|
| SIGINT (Ctrl+C) | 2 | Clean shutdown |
| SIGTERM | 2 | Clean shutdown |
| SIGKILL | 137 | Forced termination |

## Related

- **[CLI API](cli-api.md)** - Complete CLI reference
- **[JSON Schemas](json-schemas.md)** - JSON output format
- **[CI/CD Integration](../examples/use-cases/ci-cd-integration.md)** - CI/CD examples
