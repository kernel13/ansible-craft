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

---

# Appendix: Plan Mode / Interactive Wizard Integration

**Added:** 2026-01-21
**Focus:** How wizard integrates with existing generation architecture

## Wizard Integration Summary

The interactive wizard must integrate BEFORE the existing two-phase generation flow. The current architecture already has clarification support (`clarifications?: Record<string, string>`) in both `generateRolePlan()` and `generatePlaybookPlan()`, but this is not exposed in the CLI. The wizard will collect structured context and pass it through this existing parameter path to enrich AI prompts.

## Current Architecture Analysis

### Existing Flow (Without Wizard)

```
CLI Command (new.ts)
    |
    v
generateRolePlan(client, description, undefined)  <-- clarifications unused
    |
    v
buildPlanPrompt(description, clarifications)      <-- handles clarifications
    |
    v
Anthropic API (structured output)
    |
    v
PlanPreview (JSON)
    |
    v
User Approval Loop (accept/modify/reject)
    |
    v
generateRoleCode(client, plan, description)
    |
    v
validateGeneratedFiles() -> ansible-lint -> auto-fix
    |
    v
writeGeneratedRole()
```

### Key Discovery: Unused Clarification Path

The `clarifications` parameter already flows through the system but is never populated:

1. **generateRolePlan()** accepts `clarifications?: Record<string, string>`
2. **buildPlanPrompt()** has template for `## Additional Context (from clarifying questions)`
3. **CLI new.ts** passes `undefined` for clarifications

This is the primary integration point for wizard output.

## Integration Points

### Primary Integration: Generation Functions

| Function | File | Integration Method |
|----------|------|-------------------|
| `generateRolePlan()` | `src/generation/generate-role.ts` | Pass `WizardContext` as `clarifications` |
| `generatePlaybookPlan()` | `src/generation/generate-playbook.ts` | Pass `WizardContext` as `clarifications` |
| `buildPlanPrompt()` | `src/generation/prompts/plan.ts` | Already renders clarifications in prompt |
| `buildPlaybookPlanPrompt()` | `src/generation/prompts/playbook-plan.ts` | Needs clarifications support added |

### Secondary Integration: CLI Commands

| File | Change Required |
|------|-----------------|
| `src/cli/commands/new.ts` | Add wizard invocation before `generateRolePlan()` |
| `src/cli/program.ts` | Add `--plan` / `--wizard` flags |
| `src/cli/output.ts` | Extend `PhaseTracker` for wizard phases |

### Tertiary Integration: System Prompts

The system prompts may need context injection for wizard-gathered information:

| File | Consideration |
|------|---------------|
| `src/generation/prompts/system.ts` | May need dynamic context sections |
| `src/generation/prompts/playbook-system.ts` | Same consideration |

## New Components Required

### 1. Wizard Module (`src/wizard/`)

```
src/wizard/
├── index.ts              # Public exports
├── types.ts              # WizardContext, WizardStep interfaces
├── runner.ts             # Wizard orchestration engine
├── steps/
│   ├── index.ts          # Step registry
│   ├── environment.ts    # Target environment questions
│   ├── components.ts     # What to install/configure
│   ├── security.ts       # SSL, auth, firewall questions
│   ├── integration.ts    # External services, backends
│   └── advanced.ts       # Scale, HA, custom options
└── formatter.ts          # Convert WizardContext to clarifications
```

### 2. Core Type Definitions

```typescript
// src/wizard/types.ts

/**
 * Structured context gathered by the wizard.
 * This is the internal representation before formatting for AI.
 */
export interface WizardContext {
  // Environment
  targetOS?: string[];           // ['Ubuntu 22.04', 'RHEL 9']
  environmentType?: 'development' | 'staging' | 'production';

  // Components
  components?: string[];         // ['nginx', 'php-fpm', 'mysql']
  componentVersions?: Record<string, string>;

  // Security
  sslMode?: 'none' | 'letsencrypt' | 'custom-certs';
  authMethod?: string;
  firewallRequired?: boolean;

  // Integration
  backends?: string[];           // ['app-server:8080']
  databases?: string[];          // ['mysql://host:3306/db']
  externalServices?: string[];

  // Advanced
  highAvailability?: boolean;
  clusterSize?: number;
  customVariables?: Record<string, string>;

  // Raw answers for AI context
  rawAnswers: Record<string, string>;
}

/**
 * A single wizard step/question.
 */
export interface WizardStep {
  id: string;
  question: string;
  type: 'input' | 'select' | 'confirm' | 'checkbox';
  options?: Array<{ value: string; name: string }>;
  default?: string | boolean | string[];
  when?: (context: Partial<WizardContext>) => boolean;
  validate?: (value: unknown) => boolean | string;
}
```

