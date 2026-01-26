# Debugging Guide

Guide to debugging ansible-craft during development.

## Debug Environment

### Enable Debug Mode

```bash
# Set DEBUG environment variable
DEBUG=1 bun run dev new role "nginx"
```

### Debug Output

Debug mode enables:
- Verbose API request/response logging
- Timing information
- Internal state dumps

## Debugging Techniques

### Console Logging

Add temporary logging:

```typescript
console.log('[DEBUG] Variable:', JSON.stringify(variable, null, 2));
console.log('[DEBUG] Function called with:', args);
```

### Bun Debugger

Use Bun's built-in debugger:

```bash
# Start with inspector
bun --inspect run src/cli/index.ts new role "nginx"

# Then connect Chrome DevTools
# Open: chrome://inspect
```

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/src/cli/index.ts",
      "args": ["new", "role", "nginx with SSL"],
      "cwd": "${workspaceFolder}",
      "env": {
        "DEBUG": "1"
      }
    },
    {
      "name": "Debug Tests",
      "type": "bun",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/bun",
      "args": ["test", "${file}"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

## Common Issues

### API Errors

#### "API key not configured"

```bash
# Check environment variable
echo $ANTHROPIC_API_KEY

# Check config file
cat ~/.config/ansible-craft/config.toml

# Re-configure
bun run dev config save
```

#### "Rate limit exceeded"

```bash
# Wait and retry, or check usage
# API rate limits reset after ~1 minute
```

#### "Authentication failed"

```bash
# Verify key format (should start with sk-ant-)
echo $ANTHROPIC_API_KEY | head -c 10

# Test key directly
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

### Generation Issues

#### Invalid YAML Output

Debug the raw API response:

```typescript
// In generation code, temporarily add:
console.log('[DEBUG] Raw response:', response.content[0].text);
```

Common causes:
- Model included markdown code fences
- Model added explanatory text
- Response was truncated

#### Missing Files

Check the writer output:

```bash
DEBUG=1 bun run dev new role "nginx"
# Look for "[DEBUG] Writing file:" messages
```

### Test Failures

#### Mock Not Working

```typescript
// Ensure mock is set up before import
import { mock } from 'bun:test';

// Must be before the import that uses the mocked module
mock.module('../config', () => ({
  getApiKey: () => 'test-key'
}));

// Now import the module under test
import { createClient } from './client';
```

#### Async Test Timeout

```typescript
// Increase timeout for slow tests
test('slow test', async () => {
  // ...
}, 30000); // 30 second timeout
```

### Build Issues

#### TypeScript Errors

```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
bun install

# Check specific error
bunx tsc --noEmit
```

#### Module Resolution

```bash
# Verify tsconfig paths
cat tsconfig.json | grep paths

# Check import is correct
# Should use relative or configured alias
```

## Debugging Workflow

### 1. Reproduce the Issue

```bash
# Get exact command that fails
bun run dev new role "description that causes issue"
```

### 2. Enable Debug Mode

```bash
DEBUG=1 bun run dev new role "description"
```

### 3. Isolate the Problem

```bash
# Run specific tests
bun test src/generation/generate-role.test.ts

# Test specific function
bun run -e "import { fn } from './src/module'; console.log(fn())"
```

### 4. Add Targeted Logging

```typescript
// Add logging around suspected area
console.log('[DEBUG] Before:', state);
const result = suspectFunction();
console.log('[DEBUG] After:', result);
```

### 5. Check Dependencies

```bash
# Verify versions
bun pm ls

# Check for updates
bunx npm-check-updates
```

## Logging Utilities

### Create Debug Logger

```typescript
// src/utils/debug.ts

const DEBUG = process.env.DEBUG === '1';

export function debug(context: string, ...args: unknown[]): void {
  if (DEBUG) {
    console.log(`[DEBUG ${context}]`, ...args);
  }
}

export function debugTime(label: string): () => void {
  if (!DEBUG) return () => {};

  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    console.log(`[DEBUG TIMING] ${label}: ${duration.toFixed(2)}ms`);
  };
}

// Usage
import { debug, debugTime } from './utils/debug';

const endTiming = debugTime('API call');
const response = await client.messages.create(params);
endTiming();

debug('generation', 'Plan:', plan);
```

### Structured Logging

```typescript
// src/utils/logger.ts

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  context: string;
  message: string;
  data?: unknown;
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const fullEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString()
  };

  if (process.env.DEBUG === '1') {
    console.log(JSON.stringify(fullEntry));
  } else if (entry.level !== 'debug') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.message}`);
  }
}
```

## Network Debugging

### Capture API Requests

```bash
# Use mitmproxy or Charles Proxy
# Set HTTP_PROXY and HTTPS_PROXY
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

bun run dev new role "nginx"
```

### Log Raw Responses

```typescript
// Temporarily modify client
const response = await client.messages.create(params);
console.log('[DEBUG] Response:', JSON.stringify(response, null, 2));
```

## Memory Debugging

### Check Memory Usage

```typescript
console.log('[DEBUG] Memory:', process.memoryUsage());
```

### Profile Memory

```bash
# Run with heap snapshot
bun --inspect-brk run src/cli/index.ts new role "nginx"
# Take heap snapshot in Chrome DevTools
```

## Performance Debugging

### Time Operations

```typescript
console.time('operation');
await someOperation();
console.timeEnd('operation');
```

### Profile Execution

```bash
# Generate CPU profile
bun --cpu-prof run src/cli/index.ts new role "nginx"
# Analyze with Chrome DevTools
```

## Tips

### Keep Debug Code Separate

Don't commit debug logging. Use feature flags:

```typescript
if (process.env.DEBUG) {
  console.log('Debug info');
}
```

### Use Breakpoints

Breakpoints are more powerful than console.log:
- Inspect full state
- Step through execution
- Evaluate expressions

### Check Recent Changes

```bash
# What changed recently?
git log --oneline -10
git diff HEAD~3
```

### Isolate with Minimal Reproduction

Create a minimal script that reproduces the issue:

```typescript
// debug-script.ts
import { functionUnderTest } from './src/module';

const result = functionUnderTest('minimal input');
console.log(result);
```

```bash
bun run debug-script.ts
```

## Related

- **[Development Setup](setup.md)** - Environment setup
- **[Testing Guide](testing.md)** - Writing tests
- **[Troubleshooting](../user-guide/troubleshooting.md)** - User-facing issues
