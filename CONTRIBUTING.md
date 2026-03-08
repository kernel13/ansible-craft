# Contributing to ansible-craft

Thank you for your interest in contributing to ansible-craft!

## Ways to Contribute

- **Improve skills** - Enhance slash command workflows in `skills/`
- **Add references** - Expand shared Ansible knowledge in `references/`
- **Report bugs** - Open a [GitHub Issue](https://github.com/ansible-craft/ansible-craft/issues)
- **Suggest features** - Start a [GitHub Discussion](https://github.com/ansible-craft/ansible-craft/discussions)

## Development Setup

```bash
git clone https://github.com/ansible-craft/ansible-craft.git
cd ansible-craft
bun install
```

### Install skills locally for testing

```bash
node scripts/install-skills.mjs --force
```

## File Structure

- **Skills**: `skills/{name}.md` - becomes `/ac:{name}` slash command
- **References**: `references/{topic}.md` - shared knowledge documents
- **Scripts**: `scripts/install-skills.mjs` - installation script

### Skill format

Skills use YAML frontmatter followed by markdown instructions:

```yaml
---
name: ac:new-skill
description: What this skill does
allowed-tools:
  - Task
  - Read
---
```

## Code Quality

```bash
bun run lint          # Check with Biome
bun run format        # Format with Biome
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(skills): add database role generation skill
fix(skills): improve FQCN validation in role generator
docs(references): add PostgreSQL patterns to patterns.md
```

## Pull Request Process

1. Create a branch from `main`
2. Make focused changes
3. Run `bun run lint`
4. Open a PR with a clear description
5. Respond to review feedback
