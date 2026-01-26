# API Reference

Programmatic usage of ansible-craft CLI.

## Overview

ansible-craft can be used programmatically in several ways:

1. **Command-line Integration** - Call CLI from scripts
2. **JSON Output** - Machine-readable output for automation
3. **Exit Codes** - Scriptable error handling
4. **CI/CD Integration** - Automated pipelines

## Command-Line Integration

### Basic Usage

```bash
#!/bin/bash

# Generate a role
ansible-craft new role "nginx web server" --output ./roles

# Check exit code
if [ $? -eq 0 ]; then
  echo "Role generated successfully"
else
  echo "Failed to generate role"
  exit 1
fi
```

### With JSON Output

```bash
#!/bin/bash

# Generate and capture JSON
result=$(ansible-craft new role "nginx" --json --quiet)

# Parse with jq
success=$(echo "$result" | jq -r '.success')
role_name=$(echo "$result" | jq -r '.name')

if [ "$success" = "true" ]; then
  echo "Generated role: $role_name"
else
  error=$(echo "$result" | jq -r '.error.message')
  echo "Error: $error"
  exit 1
fi
```

## JSON Output Format

### Enable JSON Output

```bash
ansible-craft new role "nginx" --json --quiet
```

**Important**: Always use `--quiet` with `--json` to suppress progress output.

### Success Response

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "role",
  "name": "nginx",
  "output_dir": "/absolute/path/to/nginx",
  "files": [
    {
      "path": "tasks/main.yml",
      "size": 1234
    },
    {
      "path": "handlers/main.yml",
      "size": 567
    },
    {
      "path": "defaults/main.yml",
      "size": 890
    },
    {
      "path": "templates/nginx.conf.j2",
      "size": 2345
    },
    {
      "path": "meta/main.yml",
      "size": 456
    },
    {
      "path": "README.md",
      "size": 1789
    }
  ],
  "validation": {
    "yaml_syntax": "passed",
    "fqcn_compliance": "passed",
    "idempotency": "passed",
    "lint": {
      "status": "passed",
      "warnings": 0,
      "errors": 0
    }
  },
  "warnings": [],
  "metadata": {
    "command": "ansible-craft new role \"nginx\"",
    "model": "sonnet",
    "duration_ms": 5432,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response

```json
{
  "format_version": "1.0",
  "success": false,
  "error": {
    "code": "API_ERROR",
    "message": "Authentication failed: Invalid API key",
    "details": {
      "suggestion": "Check your API key in ~/.config/ansible-craft/config.toml"
    }
  },
  "metadata": {
    "command": "ansible-craft new role \"nginx\"",
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### Validation Errors Response

```json
{
  "format_version": "1.0",
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Generated code failed validation",
    "details": {
      "yaml_syntax": {
        "status": "failed",
        "errors": [
          {
            "file": "tasks/main.yml",
            "line": 15,
            "message": "mapping values are not allowed here"
          }
        ]
      }
    }
  }
}
```

## Exit Codes

See [Exit Codes Reference](exit-codes.md) for complete list.

### Common Exit Codes

| Code | Meaning | Example |
|------|---------|---------|
| 0 | Success | Role generated successfully |
| 1 | General error | Unexpected failure |
| 2 | Configuration error | API key not set |
| 3 | API error | Authentication failed |
| 4 | Validation error | YAML syntax error |
| 5 | User cancelled | User rejected plan preview |

### Using Exit Codes

```bash
#!/bin/bash

ansible-craft new role "nginx"
exit_code=$?

case $exit_code in
  0)
    echo "Success"
    ;;
  2)
    echo "Configuration error - check API key"
    exit 2
    ;;
  3)
    echo "API error - check network and credits"
    exit 3
    ;;
  4)
    echo "Validation error - see output for details"
    exit 4
    ;;
  *)
    echo "Unknown error: $exit_code"
    exit 1
    ;;
esac
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate Ansible Role

on:
  workflow_dispatch:
    inputs:
      description:
        description: 'Role description'
        required: true

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Generate role
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          npx ansible-craft new role "${{ github.event.inputs.description }}" \
            --output ./roles \
            --no-interactive \
            --fix \
            --quiet \
            --json > result.json

      - name: Check result
        run: |
          success=$(jq -r '.success' result.json)
          if [ "$success" != "true" ]; then
            jq '.error' result.json
            exit 1
          fi

      - name: Commit generated role
        run: |
          role_name=$(jq -r '.name' result.json)
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add "roles/$role_name"
          git commit -m "feat: generate $role_name role"
          git push
```

### GitLab CI

```yaml
generate-role:
  image: node:18
  script:
    - npx ansible-craft new role "$ROLE_DESCRIPTION"
        --output ./roles
        --no-interactive
        --fix
        --quiet
        --json > result.json
    - |
      if [ "$(jq -r '.success' result.json)" != "true" ]; then
        jq '.error' result.json
        exit 1
      fi
    - role_name=$(jq -r '.name' result.json)
    - git add "roles/$role_name"
    - git commit -m "feat: generate $role_name role"
    - git push
  only:
    - main
```

### Jenkins

```groovy
pipeline {
  agent any
  environment {
    ANTHROPIC_API_KEY = credentials('anthropic-api-key')
  }
  stages {
    stage('Generate Role') {
      steps {
        sh '''
          npx ansible-craft new role "${ROLE_DESCRIPTION}" \
            --output ./roles \
            --no-interactive \
            --fix \
            --quiet \
            --json > result.json
        '''
        script {
          def result = readJSON file: 'result.json'
          if (!result.success) {
            error("Failed to generate role: ${result.error.message}")
          }
        }
      }
    }
  }
}
```

## Programmatic Usage (Node.js)

### Direct Import (Not Officially Supported)

While ansible-craft is primarily a CLI tool, you can import modules directly:

```typescript
// ⚠️ Internal API - may change without notice
import { generateRole } from 'ansible-craft/dist/generation/generate-role.js'

const result = await generateRole('nginx web server', {
  output: './roles',
  fix: true,
  interactive: false
})

if (result.success) {
  console.log('Generated role:', result.name)
} else {
  console.error('Error:', result.error)
}
```

**Note**: Internal APIs are not stable. Use CLI with JSON output instead.

## Configuration

### Programmatic Configuration

```bash
# Set API key programmatically
export ANTHROPIC_API_KEY=sk-ant-api03-...

# Or create config file
mkdir -p ~/.config/ansible-craft
cat > ~/.config/ansible-craft/config.toml << EOF
[api]
key = "sk-ant-api03-..."

[defaults]
model = "sonnet"
EOF
```

### Configuration Schema

See [Configuration Schema](configuration-schema.md) for complete reference.

## See Also

- **[JSON Schemas](json-schemas.md)** - Detailed output formats
- **[Exit Codes](exit-codes.md)** - Complete exit code reference
- **[Configuration Schema](configuration-schema.md)** - Config file structure
- **[CI/CD Integration Examples](../examples/use-cases/ci-cd-integration.md)** - More examples
