# Architecture Overview

Understanding how ansible-craft generates production-ready Ansible code.

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         User Interface                       │
│                      (CLI - Commander.js)                    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                      Command Layer                           │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│   │ new role   │  │ new play   │  │  explain   │            │
│   │ new play   │  │   fix      │  │   config   │            │
│   └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Generation Layer                          │
│   ┌────────────────────────────────────────────────┐         │
│   │  Two-Phase Generation Flow                     │         │
│   │  1. Plan Preview (Structured Output)           │         │
│   │  2. Code Generation (Streaming)                │         │
│   └────────────────────────────────────────────────┘         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    AI Integration Layer                      │
│   ┌────────────────────────────────────────────────┐         │
│   │  Anthropic SDK (Claude API)                    │         │
│   │  - Model Selection (Sonnet/Opus)               │         │
│   │  - Retry Logic with Backoff                    │         │
│   │  - Streaming Response Handling                 │         │
│   │  - Error Transformation                        │         │
│   └────────────────────────────────────────────────┘         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    Validation Pipeline                       │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│   │    YAML    │→ │    FQCN    │→ │ Idempotency│            │
│   │  Validator │  │  Checker   │  │  Checker   │            │
│   └────────────┘  └────────────┘  └────────────┘            │
│                            │                                 │
│                            ▼                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│   │ansible-lint│  │  Auto-fix  │  │   Writer   │            │
│   │ Integration│  │   Engine   │  │  (Files)   │            │
│   └────────────┘  └────────────┘  └────────────┘            │
└──────────────────────────────────────────────────────────────┘
```

## Core Modules

### CLI Layer (`src/cli/`)

- **program.ts**: Main Commander.js program setup
- **commands/**: Individual command implementations
  - `new.ts`: Role and playbook generation
  - `explain.ts`: Code explanation
  - `fix.ts`: Error fixing
  - `config.ts`: Configuration management
  - `completions.ts`: Shell completion generation
- **output.ts**: Progress tracking with spinners
- **preview.ts**: Dry-run and lint result display

### AI Integration (`src/ai/`)

- **client.ts**: Configured Anthropic client creation
- **stream.ts**: Streaming response handling with visual feedback
- **retry.ts**: Exponential backoff retry logic
- **errors.ts**: API error transformation
- **models.ts**: Model selection (Sonnet default, Opus for `--complex`)

### Generation System (`src/generation/`)

- **generate-role.ts**: Role generation orchestration
- **generate-playbook.ts**: Playbook generation orchestration
- **prompts/**: System prompts and prompt builders
- **schemas/**: JSON schemas for structured outputs
- **role/**: Role-specific logic
  - `structure.ts`: Directory structure creation
  - `parser.ts`: YAML content parsing
  - `sanitize.ts`: Content sanitization
  - `validator.ts`: Role validation
- **playbook/**: Playbook-specific logic
- **validation/**: Validation pipeline
  - `yaml-validator.ts`: YAML syntax checking
  - `fqcn-checker.ts`: FQCN compliance
  - `idempotency-checker.ts`: Idempotency patterns
  - `ansible-lint.ts`: ansible-lint integration
  - `auto-fix.ts`: Automatic fixes
- **writer.ts**: File system operations

### Configuration (`src/config/`)

- **paths.ts**: Config file location management
- **reader.ts**: TOML config reading
- **writer.ts**: Config file writing
- **defaults.ts**: Default settings

### Explain System (`src/explain/`)

- **file-reader.ts**: Ansible file/role reading
- **context-extractor.ts**: Context extraction for better explanations
- **confidence-detector.ts**: Low-confidence response detection

## Key Design Patterns

### Two-Phase Generation

See [Generation Flow](generation-flow.md) for details.

**Phase 1: Plan Preview**
- Uses structured outputs API
- Generates validated JSON schema
- User can review before committing

**Phase 2: Code Generation**
- Streams YAML content
- Real-time progress feedback
- Validation after completion

### Streaming with Spinners

See [AI Integration](ai-integration.md) for details.

```typescript
// Smooth transition: spinner → streaming tokens
function streamMessage() {
  spinner.start('Generating...')

  for await (const chunk of stream) {
    if (firstChunk) {
      spinner.stop()  // Stop spinner
      startStreaming() // Start token display
    }
    process.stdout.write(chunk)
  }
}
```

### Retry with Exponential Backoff

See [AI Integration](ai-integration.md) for details.

```typescript
// Automatic retry for transient failures
withRetry(async () => {
  return await anthropic.messages.create(...)
}, {
  maxRetries: 3,
  baseDelay: 1000
})
```

### Validation Pipeline

See [Validation Pipeline](validation-pipeline.md) for details.

```
YAML Syntax → FQCN Check → Idempotency → ansible-lint → Auto-fix
```

## Data Flow

### Role Generation Flow

```
User Description
    │
    ▼
Plan Prompt Builder
    │
    ▼
Claude API (Structured Output)
    │
    ▼
Plan Preview JSON
    │
    ▼
User Review (Accept/Modify/Reject)
    │
    ▼
Code Generation Prompt
    │
    ▼
Claude API (Streaming)
    │
    ▼
YAML Content
    │
    ▼
Validation Pipeline
    │
    ├─ YAML Syntax ✓
    ├─ FQCN Check ✓
    ├─ Idempotency Check ✓
    └─ ansible-lint ✓
    │
    ▼
Auto-fix (optional)
    │
    ▼
File Writer
    │
    ▼
Role Directory Structure
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun | Fast JavaScript runtime |
| **CLI Framework** | Commander.js | Command-line parsing |
| **AI Provider** | Anthropic SDK | Claude API integration |
| **Validation** | yaml, js-yaml | YAML parsing |
| **Linting** | ansible-lint | Ansible best practices |
| **Output** | ora, chalk | Progress & colors |
| **Config** | TOML | Configuration format |
| **Testing** | Bun test | Unit testing |

## Module Dependencies

```
cli/commands/
    ↓
generation/
    ↓
ai/ + prompts/
    ↓
validation/
    ↓
config/
```

## Performance Characteristics

| Operation | Time | Model | Tokens |
|-----------|------|-------|--------|
| Simple role | 5-10s | Sonnet | 3K-5K |
| Complex role | 15-30s | Opus | 8K-15K |
| Playbook | 8-15s | Sonnet | 4K-7K |
| Explain | 3-5s | Haiku | 1K-3K |
| Fix | 5-8s | Sonnet | 2K-4K |

## Error Handling Strategy

### API Errors
- Retry transient failures (network, rate limit)
- Transform API errors to user-friendly messages
- Provide actionable suggestions

### Validation Errors
- Errors block file writing
- Warnings inform but don't block
- Auto-fix attempts before failing

### User Errors
- Clear error messages
- Suggest corrections
- Provide examples

## Security Considerations

- API keys stored with 600 permissions
- No API keys in logs or error messages
- Environment variable support for CI/CD
- No generation content logged by default

## Extensibility Points

### Adding New Commands
See [Adding Commands](../development/adding-commands.md)

### Adding Validators
See [Adding Validators](../development/adding-validators.md)

### Custom Prompts
Not currently supported, planned for future releases.

## See Also

- **[Generation Flow](generation-flow.md)** - Detailed generation process
- **[Validation Pipeline](validation-pipeline.md)** - Quality checks
- **[AI Integration](ai-integration.md)** - Anthropic SDK patterns
- **[Development Guide](../development/README.md)** - Contributing
