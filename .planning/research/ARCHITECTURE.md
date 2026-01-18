# Architecture Research: Ansible Craft CLI

**Domain:** TypeScript CLI with AI (Claude) integration for Ansible code generation
**Researched:** 2026-01-18
**Confidence:** HIGH (verified via official documentation and established patterns)

## Executive Summary

Ansible Craft requires a layered architecture separating CLI concerns from AI integration and code generation. The recommended pattern follows clean architecture principles with clear boundaries between:
1. **CLI Layer** - Command parsing and user interaction
2. **Application Layer** - Orchestration and business logic
3. **AI Service Layer** - Claude API integration
4. **Generator Layer** - Template-based Ansible code generation
5. **Output Layer** - File system operations

## Component Overview

### 1. CLI Layer (Entry Point)
**Responsibility:** Parse commands, validate inputs, handle user interaction

| Component | Purpose |
|-----------|---------|
| `cli/index.ts` | Main entry point with shebang, initializes Commander |
| `cli/commands/*.ts` | Individual command modules (new-role, new-playbook, fix, explain) |
| `cli/options.ts` | Shared option definitions and validation |
| `cli/output.ts` | Console output formatting (colors, spinners, progress) |

**Key Design Decisions:**
- Each command in separate file for maintainability
- Commander.js subcommand pattern for extensibility
- Type-safe options using TypeScript interfaces
- Fail-fast validation before reaching application layer

### 2. Configuration Layer
**Responsibility:** Manage API keys, user preferences, project settings

| Component | Purpose |
|-----------|---------|
| `config/loader.ts` | Load config from env vars, dotfiles, CLI flags |
| `config/schema.ts` | Zod schemas for config validation |
| `config/defaults.ts` | Default values and fallbacks |

**Configuration Priority (highest to lowest):**
1. CLI flags (`--api-key`)
2. Environment variables (`ANTHROPIC_API_KEY`)
3. Project-level `.ansible-craft.json`
4. User-level `~/.config/ansible-craft/config.json`
5. Built-in defaults

### 3. Application Layer (Orchestration)
**Responsibility:** Coordinate between components, implement use cases

| Component | Purpose |
|-----------|---------|
| `services/role-generator.ts` | Orchestrates role creation workflow |
| `services/playbook-generator.ts` | Orchestrates playbook creation workflow |
| `services/fixer.ts` | Orchestrates fix/repair workflow |
| `services/explainer.ts` | Orchestrates explain workflow |

**Pattern:** Each service follows:
```
Input Validation -> AI Prompt Building -> Claude API Call -> Response Parsing -> Code Generation -> File Writing
```

### 4. AI Service Layer
**Responsibility:** All Claude API interactions, prompt management, response handling

| Component | Purpose |
|-----------|---------|
| `ai/client.ts` | Anthropic SDK wrapper with retry/error handling |
| `ai/prompts/*.ts` | Prompt templates for each use case |
| `ai/parsers.ts` | Parse Claude responses into structured data |
| `ai/types.ts` | TypeScript types for AI interactions |

**Key Design Decisions:**
- Use `@anthropic-ai/sdk` official TypeScript SDK
- Streaming for long responses (role generation can be verbose)
- Structured output parsing for reliable code extraction
- System prompts stored as separate files for maintainability

### 5. Generator Layer
**Responsibility:** Transform AI output into Ansible-compliant files

| Component | Purpose |
|-----------|---------|
| `generators/role.ts` | Generate role directory structure |
| `generators/playbook.ts` | Generate playbook files |
| `generators/templates/*.hbs` | Handlebars templates for boilerplate |
| `generators/validators.ts` | Validate generated YAML syntax |

**Ansible Role Output Structure:**
```
roles/
  <role_name>/
    tasks/
      main.yml
    handlers/
      main.yml
    templates/
      *.j2
    files/
    vars/
      main.yml
    defaults/
      main.yml
    meta/
      main.yml
    README.md
```

### 6. Output Layer
**Responsibility:** File system operations, conflict resolution

