# Testing Guide

Guide to running and writing tests for ansible-craft.

## Overview

ansible-craft uses Bun's built-in test runner for unit and integration testing.

## Running Tests

### All Tests

```bash
bun test
```

### Watch Mode

```bash
bun test --watch
```

### With Coverage

```bash
bun test --coverage
```

### Specific Directory

```bash
bun test src/ai/
bun test src/cli/
bun test src/generation/
```

### Specific File

```bash
bun test src/ai/client.test.ts
bun test src/wizard/role-wizard.test.ts
```

### Filter by Name

```bash
bun test --grep "should create client"
```

### Verbose Output

```bash
bun test --reporter=verbose
```

## Test Structure

### File Location

Test files are placed adjacent to the source files:

```
src/
├── ai/
│   ├── client.ts
│   ├── client.test.ts       # Tests for client.ts
│   ├── stream.ts
│   └── stream.test.ts       # Tests for stream.ts
├── wizard/
│   ├── role-wizard.ts
│   └── role-wizard.test.ts
```

### Test File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`

### Basic Test Structure

```typescript
import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';

describe('MyModule', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('myFunction', () => {
    test('should do something', () => {
      const result = myFunction('input');
      expect(result).toBe('expected');
    });

    test('should handle edge case', () => {
      expect(() => myFunction(null)).toThrow();
    });
  });
});
```

## Test Utilities

### Location

Test utilities are in `src/__test-utils__/`:

```
src/__test-utils__/
├── fixtures.ts         # API response fixtures
├── fixtures/           # File-based fixtures
│   ├── explain/
│   └── generation/
├── mocks/
│   ├── filesystem.ts   # File system mocks
│   └── prompts.ts      # Inquirer mocks
```

### API Fixtures

```typescript
// src/__test-utils__/fixtures.ts
export const MOCK_MESSAGE_RESPONSE = {
  id: 'msg_123',
  type: 'message',
  role: 'assistant',
  content: [{ type: 'text', text: 'Mock response' }],
  model: 'claude-sonnet-4-5-20250929',
  stop_reason: 'end_turn',
  usage: { input_tokens: 10, output_tokens: 20 }
};

export const MOCK_PLAN = {
  name: 'nginx',
  description: 'Nginx web server',
  tasks: [
    { name: 'Install nginx', module: 'ansible.builtin.apt' }
  ],
  variables: [],
  handlers: []
};
```

### Using Fixtures

```typescript
import { MOCK_MESSAGE_RESPONSE, MOCK_PLAN } from '../__test-utils__/fixtures';

describe('Generator', () => {
  test('should parse plan', () => {
    const result = parsePlan(JSON.stringify(MOCK_PLAN));
    expect(result.name).toBe('nginx');
  });
});
```

## Mocking

### Mocking Modules

```typescript
import { mock } from 'bun:test';

// Mock the entire module
mock.module('../config', () => ({
  getApiKey: () => 'test-key',
  getConfig: () => ({ model: 'sonnet' })
}));
```

### Mocking Functions

```typescript
import { mock, spyOn } from 'bun:test';

test('should call API', () => {
  const mockCreate = mock(() => MOCK_MESSAGE_RESPONSE);

  // Spy on method
  const spy = spyOn(client.messages, 'create').mockImplementation(mockCreate);

  await generatePlan('nginx');

  expect(spy).toHaveBeenCalled();
  expect(spy).toHaveBeenCalledWith(expect.objectContaining({
    model: 'claude-sonnet-4-5-20250929'
  }));
});
```

### Mocking File System

```typescript
import { mockFs } from '../__test-utils__/mocks/filesystem';

test('should read file', async () => {
  const fs = mockFs({
    '/path/to/role/tasks/main.yml': '- name: Install nginx'
  });

  const content = await fs.readFile('/path/to/role/tasks/main.yml');
  expect(content).toContain('Install nginx');
});
```

### Mocking Prompts

```typescript
import { mockPrompt } from '../__test-utils__/mocks/prompts';

test('should handle wizard input', async () => {
  const prompt = mockPrompt({
    platforms: ['ubuntu'],
    ansibleVersion: '2.14',
    requirePrivilege: true
  });

  const result = await runWizard(prompt);
  expect(result.platforms).toContain('ubuntu');
});
```

