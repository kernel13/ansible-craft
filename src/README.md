# Source Code

This directory contains the application source code for ansible-craft, a CLI tool that generates production-ready Ansible roles and playbooks from natural language descriptions.

## Directory Structure

```
src/
├── ai/                     # Anthropic SDK integration
│   ├── client.ts           # Creates configured Anthropic clients
│   ├── errors.ts           # API error transformation
│   ├── models.ts           # Model selection (Sonnet/Opus)
│   ├── retry.ts            # Exponential backoff retry logic
│   ├── stream.ts           # Streaming responses with spinners
│   ├── types.ts            # AI-related type definitions
│   └── index.ts            # Module exports
├── api/
│   └── validate-key.ts     # API key validation
├── cli/                    # Commander.js CLI implementation
│   ├── commands/           # Command implementations
│   │   ├── completions.ts  # Shell completion generation
│   │   ├── config.ts       # Config management command
│   │   ├── explain.ts      # Code explanation command
│   │   ├── fix.ts          # Error fix command
│   │   ├── new.ts          # Role/playbook generation command
│   │   └── setup.ts        # Claude Code skills installer
│   ├── helpers/            # Command helper utilities
│   │   └── index.ts        # Agent context creation
│   ├── completions.ts      # Completion logic
│   ├── help.ts             # Help text formatting
│   ├── index.ts            # CLI entry point
│   ├── json-output.ts      # JSON output formatting
│   ├── output.ts           # Phase tracking with spinners
│   ├── preview.ts          # Dry-run previews
│   ├── progress.ts         # Progress display utilities
│   ├── program.ts          # Main program with commands
│   └── version.ts          # Version display
├── config/                 # Configuration management
│   ├── defaults.ts         # Default configuration values
│   ├── errors.ts           # Config-related errors
│   ├── loader.ts           # TOML config loading
│   ├── paths.ts            # Config file paths
│   ├── schema.ts           # Config schema (Zod)
│   ├── wizard.ts           # Setup wizard
│   └── writer.ts           # Config file writing
├── core/                   # Agent orchestration layer
│   ├── debugger.ts         # Debugger agent
│   ├── explainer.ts        # Explainer agent
│   ├── fixer.ts            # Auto-fix agent
│   ├── generator.ts        # Code generator agent
│   ├── index.ts            # Module exports & workflows
│   ├── linter.ts           # Ansible-lint agent
│   ├── message-bus.ts      # Inter-agent communication
│   ├── orchestrator.ts     # Agent coordination
│   ├── planner.ts          # Plan generation agent
│   ├── types.ts            # Agent type definitions
│   ├── validator.ts        # Code validator agent
│   └── writer.ts           # File writer agent
├── errors/
│   └── cli-error.ts        # CLI error class
├── explain/                # Code explanation features
│   ├── prompts/            # Explanation prompts
│   │   ├── explain-prompt.ts
│   │   ├── fix-prompt.ts
│   │   └── index.ts
│   ├── confidence-detector.ts  # Low-confidence detection
│   ├── context-extractor.ts    # Context extraction
│   ├── file-reader.ts          # Ansible file reading
│   ├── fix-applier.ts          # Fix application
│   └── index.ts
├── generation/             # Role/playbook generation
│   ├── playbook/           # Playbook-specific code
│   │   ├── index.ts
│   │   └── structure.ts    # Playbook directory structure
│   ├── prompts/            # AI prompts
│   │   ├── clarify.ts      # Clarification prompts
│   │   ├── index.ts
│   │   ├── playbook-generate.ts
│   │   ├── playbook-plan.ts
│   │   ├── playbook-system.ts
│   │   └── system.ts       # Role system prompt
│   ├── role/               # Role-specific code
│   │   ├── index.ts
│   │   ├── parser.ts       # Response parsing
│   │   ├── sanitize.ts     # Name sanitization
│   │   ├── structure.ts    # Role directory structure
│   │   └── validator.ts    # Role validation
│   ├── schemas/            # Structured output schemas
│   │   ├── plan-preview.ts # Role plan schema
│   │   └── playbook-plan.ts
│   ├── validation/         # Code validation
│   │   ├── ansible-lint.ts # ansible-lint integration
│   │   ├── auto-fix.ts     # Auto-fix violations
│   │   ├── fqcn-checker.ts # FQCN compliance
│   │   ├── idempotency-checker.ts
│   │   ├── index.ts
│   │   └── yaml-validator.ts
│   ├── generate-playbook.ts  # Playbook orchestration
│   ├── generate-role.ts      # Role orchestration
│   ├── index.ts
│   └── writer.ts             # File system operations
├── types/
│   └── cli.ts              # CLI type definitions
├── wizard/                 # Interactive wizards
│   ├── defaults.ts         # Default values management
│   ├── playbook-prompts.ts # Playbook wizard prompts
│   ├── playbook-wizard.ts  # Playbook configuration wizard
│   ├── prompts.ts          # Role wizard prompts
│   ├── role-wizard.ts      # Role configuration wizard
│   └── types.ts            # Wizard context types (Zod schemas)
└── __test-utils__/         # Test utilities
    ├── fixtures/           # Test fixtures
    │   ├── config/         # Config fixtures
    │   ├── explain/        # Explain command fixtures
    │   ├── generation/     # Generation fixtures
    │   └── yaml/           # YAML validation fixtures
    ├── mocks/              # Mock implementations
    │   ├── filesystem.ts   # File system mocks
    │   └── prompts.ts      # Prompt mocks
    ├── fixtures.ts         # Anthropic API fixtures
    └── index.ts            # Test utility exports
```

