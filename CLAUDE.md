# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

- Do not assume when I ask a question or a task that it is wrong or right. Always analyze based on fact.
- Do not jump into conclusion and analyze different options
- When you propose a solution make sure that you have checked the existing code
- Keep things simple, do not generate extra code and each code should be production-ready
- Verify existing code to avoid duplicate and propose refactoring if this is the case

## Project Overview

ansible-craft is a CLI tool that generates production-ready Ansible roles and playbooks from natural language descriptions using the Anthropic Claude API. It runs on Bun runtime.

## Project Structure

```
ansible-craft/
├── .claude/                    # Claude Code IDE configuration (DO NOT MOVE)
├── .planning/                  # GSD workflow planning documents
├── cc/                         # Claude Code distributable integration
│   ├── agents/                 # Agent definitions (ac-*.md)
│   ├── skills/ac/              # Slash command skills
│   ├── common/references/      # Shared reference documentation
│   └── scripts/                # Installation scripts
├── src/                        # Application source code
│   ├── ai/                     # Anthropic SDK integration
│   ├── cli/                    # Commander.js CLI
│   ├── config/                 # Configuration management
│   ├── core/                   # Agent orchestration layer
│   ├── explain/                # Code explanation features
│   ├── generation/             # Role/playbook generation
│   ├── wizard/                 # Interactive wizards
│   └── __test-utils__/         # Test utilities and fixtures
├── dist/                       # Build output
└── docs/                       # Documentation
```

## Commands

```bash
# Development
bun run dev              # Run CLI in development mode
bun run lint             # Check code with Biome
bun run format           # Format code with Biome

# Testing
bun test                 # Run all tests
bun test --watch         # Run tests in watch mode
bun test --coverage      # Run tests with coverage
bun test src/ai/         # Run tests in specific directory
bun test client.test.ts  # Run specific test file

# Build
bun run build            # Build for distribution

# CLI Usage (development)
bun run src/cli/index.ts new role "nginx with SSL"
bun run src/cli/index.ts new playbook "deploy LAMP stack"
bun run src/cli/index.ts new role "nginx" --quick       # Skip wizard, use saved defaults
bun run src/cli/index.ts explain path/to/playbook.yml
bun run src/cli/index.ts fix "error message"
bun run src/cli/index.ts config save
bun run src/cli/index.ts config defaults role           # Configure role wizard defaults
bun run src/cli/index.ts config defaults playbook       # Configure playbook wizard defaults
bun run src/cli/index.ts setup --project                # Install CC skills locally
```

## Architecture

### Source Modules (src/)

