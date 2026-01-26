# Development Guide

Guide for contributors and developers working on ansible-craft.

## Getting Started

### Prerequisites

- **Bun** 1.0 or higher
- **Node.js** 18 or higher (for compatibility testing)
- **Git**
- **Anthropic API Key** for testing

### Development Setup

```bash
# Clone repository
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft

# Install dependencies
bun install

# Setup environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run in development mode
bun run dev

# Run tests
bun test

# Run linter
bun run lint

# Format code
bun run format
```

## Project Structure

```
src/
├── cli/                    # CLI implementation
│   ├── program.ts         # Main Commander.js program
│   ├── commands/          # Individual commands
│   ├── output.ts          # Progress tracking
│   └── preview.ts         # Dry-run and lint display
├── ai/                    # Anthropic SDK integration
│   ├── client.ts          # Client creation
│   ├── stream.ts          # Streaming handling
│   ├── retry.ts           # Retry logic
│   ├── errors.ts          # Error transformation
│   └── models.ts          # Model selection
├── generation/            # Generation system
│   ├── generate-role.ts   # Role generation
│   ├── generate-playbook.ts  # Playbook generation
│   ├── prompts/           # System prompts
│   ├── schemas/           # JSON schemas
│   ├── role/              # Role-specific logic
│   ├── playbook/          # Playbook-specific logic
│   ├── validation/        # Validation pipeline
│   └── writer.ts          # File operations
├── config/                # Configuration management
│   ├── paths.ts           # Config file locations
│   ├── reader.ts          # Config reading
│   ├── writer.ts          # Config writing
│   └── defaults.ts        # Default values
├── explain/               # Explanation system
│   ├── file-reader.ts     # File/role reading
│   ├── context-extractor.ts  # Context extraction
│   └── confidence-detector.ts  # Low-confidence detection
└── __test-utils__/        # Test utilities
    ├── fixtures.ts        # Test fixtures
    └── mocks/             # Mock implementations
```

## Development Workflow

### 1. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

Follow [Code Style](code-style.md) guidelines.

### 3. Write Tests

See [Testing Guide](testing.md).

```bash
# Run tests
bun test

# Run specific test
bun test src/ai/client.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### 4. Run Linter

```bash
bun run lint

# Fix auto-fixable issues
bun run lint --apply
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add feature description"
```

Follow [Conventional Commits](https://www.conventionalcommits.org/).

### 6. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Common Development Tasks

### Adding a New Command

See [Adding Commands](adding-commands.md) for detailed guide.

Quick overview:
1. Create `src/cli/commands/mycommand.ts`
2. Implement command logic
3. Register in `src/cli/program.ts`
4. Add tests in `src/cli/commands/mycommand.test.ts`
5. Update documentation

### Adding a Validator

See [Adding Validators](adding-validators.md) for detailed guide.

Quick overview:
1. Create `src/generation/validation/my-validator.ts`
2. Implement validation logic
3. Integrate into validation pipeline
4. Add tests
5. Update documentation

### Extending Prompts

```typescript
// src/generation/prompts/my-prompt.ts
export function buildMyPrompt(input: string): string {
  return `
Your system prompt here...

User input: ${input}
  `.trim()
}
```

## Testing

### Test Structure

```typescript
// src/example.test.ts
import { describe, test, expect } from 'bun:test'

describe('MyFeature', () => {
  test('should do something', () => {
    const result = doSomething()
    expect(result).toBe(expected)
  })

  test('should handle errors', () => {
    expect(() => doSomethingBad()).toThrow()
  })
})
```

### Mocking Anthropic API

```typescript
import { mockAnthropicClient } from './__test-utils__/mocks/anthropic'

test('should generate role', async () => {
  const mockClient = mockAnthropicClient({
    response: mockRoleResponse
  })

  const result = await generateRole('nginx', { client: mockClient })
  expect(result.files).toHaveLength(7)
})
```

### Test Fixtures

```typescript
// src/__test-utils__/fixtures.ts
export const mockPlanPreview = {
  name: 'nginx',
  description: 'Nginx web server',
  tasks: [/* ... */],
  variables: [/* ... */]
}
```

## Code Style

See [Code Style Guide](code-style.md) for complete details.

### Key Principles

- **TypeScript**: Strict mode enabled
- **Formatting**: Biome formatter
- **Linting**: Biome linter
- **Imports**: Organize imports alphabetically
- **Naming**: camelCase for functions, PascalCase for types

### Example

```typescript
// Good
export async function generateRole(
  description: string,
  options: GenerateOptions
): Promise<RoleStructure> {
  // Implementation
}

// Bad
export async function GenerateRole(desc, opts) {
  // Implementation
}
```

## Debugging

### Debug Mode

```bash
# Enable debug logging
DEBUG=ansible-craft:* bun run dev new role "nginx"
```

### VS Code Debugging

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug CLI",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "dev"],
      "args": ["new", "role", "nginx"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// Use console.error for debugging (removed in production)
console.error('Debug:', value)
```

## Performance

### Benchmarking

```bash
# Time a command
time bun run dev new role "nginx"
```

### Profiling

```bash
# Bun built-in profiler
bun --prof run dev new role "nginx"
```

## Release Process

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Commit changes: `git commit -m "chore: release v1.x.x"`
4. Tag release: `git tag v1.x.x`
5. Push: `git push && git push --tags`
6. GitHub Actions builds and publishes to npm

## Documentation

### Updating Documentation

```bash
# After code changes, update relevant docs
docs/
├── user-guide/          # User-facing documentation
├── architecture/        # System design docs
├── development/         # This guide
└── api-reference/       # API documentation
```

### Documentation Standards

- Use clear, concise language
- Include code examples
- Keep up-to-date with code changes
- Add cross-references

## Contributing Guidelines

### Code of Conduct

Be respectful, inclusive, and professional.

### Issue Guidelines

- Search existing issues first
- Use issue templates
- Provide reproduction steps
- Include environment details

### Pull Request Guidelines

- Follow code style
- Add tests for new features
- Update documentation
- Keep PRs focused and small
- Link related issues

### Review Process

1. Automated checks (tests, lint)
2. Code review by maintainer
3. Address feedback
4. Approval and merge

## Resources

- **Testing Guide**: [testing.md](testing.md)
- **Code Style**: [code-style.md](code-style.md)
- **Adding Commands**: [adding-commands.md](adding-commands.md)
- **Adding Validators**: [adding-validators.md](adding-validators.md)
- **Architecture**: [../architecture/README.md](../architecture/README.md)
- **GitHub**: https://github.com/ansible-craft/ansible-craft

## Getting Help

- **GitHub Discussions**: Ask questions and share ideas
- **GitHub Issues**: Report bugs
- **Discord**: Join our developer community (coming soon)

## License

MIT License - see [LICENSE](../../LICENSE) for details.