| Component | Purpose |
|-----------|---------|
| `output/writer.ts` | Write files to disk with conflict handling |
| `output/diff.ts` | Show diffs for existing file modifications |
| `output/tree.ts` | Display generated file tree to user |

## Data Flow

### Command: `ansible-craft new role nginx`

```
User Input
    |
    v
[CLI Layer]
    |-- Parse command: "new role nginx"
    |-- Validate: role name valid, output path exists
    |-- Load config: API key, model preferences
    |
    v
[Application Layer - RoleGeneratorService]
    |-- Build context: role name, target OS, requirements
    |-- Determine generation strategy
    |
    v
[AI Service Layer]
    |-- Select prompt template: role-generation.ts
    |-- Build system prompt with Ansible best practices
    |-- Build user prompt with specifics
    |-- Call Claude API (streaming)
    |-- Parse response into structured role data
    |
    v
[Generator Layer]
    |-- Validate parsed YAML
    |-- Apply Handlebars templates for boilerplate
    |-- Ensure FQCN compliance
    |-- Run ansible-lint validation (optional)
    |
    v
[Output Layer]
    |-- Check for existing files
    |-- Prompt for overwrite if conflicts
    |-- Write files to disk
    |-- Display file tree summary
    |
    v
User Output (files on disk + console summary)
```

### Data Types Flowing Through System

```typescript
// CLI -> Application
interface RoleRequest {
  name: string;
  description?: string;
  targetOS?: 'debian' | 'redhat' | 'all';
  features?: string[];
  outputPath: string;
}

// Application -> AI
interface PromptContext {
  roleRequest: RoleRequest;
  systemPrompt: string;
  userPrompt: string;
  model: string;
  maxTokens: number;
}

// AI -> Generator
interface ParsedRole {
  tasks: YamlContent[];
  handlers: YamlContent[];
  defaults: Record<string, unknown>;
  vars: Record<string, unknown>;
  templates: TemplateFile[];
  meta: RoleMeta;
}

// Generator -> Output
interface GeneratedFiles {
  files: Array<{
    path: string;
    content: string;
    overwrite: boolean;
  }>;
}
```

## Directory Structure

```
ansible-craft/
├── src/
│   ├── cli/
│   │   ├── index.ts              # Entry point, Commander setup
│   │   ├── commands/
│   │   │   ├── new-role.ts       # new role <name> command
│   │   │   ├── new-playbook.ts   # new playbook <name> command
│   │   │   ├── fix.ts            # fix <file> command
│   │   │   └── explain.ts        # explain <file> command
│   │   ├── options.ts            # Shared CLI options
│   │   └── output.ts             # Console formatting utilities
│   │
│   ├── config/
│   │   ├── loader.ts             # Config loading logic
│   │   ├── schema.ts             # Zod validation schemas
│   │   └── defaults.ts           # Default configuration
│   │
│   ├── services/
│   │   ├── role-generator.ts     # Role generation orchestration
│   │   ├── playbook-generator.ts # Playbook generation orchestration
│   │   ├── fixer.ts              # Fix command orchestration
│   │   └── explainer.ts          # Explain command orchestration
│   │
│   ├── ai/
│   │   ├── client.ts             # Anthropic SDK wrapper
│   │   ├── prompts/
│   │   │   ├── system.ts         # System prompts (Ansible expertise)
│   │   │   ├── role.ts           # Role generation prompts
│   │   │   ├── playbook.ts       # Playbook generation prompts
│   │   │   ├── fix.ts            # Fix prompts
│   │   │   └── explain.ts        # Explain prompts
│   │   ├── parsers.ts            # Response parsing utilities
│   │   └── types.ts              # AI-related types
│   │
│   ├── generators/
│   │   ├── role.ts               # Role file generation
│   │   ├── playbook.ts           # Playbook file generation
│   │   ├── templates/            # Handlebars templates
│   │   │   ├── role-readme.hbs
│   │   │   ├── meta-main.hbs
│   │   │   └── defaults-main.hbs
│   │   └── validators.ts         # YAML validation
│   │
│   ├── output/
│   │   ├── writer.ts             # File writing with conflict handling
│   │   ├── diff.ts               # Diff display for modifications
│   │   └── tree.ts               # File tree display
│   │
│   └── types/
│       ├── cli.ts                # CLI-related types
│       ├── ansible.ts            # Ansible structure types
│       └── config.ts             # Configuration types
│
├── templates/                    # Static Handlebars templates
│   └── ...
│
├── tests/
│   ├── unit/
│   │   ├── ai/
│   │   ├── generators/
│   │   └── services/
│   └── integration/
│       └── commands/
│
├── package.json
├── tsconfig.json
├── bunfig.toml                   # Bun configuration
└── README.md
```