### 3. Context Formatter

```typescript
// src/wizard/formatter.ts

/**
 * Convert WizardContext to the clarifications format expected by prompts.
 */
export function formatForPrompt(context: WizardContext): Record<string, string> {
  const clarifications: Record<string, string> = {};

  if (context.targetOS?.length) {
    clarifications['Target Operating Systems'] = context.targetOS.join(', ');
  }
  if (context.environmentType) {
    clarifications['Environment Type'] = context.environmentType;
  }
  if (context.sslMode && context.sslMode !== 'none') {
    clarifications['SSL Configuration'] = context.sslMode;
  }
  // ... format all relevant fields

  // Include raw answers for any custom context
  return { ...clarifications, ...context.rawAnswers };
}
```

## Modified Components

### 1. CLI new.ts - Add Wizard Invocation

```typescript
// Before generateRolePlan(), add:

let clarifications: Record<string, string> | undefined;

if (options.plan || options.wizard) {
  // Run wizard
  const wizardContext = await runWizard('role', description);
  clarifications = formatForPrompt(wizardContext);

  if (!options.quiet) {
    displayWizardSummary(wizardContext);
  }
}

// Then pass to generation:
const plan = await generateRolePlan(client, description, clarifications, {
  quiet: true,
});
```

### 2. buildPlaybookPlanPrompt() - Add Clarifications Support

Currently `buildPlaybookPlanPrompt()` doesn't have clarifications support. Needs update:

```typescript
// src/generation/prompts/playbook-plan.ts

export function buildPlaybookPlanPrompt(
  userDescription: string,
  clarifications?: Record<string, string>,  // ADD THIS
): string {
  const clarificationSection = clarifications
    ? `\n## Additional Context\n\n${Object.entries(clarifications)
        .map(([key, value]) => `- **${key}**: ${value}`)
        .join('\n')}\n`
    : '';

  // Insert into template
}
```

### 3. Commander Options

```typescript
// src/cli/commands/new.ts

.option('--plan', 'Run interactive wizard before generation')
.option('--wizard', 'Alias for --plan')
```

## Data Flow Diagram

```
User Input: "ansible-craft new role nginx --plan"
    |
    v
+------------------+
|  CLI Parser      |  Detects --plan flag
+------------------+
    |
    v
+------------------+
|  Wizard Runner   |  Asks contextual questions
|  (NEW)           |  Returns WizardContext
+------------------+
    |
    v
+------------------+
|  Context         |  Converts WizardContext to
|  Formatter (NEW) |  Record<string, string>
+------------------+
    |
    v
+------------------+
|  generateRolePlan|  EXISTING - receives clarifications
+------------------+
    |
    v
+------------------+
|  buildPlanPrompt |  EXISTING - already handles clarifications
+------------------+        with "## Additional Context" section
    |
    v
+------------------+
|  Anthropic API   |  Enhanced prompt produces better plan
+------------------+
    |
    v
[Continue existing flow: approval -> code generation -> validation -> write]
```

## Build Order for Wizard (Suggested Implementation Sequence)

### Phase 1: Foundation (No CLI Changes Yet)

1. **Create `src/wizard/types.ts`**
   - Define `WizardContext` interface
   - Define `WizardStep` interface
   - No dependencies on existing code

2. **Create `src/wizard/formatter.ts`**
   - Implement `formatForPrompt(context)`
   - Unit tests with various context shapes
   - Depends only on types.ts

3. **Update `buildPlaybookPlanPrompt()`**
   - Add clarifications parameter
   - Mirror pattern from `buildPlanPrompt()`
   - Backward compatible (optional param)

### Phase 2: Wizard Engine

4. **Create `src/wizard/steps/*.ts`**
   - Define step definitions for each category
   - Pure data, no side effects
   - Easy to test and extend

