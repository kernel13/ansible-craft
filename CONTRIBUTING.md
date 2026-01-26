# Contributing to ansible-craft

Thank you for your interest in contributing to ansible-craft! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Code Review](#code-review)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Ways to Contribute

### Reporting Bugs

- Check [existing issues](https://github.com/ansible-craft/ansible-craft/issues) to avoid duplicates
- Use the bug report template when creating a new issue
- Include:
  - ansible-craft version (`ansible-craft --version`)
  - Node.js version (`node --version`)
  - Operating system
  - Steps to reproduce
  - Expected vs actual behavior
  - Relevant error messages or logs

### Suggesting Features

- Open a [GitHub Discussion](https://github.com/ansible-craft/ansible-craft/discussions) first for major features
- Describe the use case and why existing functionality doesn't address it
- Consider how the feature fits with the project's goals

### Documentation

- Fix typos, clarify explanations, add examples
- Documentation lives in `docs/` and `README.md`
- No setup required - just edit markdown files

### Code Contributions

- Bug fixes
- New features (discuss first for large changes)
- Performance improvements
- Test coverage improvements

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- Node.js 18+
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft

# Install dependencies
bun install

# Verify setup
bun test
```

### Running Locally

```bash
# Run CLI in development mode
bun run dev new role "nginx with SSL"

# Run specific command
bun run src/cli/index.ts explain ./roles/nginx/
```

### Environment Variables

Create a `.env` file for local development (not committed):

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Code Style

We use [Biome](https://biomejs.dev/) for linting and formatting.

### Check Code

```bash
bun run lint
```

### Format Code

```bash
bun run format
```

### Style Guidelines

- TypeScript for all source code
- Use explicit types (avoid `any`)
- Prefer `const` over `let`
- Use descriptive variable names
- Keep functions small and focused
- Add JSDoc comments for public APIs

### File Organization

- Source code in `src/`
- Tests adjacent to source files (`*.test.ts`)
- Claude Code integration in `cc/`
- Documentation in `docs/`

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding or fixing tests
- `chore`: Maintenance tasks

### Examples

```
feat(cli): add --quick flag for wizard bypass
fix(generation): handle empty template files
docs: update installation instructions
test(wizard): add coverage for role wizard
```

### Guidelines

- Use present tense ("add feature" not "added feature")
- Use imperative mood ("move cursor" not "moves cursor")
- Keep first line under 72 characters
- Reference issues in footer: `Fixes #123`

## Pull Request Process

### Before Submitting

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make your changes** with clear, focused commits

3. **Run tests**:
   ```bash
   bun test
   ```

4. **Run linting**:
   ```bash
   bun run lint
   ```

5. **Update documentation** if needed

### Submitting

1. Push your branch:
   ```bash
   git push origin feature/my-feature
   ```

2. Open a Pull Request against `main`

3. Fill out the PR template:
   - Description of changes
   - Related issues
   - Testing performed
   - Screenshots (if UI changes)

4. Request review from maintainers

### After Submitting

- Respond to review feedback
- Make requested changes in new commits
- Once approved, a maintainer will merge

## Testing

### Running Tests

```bash
# All tests
bun test

# Watch mode
bun test --watch

# With coverage
bun test --coverage

# Specific directory
bun test src/ai/

# Specific file
bun test src/wizard/role-wizard.test.ts
```

### Writing Tests

- Place tests adjacent to source files: `foo.ts` -> `foo.test.ts`
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies (API calls, file system)
- Use fixtures from `src/__test-utils__/`

### Test Structure

```typescript
import { describe, test, expect } from 'bun:test';

describe('MyFunction', () => {
  test('returns expected value for valid input', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });

  test('throws error for invalid input', () => {
    expect(() => myFunction(null)).toThrow('Invalid input');
  });
});
```

## Code Review

### For Authors

- Keep PRs focused and reasonably sized
- Explain the "why" in PR description
- Respond to all comments
- Be open to feedback

### For Reviewers

- Be constructive and respectful
- Explain reasoning for requested changes
- Approve when satisfied, don't block on nitpicks
- Use suggestions for small changes

### What We Look For

- Correctness: Does the code do what it should?
- Tests: Are changes adequately tested?
- Style: Does code follow project conventions?
- Documentation: Are changes documented?
- Performance: Any obvious performance issues?
- Security: Any security concerns?

## Questions?

- **General questions**: [GitHub Discussions](https://github.com/ansible-craft/ansible-craft/discussions)
- **Bug reports**: [GitHub Issues](https://github.com/ansible-craft/ansible-craft/issues)

Thank you for contributing!