## Build Order (Dependency-Based)

### Phase 1: Foundation (No Dependencies)
Build these first - they have no internal dependencies:

1. **Types** (`src/types/`) - Shared TypeScript interfaces
2. **Config Schema** (`src/config/schema.ts`) - Zod schemas
3. **Config Defaults** (`src/config/defaults.ts`) - Default values

### Phase 2: Infrastructure
Depends on Phase 1 types:

4. **Config Loader** (`src/config/loader.ts`) - Depends on schema + defaults
5. **AI Types** (`src/ai/types.ts`) - Depends on base types
6. **AI Client** (`src/ai/client.ts`) - Anthropic SDK wrapper, depends on config

### Phase 3: Core Logic
Depends on Phase 2 infrastructure:

7. **Prompts** (`src/ai/prompts/`) - Depends on AI types
8. **Parsers** (`src/ai/parsers.ts`) - Depends on AI types
9. **Validators** (`src/generators/validators.ts`) - Depends on Ansible types
10. **Output Writer** (`src/output/writer.ts`) - File system operations

### Phase 4: Generators
Depends on Phase 3:

11. **Role Generator** (`src/generators/role.ts`) - Depends on validators, templates
12. **Playbook Generator** (`src/generators/playbook.ts`) - Depends on validators

### Phase 5: Services (Orchestration)
Depends on Phase 4:

13. **Role Generator Service** (`src/services/role-generator.ts`)
14. **Playbook Generator Service** (`src/services/playbook-generator.ts`)
15. **Fixer Service** (`src/services/fixer.ts`)
16. **Explainer Service** (`src/services/explainer.ts`)

### Phase 6: CLI Layer
Depends on Phase 5:

17. **CLI Output Utilities** (`src/cli/output.ts`)
18. **CLI Options** (`src/cli/options.ts`)
19. **Individual Commands** (`src/cli/commands/`)
20. **CLI Entry Point** (`src/cli/index.ts`)

## Integration Points

### External Integrations

| Integration | Purpose | Library |
|-------------|---------|---------|
| Claude API | AI code generation | `@anthropic-ai/sdk` |
| File System | Read/write Ansible files | Native `fs` (Bun) |
| YAML | Parse/serialize Ansible YAML | `yaml` |
| Handlebars | Template rendering | `handlebars` |
| ansible-lint | Validate generated code | Shell exec (optional) |

### API Boundaries

```typescript
// CLI -> Service boundary
interface ServiceInterface {
  generateRole(request: RoleRequest): Promise<GeneratedFiles>;
  generatePlaybook(request: PlaybookRequest): Promise<GeneratedFiles>;
  fixFile(request: FixRequest): Promise<FixResult>;
  explainFile(request: ExplainRequest): Promise<ExplainResult>;
}

// Service -> AI boundary
interface AIClientInterface {
  complete(prompt: PromptContext): Promise<string>;
  stream(prompt: PromptContext): AsyncGenerator<string>;
}

// Service -> Generator boundary
interface GeneratorInterface {
  generateRoleFiles(parsed: ParsedRole, options: GeneratorOptions): GeneratedFiles;
  generatePlaybookFiles(parsed: ParsedPlaybook, options: GeneratorOptions): GeneratedFiles;
}

// Generator -> Output boundary
interface OutputInterface {
  write(files: GeneratedFiles, options: WriteOptions): Promise<WriteResult>;
  showDiff(original: string, modified: string): void;
  showTree(files: GeneratedFiles): void;
}
```