5. **Create `src/wizard/runner.ts`**
   - Uses `@inquirer/prompts` (already a dependency)
   - Orchestrates step flow
   - Conditional step logic
   - Returns `WizardContext`

6. **Create `src/wizard/index.ts`**
   - Export public interface
   - `runWizard(type: 'role' | 'playbook', description: string)`

### Phase 3: CLI Integration

7. **Update `src/cli/commands/new.ts`**
   - Add `--plan` / `--wizard` options
   - Invoke wizard before generation
   - Pass clarifications to `generateRolePlan()`
   - Pass clarifications to `generatePlaybookPlan()`

8. **Update `src/cli/output.ts`** (if needed)
   - Display wizard summary
   - Integrate with PhaseTracker

### Phase 4: Enhancement

9. **Smart Defaults**
   - Analyze description to pre-populate context
   - "nginx with SSL" -> sslMode: 'letsencrypt'
   - Reduces wizard friction

10. **Skip Logic**
    - `--no-interactive` skips wizard
    - `--json` mode skips wizard
    - Maintains existing non-interactive behavior

## Component Dependencies

```
src/wizard/types.ts          <- No dependencies
src/wizard/formatter.ts      <- types.ts
src/wizard/steps/*.ts        <- types.ts
src/wizard/runner.ts         <- types.ts, steps/*, @inquirer/prompts
src/wizard/index.ts          <- runner.ts, formatter.ts

src/cli/commands/new.ts      <- src/wizard/index.ts (new dependency)
src/generation/prompts/*     <- No new dependencies
```

## Backward Compatibility

All changes maintain backward compatibility:

| Scenario | Behavior |
|----------|----------|
| `ansible-craft new role "nginx"` | Works exactly as today |
| `ansible-craft new role "nginx" --plan` | Runs wizard first |
| `ansible-craft new role "nginx" --json` | No wizard (unchanged) |
| `ansible-craft new role "nginx" --no-interactive` | No wizard (unchanged) |

## Testing Strategy

### Unit Tests

```
src/wizard/
├── formatter.test.ts     # Context formatting
├── runner.test.ts        # Wizard flow logic
└── steps/*.test.ts       # Step definitions
```

### Integration Tests

- Test clarifications flow through to prompts
- Test wizard context improves generation quality
- Test backward compatibility with no wizard

### Manual Testing Scenarios

1. Run wizard, accept all defaults
2. Run wizard, customize every step
3. Run wizard, then reject plan
4. Run wizard, then modify plan (feedback loop)
5. Run without wizard (regression)

## Architecture Decisions

### ADR-1: Wizard as Separate Module

**Decision:** Create `src/wizard/` as a separate module rather than embedding in CLI.

**Rationale:**
- Separation of concerns (questions vs. commands)
- Reusable for future features (templates, presets)
- Testable in isolation
- Clear ownership of wizard logic

### ADR-2: Use Existing Clarifications Path

**Decision:** Use the existing `clarifications` parameter rather than modifying system prompts.

**Rationale:**
- Path already exists and works
- Minimal changes to existing code
- Prompt template already handles formatting
- Lower risk of regression

### ADR-3: Opt-in Wizard via Flag

**Decision:** Wizard is opt-in via `--plan` flag, not default behavior.

**Rationale:**
- Preserves quick generation for simple cases
- Power users can skip wizard
- Non-interactive mode unchanged
- Lower friction for adoption

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Wizard questions confuse users | Medium | Medium | Clear defaults, skip option |
| Too many questions | High | High | Conditional steps, smart defaults |
| Context not improving output | Low | High | Validate with A/B comparison |
| Breaking existing workflow | Low | High | Opt-in flag, extensive tests |

## Open Questions

1. **Question Count:** How many wizard questions is optimal? Research suggests 5-7 for engagement.

2. **Smart Defaults:** Should we analyze the description with AI first to pre-populate wizard defaults?

3. **Presets:** Should we support preset files (e.g., `ansible-craft.preset.yml`) that pre-answer wizard questions?

4. **History:** Should wizard remember previous answers for similar descriptions?

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

**Wizard/Plan Mode Integration (2026-01-21):**
- Direct analysis of `/Users/stephanesop/Documents/dev/ansible-craft/src/` codebase
- `@inquirer/prompts` documentation (already in package.json as dependency)
- Existing clarification prompt pattern in `src/generation/prompts/plan.ts`
