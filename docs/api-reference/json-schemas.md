# JSON Schemas

JSON output schemas for ansible-craft CLI automation and CI/CD integration.

## Overview

When using `--json` flag, ansible-craft outputs structured JSON that can be parsed by automation tools.

## Output Envelope

All JSON responses follow a common envelope structure:

```json
{
  "format_version": "1.0",
  "success": boolean,
  "type": "role" | "playbook" | "explain" | "fix",
  ...
}
```

## Generation Response

Used by `new role` and `new playbook` commands.

### Success Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "format_version": {
      "type": "string",
      "const": "1.0"
    },
    "success": {
      "type": "boolean",
      "const": true
    },
    "type": {
      "type": "string",
      "enum": ["role", "playbook"]
    },
    "name": {
      "type": "string",
      "description": "Generated role/playbook name"
    },
    "output_dir": {
      "type": "string",
      "description": "Absolute path to output directory"
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "Relative path from output_dir"
          },
          "size": {
            "type": "integer",
            "description": "File size in bytes"
          }
        },
        "required": ["path", "size"]
      }
    },
    "warnings": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "type": {
            "type": "string",
            "enum": ["fqcn", "idempotency", "lint"]
          },
          "message": {
            "type": "string"
          },
          "file": {
            "type": "string"
          },
          "line": {
            "type": "integer"
          }
        },
        "required": ["type", "message"]
      }
    },
    "metadata": {
      "type": "object",
      "properties": {
        "command": {
          "type": "string",
          "description": "Full command that was executed"
        },
        "duration_ms": {
          "type": "integer",
          "description": "Total execution time in milliseconds"
        },
        "timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "ISO 8601 timestamp"
        },
        "model": {
          "type": "string",
          "description": "AI model used"
        }
      },
      "required": ["command", "duration_ms", "timestamp"]
    }
  },
  "required": ["format_version", "success", "type", "name", "output_dir", "files", "warnings", "metadata"]
}
```

### Success Example

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "role",
  "name": "nginx",
  "output_dir": "/home/user/projects/nginx",
  "files": [
    {"path": "tasks/main.yml", "size": 2345},
    {"path": "handlers/main.yml", "size": 456},
    {"path": "defaults/main.yml", "size": 789},
    {"path": "templates/nginx.conf.j2", "size": 1234},
    {"path": "meta/main.yml", "size": 345},
    {"path": "README.md", "size": 678}
  ],
  "warnings": [
    {
      "type": "lint",
      "message": "Task name should be sentence case",
      "file": "tasks/main.yml",
      "line": 15
    }
  ],
  "metadata": {
    "command": "ansible-craft new role \"nginx with SSL\"",
    "duration_ms": 5432,
    "timestamp": "2024-01-15T10:30:00.000Z",
    "model": "claude-sonnet-4-5-20250929"
  }
}
```

### Error Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "format_version": {
      "type": "string",
      "const": "1.0"
    },
    "success": {
      "type": "boolean",
      "const": false
    },
    "error": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string",
          "description": "Error code for programmatic handling"
        },
        "message": {
          "type": "string",
          "description": "Human-readable error message"
        },
        "details": {
          "type": "object",
          "description": "Additional error context"
        }
      },
      "required": ["code", "message"]
    }
  },
  "required": ["format_version", "success", "error"]
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `API_AUTH_ERROR` | Invalid or missing API key |
| `API_RATE_LIMIT` | Rate limit exceeded |
| `API_ERROR` | Generic API error |
| `VALIDATION_ERROR` | Generated code failed validation |
| `FILE_EXISTS` | Output directory exists (without --force) |
| `WRITE_ERROR` | Failed to write files |
| `USER_CANCELLED` | User cancelled operation |
| `CONFIG_ERROR` | Configuration error |

### Error Example

```json
{
  "format_version": "1.0",
  "success": false,
  "error": {
    "code": "API_AUTH_ERROR",
    "message": "Authentication failed. Check your API key.",
    "details": {
      "suggestion": "Run: ansible-craft config save"
    }
  }
}
```

---

## Explain Response