**src/ai/** - Anthropic SDK integration
- `client.ts`: Creates configured Anthropic clients with retry/timeout
- `stream.ts`: Handles streaming responses with visual feedback (spinners)
- `retry.ts`: Exponential backoff retry logic for API calls
- `errors.ts`: API error transformation and user-friendly display
- `models.ts`: Model selection (Sonnet default, Opus for `--complex`)

**src/cli/** - Commander.js CLI implementation
- `program.ts`: Main program with command registration
- `commands/`: Individual command implementations (new, explain, fix, config, setup)
- `helpers/`: Agent context creation and error handling utilities
- `output.ts`: Phase tracking with spinners and formatted output
- `preview.ts`: Dry-run previews and lint result display

**src/config/** - Configuration management
- TOML-based config stored in `~/.config/ansible-craft/config.toml`
- Handles API key storage, defaults, and setup wizard

**src/core/** - Agent orchestration layer
- `orchestrator.ts`: Coordinates multi-agent workflows
- `planner.ts`, `generator.ts`, `validator.ts`, `linter.ts`, `fixer.ts`: Specialized agents
- `writer.ts`: File writing agent
- `explainer.ts`, `debugger.ts`: Explanation and debugging agents
- `message-bus.ts`: Inter-agent communication
- `types.ts`: Shared agent types and interfaces

**src/explain/** - Code explanation and fix features
- `file-reader.ts`: Reads Ansible files/roles
- `context-extractor.ts`: Extracts context for better explanations
- `confidence-detector.ts`: Detects low-confidence responses
- `fix-applier.ts`: Applies suggested fixes to files

**src/generation/** - Role and playbook generation
- `generate-role.ts` / `generate-playbook.ts`: Two-phase orchestration (plan → code)
- `prompts/`: System prompts and prompt builders for each phase
- `schemas/`: JSON schemas for structured outputs (plan previews)
- `role/`: Role-specific parsing, sanitization, validation, structure
- `playbook/`: Playbook-specific structure and utilities
- `validation/`: YAML syntax, FQCN compliance, idempotency checks, ansible-lint integration
- `writer.ts`: File system operations for writing generated content

**src/wizard/** - Interactive configuration wizards
- `role-wizard.ts`: Interactive role configuration
- `playbook-wizard.ts`: Interactive playbook configuration
- `defaults.ts`: Default values management
- `prompts.ts`: Inquirer prompt definitions
- `types.ts`: Wizard context types

### Claude Code Integration (cc/)

The `cc/` directory contains all Claude Code distributable files that get installed to `~/.claude/`.

**cc/agents/** - Agent definitions for Task tool (`ac-*.md`)
- `ac-planner.md`: Generates structured plans from requirements
- `ac-generator.md`: Main generator (playbooks)
- `ac-generator-core.md`: Core role files (defaults, vars, handlers, meta, README)
- `ac-generator-tasks.md`: Task files (tasks/*.yml)
- `ac-generator-templates.md`: Template files (templates/*.j2)
- `ac-generator-molecule.md`: Molecule test files
- `ac-validator.md`: Static code validation
- `ac-linter.md`: ansible-lint execution
- `ac-fixer.md`: Auto-fix lint violations

**cc/skills/ac/** - Claude Code slash commands
- `role.md`: `/ac:role` - Generate Ansible roles with parallel generators
- `playbook.md`: `/ac:playbook` - Generate playbooks
- `explain.md`: `/ac:explain` - Explain Ansible code
- `fix.md`: `/ac:fix` - Fix Ansible errors

**cc/common/references/** - Shared reference documentation
- `role-structure.md`: Galaxy-standard role directory structure
- `playbook-structure.md`: Playbook directory conventions
- `fqcn.md`: Fully Qualified Collection Name mappings
- `patterns.md`: Ansible patterns and best practices
- `lint-fixes.md`: Common lint fixes reference
- `molecule.md`: Molecule testing guide

**cc/scripts/** - Installation scripts
- `install-skills.ts`: Installs skills to `~/.claude/commands/ac/` and agents to `~/.claude/agents/`

### Generation Flow

1. **Plan Phase**: Uses structured outputs to generate a validated plan preview
2. **User Review**: Interactive accept/modify/reject of the plan
3. **Code Generation**: Streams YAML content with visual feedback
4. **Validation**: YAML syntax → FQCN compliance → idempotency patterns → ansible-lint
5. **Auto-fix**: Applies fixes for common lint violations
6. **File Writing**: Creates role/playbook directory structure

### Key Patterns

- **Streaming with Spinners**: `streamMessage()` handles spinner → streaming token transition
- **Structured Outputs**: Plan previews use Anthropic beta API for guaranteed JSON schema
- **Retry with Backoff**: API calls use `withRetry()` for transient failures
- **Phase Tracking**: `createPhaseTracker()` provides consistent progress display
- **Validation Pipeline**: Errors block, warnings inform

## Configuration

- API key: `ANTHROPIC_API_KEY` env var or `~/.config/ansible-craft/config.toml`
- Default model: `claude-sonnet-4-5-20250929` (pinned version)
- Default timeout: 2 minutes, 3 retries

## Testing Conventions

- Tests use Bun's built-in test runner
- Test files: `*.test.ts` adjacent to source files
- Mock utilities in `src/__test-utils__/`
- Fixtures for Anthropic API responses in `src/__test-utils__/fixtures.ts`
