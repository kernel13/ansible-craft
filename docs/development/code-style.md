# Code Style Guide

Code conventions and style guidelines for ansible-craft.

## Overview

ansible-craft uses [Biome](https://biomejs.dev/) for formatting and linting. This ensures consistent code style across the codebase.

## Running Linter

```bash
# Check for issues
bun run lint

# Auto-fix issues
bun run format
```

## TypeScript Guidelines

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Source files | `kebab-case.ts` | `role-wizard.ts` |
| Test files | `*.test.ts` | `role-wizard.test.ts` |
| Type files | `types.ts` | `types.ts` |
| Index files | `index.ts` | `index.ts` |

### Variable Naming

| Type | Convention | Example |
|------|------------|---------|
| Variables | `camelCase` | `apiKey`, `maxRetries` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_TIMEOUT`, `MAX_TOKENS` |
| Functions | `camelCase` | `createClient`, `parseYaml` |
| Classes | `PascalCase` | `RoleGenerator`, `ValidationError` |
| Interfaces | `PascalCase` | `GenerationOptions`, `Plan` |
| Type aliases | `PascalCase` | `WizardContext`, `Platform` |
| Enums | `PascalCase` | `ErrorCode`, `ModelType` |

### Imports

Order imports as follows:

```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External packages
import Anthropic from '@anthropic-ai/sdk';
import { Command } from 'commander';

// 3. Internal modules (absolute)
import { createClient } from '@/ai/client';
import { ValidationError } from '@/errors';

// 4. Relative imports
import { parseYaml } from './parser';
import type { Plan } from './types';
```

### Type Annotations

```typescript
// Explicit return types for exported functions
export function createClient(): Anthropic {
  // ...
}

// Explicit parameter types
function parseConfig(content: string): Config {
  // ...
}

// Use type inference for local variables
const client = createClient(); // Type inferred

// Prefer interfaces for objects
interface GenerationOptions {
  name: string;
  output: string;
  dryRun: boolean;
}

// Use type for unions/intersections
type Platform = 'ubuntu' | 'debian' | 'el' | 'all';
type Result = Success | Failure;
```

### Async/Await

```typescript
// Prefer async/await over promises
async function generatePlan(description: string): Promise<Plan> {
  const response = await client.messages.create(params);
  return parsePlan(response);
}

// Use Promise.all for parallel operations
const [core, tasks, templates] = await Promise.all([
  generateCore(plan),
  generateTasks(plan),
  generateTemplates(plan)
]);
```

### Error Handling

```typescript
// Use custom error classes
export class ValidationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Throw typed errors
function validatePlan(plan: unknown): Plan {
  if (!isValidPlan(plan)) {
    throw new ValidationError('Invalid plan', 'INVALID_PLAN', { plan });
  }
  return plan;
}

// Handle errors appropriately
try {
  const result = await generateRole(description);
} catch (error) {
  if (error instanceof ValidationError) {
    displayValidationError(error);
  } else if (error instanceof Anthropic.APIError) {
    displayApiError(error);
  } else {
    throw error; // Re-throw unknown errors
  }
}
```

## Code Formatting

### Indentation

- 2 spaces (not tabs)
- Biome enforces this automatically

### Line Length

- Maximum 100 characters
- Biome will warn on longer lines

### Semicolons

- Always use semicolons
- Biome enforces this

### Quotes

- Single quotes for strings
- Template literals for interpolation

```typescript
const name = 'nginx';
const message = `Role: ${name}`;
```

### Trailing Commas

- Always use trailing commas in multi-line structures

```typescript
const options = {
  name: 'nginx',
  output: './roles',
  dryRun: false,
};

const platforms = [
  'ubuntu',
  'debian',
  'el',
];
```

### Object Shorthand

```typescript
// Use shorthand when property name matches variable
const name = 'nginx';
const version = '2.14';

// Good
const role = { name, version };

// Avoid
const role = { name: name, version: version };
```

## Documentation

### JSDoc Comments

Use JSDoc for exported functions:

```typescript
/**
 * Creates a configured Anthropic client.
 *
 * @param options - Optional client configuration
 * @returns Configured Anthropic client instance
 * @throws {ConfigError} If API key is not configured
 *
 * @example
 * ```typescript
 * const client = createClient();
 * const response = await client.messages.create(params);
 * ```
 */
export function createClient(options?: ClientOptions): Anthropic {
  // ...
}
```

### Inline Comments

- Use sparingly, only when code isn't self-explanatory
- Explain "why", not "what"

```typescript
// Good - explains why
// Using exponential backoff to handle rate limits gracefully
const delay = baseDelay * Math.pow(2, attempt);

// Bad - explains what (obvious from code)
// Multiply base delay by 2 raised to attempt
const delay = baseDelay * Math.pow(2, attempt);
```

## Project-Specific Patterns

### Error Transformation

```typescript
// Transform API errors to user-friendly errors
export function transformApiError(error: unknown): UserError {
  if (error instanceof Anthropic.AuthenticationError) {
    return new UserError(
      'Authentication failed. Check your API key.',
      'API_AUTH_ERROR'
    );
  }
  // ...
}
```

### Option Objects

```typescript
// Use option objects for multiple parameters
interface GenerationOptions {
  name?: string;
  output?: string;
  dryRun?: boolean;
  force?: boolean;
}

function generateRole(description: string, options: GenerationOptions = {}): Promise<Role> {
  const { name, output = '.', dryRun = false, force = false } = options;
  // ...
}
```

### Factory Functions

```typescript
// Use factory functions for complex object creation
export function createPhaseTracker(options: TrackerOptions): PhaseTracker {
  return {
    start: (phase) => { /* ... */ },
    complete: (phase) => { /* ... */ },
    fail: (phase, error) => { /* ... */ }
  };
}
```

## Biome Configuration

Configuration in `biome.json`:

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingCommas": "all",
      "semicolons": "always"
    }
  }
}
```

## Pre-Commit Checks

Before committing:

```bash
# Format code
bun run format

# Check linting
bun run lint

# Run tests
bun test
```

## Related

- **[Development Setup](setup.md)** - Environment setup
- **[Testing Guide](testing.md)** - Writing tests
- **[Contributing](contributing.md)** - Contribution workflow