### Error Boundaries

Each layer handles its own errors and translates them for the layer above:

```
AI Layer Errors:
- API rate limits -> Retry with backoff, then user-friendly message
- Invalid API key -> Clear configuration instructions
- Network errors -> Retry logic, offline message

Generator Layer Errors:
- Invalid YAML from AI -> Attempt repair, show raw output if fails
- Template errors -> Developer error, log details

Output Layer Errors:
- Permission denied -> Clear message with path
- Disk full -> Clear message
- File conflicts -> Interactive prompt
```

## Key Architectural Decisions

### 1. Layered Architecture (Not Clean Architecture)
**Why:** Clean architecture is overkill for a CLI tool. A simpler layered approach with clear boundaries is sufficient and easier to maintain.

### 2. Streaming by Default
**Why:** Role generation can produce large outputs. Streaming provides better UX with progress indication and avoids timeout issues.

### 3. Handlebars for Templates
**Why:** Simple, well-documented, perfect for boilerplate generation. Avoids complex template engines.

### 4. Zod for Validation
**Why:** Runtime validation with TypeScript inference. Validates both config and AI responses.

### 5. No Dependency Injection Framework
**Why:** Simple factory functions and module imports are sufficient. Frameworks like InversifyJS add complexity without proportional benefit for a CLI.

### 6. Optional ansible-lint Integration
**Why:** Not all users have ansible-lint installed. Make it optional but recommended.

## Anti-Patterns to Avoid

| Anti-Pattern | Why Bad | Instead |
|--------------|---------|---------|
| God service | One service doing everything | Separate services per command |
| Prompts in code | Hard to iterate on prompts | Separate prompt files |
| Hardcoded paths | Breaks on different OS | Use `path.join()` and config |
| Sync file ops | Blocks event loop | Use async file operations |
| No error types | Generic errors unhelpful | Custom error classes per layer |

## Scalability Considerations

| Concern | Current (v1) | Future (v2+) |
|---------|--------------|--------------|
| Multiple models | Claude only | Abstract AI interface for OpenAI, local models |
| Caching | None | Cache common prompts/responses |
| Plugins | None | Plugin system for custom generators |
| GUI | CLI only | Potential Electron/Tauri wrapper |

## Sources

**Architecture Patterns:**
- [Building a TypeScript CLI with Commander - LogRocket](https://blog.logrocket.com/building-typescript-cli-node-js-commander/)
- [Commander.js GitHub](https://github.com/tj/commander.js)
- [MCP Server Boilerplate Architecture](https://github.com/aashari/boilerplate-mcp-server)
- [TypeScript Clean Architecture](https://github.com/AzouKr/typescript-clean-architecture)

**Claude API Integration:**
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [@anthropic-ai/sdk npm](https://www.npmjs.com/package/@anthropic-ai/sdk)
- [Claude Agent SDK Reference](https://platform.claude.com/docs/en/agent-sdk/typescript)

**Bun/TypeScript CLI:**
- [How To Build CLI Using TypeScript and Bun](https://pmbanugo.me/blog/build-cli-typescript-bun)
- [Building a TypeScript Library with Bun](https://dev.to/arshadyaseen/building-a-typescript-library-in-2026-with-bunup-3bmg)

**Code Generation:**
- [Plop.js Documentation](https://plopjs.com/documentation/)
- [Handlebars Guide](https://handlebarsjs.com/guide/)
- [Building CLI Code Generators](https://www.codewithseb.com/blog/building-your-own-cli-and-code-generators)

**Ansible Structure:**
- [Ansible Roles Documentation](https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html)
- [Ansible Best Practices](https://spacelift.io/blog/ansible-best-practices)

**Configuration:**
- [dotenv TypeScript Patterns](https://configu.com/blog/dotenv-typescript-the-basics-and-a-quick-tutorial/)
- [ts-dotenv npm](https://www.npmjs.com/package/ts-dotenv)
- [Environment Config Best Practices](https://raulmelo.me/en/blog/best-practices-for-handling-per-environment-config-js-ts-applications)
