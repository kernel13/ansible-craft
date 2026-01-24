# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Personna

- Do not assume when I ask a question or a task that it is wrong or wright. Always analyze based on fact.
- Do not jump into conclusion and analyze different options
- When you propose a soultion make sure that you have check the 
- Keep think simple, do not generates extra code and each code should be production-ready
- Verify exsting code to avoid duplicate and propose refactoring if this is the case 


## Project Overview

ansible-craft is a CLI tool that generates production-ready Ansible roles and playbooks from natural language descriptions using the Anthropic Claude API. It runs on Bun runtime.

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

# CLI Usage (development)
bun run src/cli/index.ts new role "nginx with SSL"
bun run src/cli/index.ts new playbook "deploy LAMP stack"
bun run src/cli/index.ts explain path/to/playbook.yml
bun run src/cli/index.ts fix "error message"
bun run src/cli/index.ts config save
```

## Architecture

### Core Modules

**src/ai/** - Anthropic SDK integration
- `client.ts`: Creates configured Anthropic clients with retry/timeout
- `stream.ts`: Handles streaming responses with visual feedback (spinners)
- `retry.ts`: Exponential backoff retry logic for API calls
- `errors.ts`: API error transformation and user-friendly display
- `models.ts`: Model selection (Sonnet default, Opus for `--complex`)

**src/generation/** - Role and playbook generation
- `generate-role.ts` / `generate-playbook.ts`: Two-phase orchestration (plan → code)
- `prompts/`: System prompts and prompt builders for each phase
- `schemas/`: JSON schemas for structured outputs (plan previews)
- `role/`: Role-specific parsing, sanitization, validation, structure
- `playbook/`: Playbook-specific structure and utilities
- `validation/`: YAML syntax, FQCN compliance, idempotency checks, ansible-lint integration
- `writer.ts`: File system operations for writing generated content

**src/cli/** - Commander.js CLI implementation
- `program.ts`: Main program with command registration
- `commands/`: Individual command implementations (new, explain, fix, config)
- `output.ts`: Phase tracking with spinners and formatted output
- `preview.ts`: Dry-run previews and lint result display

**src/config/** - Configuration management
- TOML-based config stored in `~/.config/ansible-craft/config.toml`
- Handles API key storage, defaults, and setup wizard

**src/explain/** - Code explanation and fix features
- `file-reader.ts`: Reads Ansible files/roles
- `context-extractor.ts`: Extracts context for better explanations
- `confidence-detector.ts`: Detects low-confidence responses
- `fix-applier.ts`: Applies suggested fixes to files

### Generation Flow

1. **Plan Phase**: Uses structured outputs (`betas: ['structured-outputs-2025-11-13']`) to generate a validated plan preview
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
