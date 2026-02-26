# Contributing to ansible-craft

Thank you for your interest in contributing to ansible-craft!

## Ways to Contribute

- **Improve skills** - Enhance slash command workflows in `cc/skills/ac/`
- **Improve agents** - Refine agent prompts and behavior in `cc/agents/`
- **Add references** - Expand shared Ansible knowledge in `cc/common/references/`
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
node cc/scripts/install-skills.mjs --force
```

## File Structure

- **Skills**: `cc/skills/ac/{name}.md` - becomes `/ac:{name}` command
- **Agents**: `cc/agents/ac-{name}.md` - becomes `ac-{name}` subagent_type
- **References**: `cc/common/references/{topic}.md` - shared knowledge documents

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

### Agent format

Agents use YAML frontmatter followed by markdown instructions:

```yaml
---
name: ac-new-agent
description: What this agent does
tools: Read, Write, Grep, Glob
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
fix(agents): improve FQCN validation in ac-validator
docs(references): add PostgreSQL patterns to patterns.md
```

## Pull Request Process

1. Create a branch from `main`
2. Make focused changes
3. Run `bun run lint`
4. Open a PR with a clear description
5. Respond to review feedback