## Module Overview

### ai/

Anthropic SDK integration layer providing Claude API access.

| File | Purpose |
|------|---------|
| `client.ts` | Creates configured Anthropic clients with retry/timeout |
| `stream.ts` | Handles streaming responses with visual feedback (spinners) |
| `retry.ts` | Exponential backoff retry logic for API calls |
| `errors.ts` | API error transformation and user-friendly display |
| `models.ts` | Model selection (Sonnet default, Opus for `--complex`) |

**Key exports:**
- `createClient()` - Create Anthropic client
- `streamMessage()` - Stream with spinner transition
- `withRetry()` - Retry wrapper with backoff

### cli/

Commander.js CLI implementation with commands and output formatting.

| Command | Description |
|---------|-------------|
| `new role <description>` | Generate Ansible role from description |
| `new playbook <description>` | Generate Ansible playbook from description |
| `explain <path>` | Explain Ansible code in plain English |
| `fix <error>` | Diagnose and fix Ansible errors |
| `config save` | Configure API key and preferences |
| `config defaults` | Manage wizard default values |
| `setup` | Install Claude Code skills/agents |

**Key patterns:**
- `createPhaseTracker()` - Consistent progress display
- `outputJson()` - Machine-readable JSON output
- `previewAndConfirm()` - Dry-run preview workflow

### config/

TOML-based configuration stored in `~/.config/ansible-craft/config.toml`.

| File | Purpose |
|------|---------|
| `loader.ts` | Load config with env var precedence |
| `writer.ts` | Save config to TOML file |
| `schema.ts` | Zod schema for config validation |
| `wizard.ts` | Interactive setup wizard |
| `defaults.ts` | Default configuration values |
| `paths.ts` | Platform-specific config paths |

**Configuration precedence:**
1. Default values
2. Config file (`~/.config/ansible-craft/config.toml`)
3. Environment variables (`ANTHROPIC_API_KEY`)

### core/

Agent orchestration layer for parallel validation and code generation.

| Agent | Purpose |
|-------|---------|
| `PlannerAgent` | Generate structured plans from requirements |
| `GeneratorAgent` | Generate code from approved plans |
| `ValidatorAgent` | Static code validation (YAML, FQCN) |
| `LinterAgent` | Run ansible-lint |
| `FixerAgent` | Auto-fix lint violations |
| `WriterAgent` | Write files to disk |
| `ExplainerAgent` | Explain Ansible code |
| `DebuggerAgent` | Debug Ansible errors |

