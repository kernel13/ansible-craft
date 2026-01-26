# Contributing Guide

Guide to contributing to ansible-craft.

## Overview

We welcome contributions! This guide covers the process for contributing code, documentation, and bug reports.

For detailed contribution guidelines, see [CONTRIBUTING.md](../../CONTRIBUTING.md) in the project root.

## Getting Started

### 1. Fork the Repository

Fork [ansible-craft](https://github.com/ansible-craft/ansible-craft) on GitHub.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/ansible-craft.git
cd ansible-craft
```

### 3. Set Up Development Environment

```bash
bun install
```

See [Development Setup](setup.md) for detailed instructions.

### 4. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

## Development Workflow

### 1. Make Changes

- Follow the [Code Style](code-style.md) guidelines
- Write tests for new functionality
- Update documentation as needed

### 2. Run Tests

```bash
# Run all tests
bun test

# Run with coverage
bun test --coverage

# Run specific tests
bun test src/ai/
```

### 3. Lint Code

```bash
# Check for issues
bun run lint

# Fix auto-fixable issues
bun run format
```

### 4. Test Locally

```bash
# Test CLI commands
bun run dev new role "nginx"
bun run dev explain ./path/to/role
```

## Commit Guidelines

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Code style (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding/updating tests |
| `chore` | Build, dependencies, etc. |

### Scope

Optional scope indicates the affected area:

- `cli` - CLI commands
- `ai` - AI integration
- `generation` - Code generation
- `wizard` - Interactive wizards
- `docs` - Documentation
- `cc` - Claude Code integration

### Examples

```
feat(cli): add --quick flag for wizard bypass

fix(generation): handle empty template files

docs: update installation instructions

test(wizard): add tests for role wizard defaults

chore(deps): update anthropic-sdk to 0.32.0
```

## Pull Request Process

### 1. Update Your Branch

```bash
git fetch upstream
git rebase upstream/main
```

### 2. Push Changes

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

On GitHub:
1. Click "New Pull Request"
2. Select your branch
3. Fill in the PR template

### PR Template

```markdown
## Summary
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Refactoring

## Testing
How to test these changes

## Checklist
- [ ] Tests pass
- [ ] Lint passes
- [ ] Documentation updated
- [ ] Commit messages follow convention
```

### 4. Review Process

- Maintainers will review your PR
- Address any feedback
- Once approved, a maintainer will merge

## Code Review Guidelines

### For Contributors

- Keep PRs focused and small
- Respond to feedback constructively
- Update PR based on review comments

### For Reviewers

- Be respectful and constructive
- Explain the "why" behind suggestions
- Approve when changes are satisfactory

## Bug Reports

### Before Reporting

1. Check existing [issues](https://github.com/ansible-craft/ansible-craft/issues)
2. Verify you're on the latest version

### Creating a Report

Use the bug report template:

```markdown
**Describe the bug**
Clear description of what happened

**To Reproduce**
1. Run command '...'
2. With input '...'
3. See error

**Expected behavior**
What should have happened

**Environment**
- OS: macOS 14.0
- Node: 20.10.0
- Bun: 1.0.0
- ansible-craft: 0.1.0

**Additional context**
Error logs, screenshots, etc.
```

## Feature Requests

### Before Requesting

1. Check existing [issues](https://github.com/ansible-craft/ansible-craft/issues) and [discussions](https://github.com/ansible-craft/ansible-craft/discussions)
2. Consider if it fits the project scope

### Creating a Request

```markdown
**Is this related to a problem?**
Description of the problem

**Describe the solution**
What you'd like to see

**Alternatives considered**
Other solutions you've thought about

**Additional context**
Examples, mockups, etc.
```

## Documentation Contributions

### Types of Docs

- **User Guide** - How to use features
- **API Reference** - Technical specifications
- **Architecture** - System design
- **Development** - Contributor docs

### Documentation Style

- Clear, concise language
- Code examples where helpful
- Tables for reference information
- Links to related documentation

### Building Docs

```bash
# Preview locally (if using doc framework)
bun run docs:dev

# Check for broken links
bun run docs:check
```

## Areas for Contribution

### Good First Issues

Look for issues labeled `good first issue`:
- Documentation improvements
- Error message enhancements
- Test coverage improvements

### Help Wanted

Issues labeled `help wanted` need community help:
- New features
- Complex bug fixes
- Performance improvements

### Always Welcome

- Bug fixes with tests
- Documentation improvements
- Test coverage increases
- Accessibility improvements

## Community

### Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/).

Be:
- Respectful
- Inclusive
- Constructive
- Professional

### Getting Help

- **Issues** - Bug reports and features
- **Discussions** - Questions and ideas
- **Discord** - Real-time chat (if available)

## Related

- **[Development Setup](setup.md)** - Environment setup
- **[Testing Guide](testing.md)** - Writing tests
- **[Code Style](code-style.md)** - Code conventions
- **[CONTRIBUTING.md](../../CONTRIBUTING.md)** - Full guidelines