## Testing Patterns

### Testing Async Functions

```typescript
test('should generate plan', async () => {
  const result = await generatePlan('nginx');
  expect(result.name).toBe('nginx');
});

test('should reject on error', async () => {
  await expect(generatePlan('')).rejects.toThrow('Description required');
});
```

### Testing Streams

```typescript
test('should stream response', async () => {
  const chunks: string[] = [];

  for await (const chunk of streamMessage(client, params)) {
    chunks.push(chunk);
  }

  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks.join('')).toContain('expected content');
});
```

### Testing Error Handling

```typescript
test('should transform API errors', () => {
  const apiError = new Anthropic.AuthenticationError('Invalid key');
  const userError = transformApiError(apiError);

  expect(userError.code).toBe('API_AUTH_ERROR');
  expect(userError.message).toContain('API key');
});
```

### Testing CLI Commands

```typescript
import { program } from '../cli/program';

test('should parse new role command', () => {
  const args = ['new', 'role', 'nginx with SSL', '-n', 'nginx'];
  program.parse(['node', 'cli', ...args]);

  // Check parsed options
  const cmd = program.commands.find(c => c.name() === 'new');
  // ...
});
```

## Test Coverage

### Running Coverage

```bash
bun test --coverage
```

### Coverage Output

```
----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
All files |   85.4  |    78.2  |   90.1  |   85.4  |
 ai/      |   92.1  |    85.0  |   95.0  |   92.1  |
 cli/     |   78.5  |    72.0  |   85.0  |   78.5  |
----------|---------|----------|---------|---------|
```

### Coverage Goals

| Metric | Target |
|--------|--------|
| Lines | 80%+ |
| Branches | 75%+ |
| Functions | 85%+ |

## Integration Tests

### API Integration

```typescript
// src/ai/client.integration.test.ts
import { describe, test, expect } from 'bun:test';

describe('API Integration', () => {
  test.skipIf(!process.env.ANTHROPIC_API_KEY)('should make API call', async () => {
    const client = createClient();
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Say hi' }]
    });

    expect(response.content[0].text).toBeTruthy();
  });
});
```

### File System Integration

```typescript
describe('File Writing', () => {
  const tempDir = '/tmp/ansible-craft-test';

  beforeEach(async () => {
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true });
  });

  test('should write role files', async () => {
    await writeRole(tempDir, mockRole);

    const tasksFile = await fs.readFile(`${tempDir}/tasks/main.yml`);
    expect(tasksFile).toBeTruthy();
  });
});
```

## CI/CD Testing

### GitHub Actions

Tests run automatically on:
- Push to main
- Pull requests

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun test --coverage
```

### Local CI Simulation

```bash
# Run same checks as CI
bun run lint
bun test --coverage
bun run build
```

## Best Practices

### Test Isolation

- Each test should be independent
- Use `beforeEach`/`afterEach` for setup/cleanup
- Don't rely on test execution order

### Descriptive Names

```typescript
// Good
test('should return error when API key is missing', ...)

// Bad
test('test1', ...)
test('should work', ...)
```

### Test One Thing

```typescript
// Good - one assertion per concept
test('should validate plan name', () => {
  expect(plan.name).toBe('nginx');
});

test('should include required tasks', () => {
  expect(plan.tasks).toContainEqual(
    expect.objectContaining({ name: 'Install nginx' })
  );
});

// Bad - too many concerns
test('should generate valid plan', () => {
  expect(plan.name).toBe('nginx');
  expect(plan.tasks.length).toBeGreaterThan(0);
  expect(plan.variables).toBeDefined();
  // ...20 more assertions
});
```

### Avoid Implementation Details

```typescript
// Good - test behavior
test('should generate role with tasks', async () => {
  const role = await generateRole('nginx');
  expect(role.files).toContainEqual(
    expect.objectContaining({ path: 'tasks/main.yml' })
  );
});

// Bad - test implementation
test('should call _internalParser', async () => {
  const spy = spyOn(generator, '_internalParser');
  await generateRole('nginx');
  expect(spy).toHaveBeenCalled();
});
```

## Related

- **[Development Setup](setup.md)** - Environment setup
- **[Code Style](code-style.md)** - Code conventions
- **[Contributing](contributing.md)** - Contribution workflow