**Key workflows:**
```typescript
// Validate and lint in parallel
const { validation, lint } = await validateAndLint(files, context);

// Full quality pipeline: validate → lint → fix → write
const result = await qualityPipeline(files, options, context);
```

### generation/

Role and playbook generation with two-phase orchestration.

**Generation Flow:**
```
1. Plan Phase     → Structured outputs for validated plan preview
2. User Review    → Interactive accept/modify/reject
3. Code Phase     → Stream YAML with visual feedback
4. Validation     → YAML syntax → FQCN → idempotency → ansible-lint
5. Auto-fix       → Apply fixes for common violations
6. File Writing   → Create directory structure
```

| Subdirectory | Purpose |
|--------------|---------|
| `prompts/` | System prompts and prompt builders |
| `schemas/` | JSON schemas for structured outputs |
| `role/` | Role parsing, sanitization, validation |
| `playbook/` | Playbook structure utilities |
| `validation/` | YAML, FQCN, idempotency checks |

### explain/

Code explanation and fix application features.

| File | Purpose |
|------|---------|
| `file-reader.ts` | Read Ansible files and role structures |
| `context-extractor.ts` | Extract context for better explanations |
| `confidence-detector.ts` | Detect low-confidence AI responses |
| `fix-applier.ts` | Apply suggested fixes to files |

### wizard/

Interactive configuration wizards using Inquirer prompts.

| File | Purpose |
|------|---------|
| `role-wizard.ts` | Interactive role configuration (10 topics) |
| `playbook-wizard.ts` | Interactive playbook configuration |
| `defaults.ts` | Save/load wizard defaults |
| `prompts.ts` | Inquirer prompt definitions |
| `types.ts` | Wizard context types with Zod schemas |

**Wizard topics (roles):**
1. Structure directories
2. Target platforms
3. Ansible version
4. Variable strategy
5. Privilege escalation
6. Handlers
7. Tags
8. Idempotency
9. Dependencies
10. Molecule testing

## Testing

Tests use Bun's built-in test runner with files adjacent to source.

```bash
# Run all tests
bun test

# Run tests in specific directory
bun test src/ai/

# Run specific test file
bun test src/ai/client.test.ts

# Run with coverage
bun test --coverage
```

**Test utilities:**
- `src/__test-utils__/fixtures.ts` - Anthropic API response fixtures
- `src/__test-utils__/mocks/` - File system and prompt mocks

## Development

### Adding a New Command

1. Create command file in `src/cli/commands/`:
   ```typescript
   import { Command } from 'commander';

   export const myCommand = new Command('my-command')
     .description('What it does')
     .action(async (options) => {
       // Implementation
     });
   ```

2. Register in `src/cli/program.ts`:
   ```typescript
   import { myCommand } from './commands/my-command.js';
   program.addCommand(myCommand);
   ```

### Adding a New Agent

1. Create agent file in `src/core/`:
   ```typescript
   import type { Agent, AgentContext, AgentResult } from './types.js';

   export class MyAgent implements Agent<Input, Output> {
     readonly name = 'my-agent';

     async execute(input: Input, context: AgentContext): Promise<AgentResult<Output>> {
       // Implementation
     }
   }
   ```

2. Export from `src/core/index.ts`

3. Add to `AgentRegistry` if needed

### Key Patterns

**Streaming with spinners:**
```typescript
const message = await streamMessage(client, {
  userMessage: prompt,
  systemPrompt: system,
});
```

**Phase tracking:**
```typescript
const tracker = createPhaseTracker(['plan', 'generate', 'validate', 'write']);
tracker.start('plan');
// ...work...
tracker.complete('plan');
```

**Structured outputs:**
```typescript
const plan = await client.messages.create({
  // ...
  response_format: {
    type: 'json_schema',
    json_schema: PLAN_SCHEMA,
  },
});
```