Used by `explain` command.

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "format_version": {
      "type": "string",
      "const": "1.0"
    },
    "success": {
      "type": "boolean",
      "const": true
    },
    "type": {
      "type": "string",
      "const": "explain"
    },
    "path": {
      "type": "string",
      "description": "Path that was explained"
    },
    "explanation": {
      "type": "string",
      "description": "Plain text explanation"
    },
    "confidence": {
      "type": "string",
      "enum": ["high", "medium", "low"],
      "description": "Overall confidence level"
    },
    "metadata": {
      "type": "object",
      "properties": {
        "command": {"type": "string"},
        "duration_ms": {"type": "integer"},
        "timestamp": {"type": "string", "format": "date-time"}
      }
    }
  },
  "required": ["format_version", "success", "type", "path", "explanation", "confidence", "metadata"]
}
```

### Example

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "explain",
  "path": "./roles/nginx/",
  "explanation": "This role installs and configures Nginx web server...",
  "confidence": "high",
  "metadata": {
    "command": "ansible-craft explain ./roles/nginx/",
    "duration_ms": 2345,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Fix Response

Used by `fix` command.

### Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "format_version": {
      "type": "string",
      "const": "1.0"
    },
    "success": {
      "type": "boolean",
      "const": true
    },
    "type": {
      "type": "string",
      "const": "fix"
    },
    "error_analysis": {
      "type": "object",
      "properties": {
        "category": {
          "type": "string",
          "enum": ["syntax", "variable", "module", "connection", "permission", "template", "other"]
        },
        "explanation": {
          "type": "string"
        },
        "causes": {
          "type": "array",
          "items": {"type": "string"}
        }
      },
      "required": ["category", "explanation", "causes"]
    },
    "suggestion": {
      "type": "object",
      "properties": {
        "description": {
          "type": "string"
        },
        "file": {
          "type": "string"
        },
        "line": {
          "type": "integer"
        },
        "fix": {
          "type": "string",
          "description": "The actual fix to apply"
        },
        "applied": {
          "type": "boolean",
          "description": "Whether fix was applied"
        }
      },
      "required": ["description"]
    },
    "metadata": {
      "type": "object",
      "properties": {
        "command": {"type": "string"},
        "duration_ms": {"type": "integer"},
        "timestamp": {"type": "string", "format": "date-time"}
      }
    }
  },
  "required": ["format_version", "success", "type", "error_analysis", "suggestion", "metadata"]
}
```

### Example

```json
{
  "format_version": "1.0",
  "success": true,
  "type": "fix",
  "error_analysis": {
    "category": "module",
    "explanation": "The module 'apt' couldn't be resolved because FQCN is required.",
    "causes": [
      "Module name should use FQCN: ansible.builtin.apt",
      "Running on Ansible 2.10+ which requires FQCN"
    ]
  },
  "suggestion": {
    "description": "Change 'apt' to 'ansible.builtin.apt'",
    "file": "tasks/main.yml",
    "line": 15,
    "fix": "ansible.builtin.apt:",
    "applied": true
  },
  "metadata": {
    "command": "ansible-craft fix \"module not found\" --apply",
    "duration_ms": 1234,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Plan Preview Schema

Internal schema used for plan previews (not exposed via CLI JSON output).

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "description": {
      "type": "string"
    },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "module": {"type": "string"},
          "description": {"type": "string"}
        },
        "required": ["name", "module"]
      }
    },
    "variables": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "default": {},
          "description": {"type": "string"}
        },
        "required": ["name"]
      }
    },
    "handlers": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "description": {"type": "string"}
        },
        "required": ["name"]
      }
    },
    "templates": {
      "type": "array",
      "items": {"type": "string"}
    }
  },
  "required": ["name", "tasks"]
}
```

---

## Using JSON Output

### Shell Scripts

```bash
#!/bin/bash

result=$(ansible-craft new role "nginx" --json)

if echo "$result" | jq -e '.success' > /dev/null; then
  echo "Generated: $(echo "$result" | jq -r '.name')"
  echo "Files: $(echo "$result" | jq '.files | length')"
else
  echo "Error: $(echo "$result" | jq -r '.error.message')"
  exit 1
fi
```

### Node.js

```typescript
import { execSync } from 'child_process';

interface GenerationResult {
  format_version: string;
  success: boolean;
  type: 'role' | 'playbook';
  name: string;
  output_dir: string;
  files: Array<{ path: string; size: number }>;
  warnings: Array<{ type: string; message: string }>;
  error?: { code: string; message: string };
}

const output = execSync('ansible-craft new role "nginx" --json').toString();
const result: GenerationResult = JSON.parse(output);

if (result.success) {
  console.log(`Generated ${result.files.length} files to ${result.output_dir}`);
} else {
  console.error(`Error: ${result.error?.message}`);
}
```

### Python

```python
import subprocess
import json

result = subprocess.run(
    ['ansible-craft', 'new', 'role', 'nginx', '--json'],
    capture_output=True,
    text=True
)

data = json.loads(result.stdout)

if data['success']:
    print(f"Generated: {data['name']}")
    for f in data['files']:
        print(f"  - {f['path']} ({f['size']} bytes)")
else:
    print(f"Error: {data['error']['message']}")
```

---

## Version Compatibility

| format_version | ansible-craft version |
|----------------|----------------------|
| 1.0 | 0.1.0+ |

The `format_version` field allows clients to handle schema changes gracefully.
