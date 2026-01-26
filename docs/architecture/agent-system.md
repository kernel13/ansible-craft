# Agent System

The agent system orchestrates specialized AI agents for different aspects of Ansible code generation.

## Overview

ansible-craft uses a multi-agent architecture where specialized agents handle specific tasks. This enables parallel execution and focused prompts.

```
┌─────────────────────────────────────────────────────────────────┐
│                       ORCHESTRATOR                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│    ┌──────────┐                                                 │
│    │ PLANNER  │────────────────────────────────────────┐        │
│    └──────────┘                                        │        │
│         │                                              │        │
│         ▼                                              ▼        │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐   ┌────────┐   │
│    │GENERATOR │    │GENERATOR │    │GENERATOR │   │GENERATOR│   │
│    │  CORE    │    │  TASKS   │    │TEMPLATES │   │MOLECULE │   │
│    └──────────┘    └──────────┘    └──────────┘   └────────┘   │
│         │              │               │               │        │
│         └──────────────┴───────────────┴───────────────┘        │
│                              │                                  │
│                              ▼                                  │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐                │
│    │VALIDATOR │───▶│  LINTER  │───▶│  FIXER   │                │
│    └──────────┘    └──────────┘    └──────────┘                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Agent Types

### Orchestrator

**Location:** `src/core/orchestrator.ts`

The orchestrator coordinates the entire workflow:

- Receives user input
- Routes to appropriate agents
- Manages dependencies
- Handles errors and retries

```typescript
interface Orchestrator {
  run(input: UserInput): Promise<GenerationResult>;
}
```

### Planner Agent

**Location:** `src/core/planner.ts`
**Claude Code:** `cc/agents/ac-planner.md`

Generates structured plans from natural language:

- Analyzes requirements
- Breaks down into components
- Defines tasks, variables, templates

```typescript
interface PlannerAgent {
  generatePlan(description: string, context: WizardContext): Promise<Plan>;
}
```

**Output:** Structured plan object with tasks, variables, handlers, templates.

### Generator Agents

Multiple specialized generators run in parallel:

#### Core Generator

**Location:** `src/core/generator.ts`
**Claude Code:** `cc/agents/ac-generator-core.md`

Generates core role files:
- `defaults/main.yml`
- `vars/main.yml`
- `handlers/main.yml`
- `meta/main.yml`
- `README.md`

#### Tasks Generator

**Claude Code:** `cc/agents/ac-generator-tasks.md`

Generates task files:
- `tasks/main.yml`
- `tasks/*.yml` (included task files)

#### Templates Generator

**Claude Code:** `cc/agents/ac-generator-templates.md`

Generates Jinja2 templates:
- `templates/*.j2`

#### Molecule Generator

**Claude Code:** `cc/agents/ac-generator-molecule.md`

Generates Molecule test files:
- `molecule/default/molecule.yml`
- `molecule/default/converge.yml`
- `molecule/default/verify.yml`

### Validator Agent

**Location:** `src/core/validator.ts`
**Claude Code:** `cc/agents/ac-validator.md`

Performs static validation:
- YAML syntax
- FQCN compliance
- Idempotency patterns

### Linter Agent

**Location:** `src/core/linter.ts`
**Claude Code:** `cc/agents/ac-linter.md`

Runs ansible-lint and parses results:
- Execute ansible-lint
- Parse violations
- Categorize fixable issues

### Fixer Agent

**Location:** `src/core/fixer.ts`
**Claude Code:** `cc/agents/ac-fixer.md`

Applies automatic fixes:
- FQCN conversion
- YAML formatting
- Boolean normalization

## Message Bus

**Location:** `src/core/message-bus.ts`

Agents communicate via a message bus for loose coupling:

```typescript
interface MessageBus {
  publish(topic: string, message: Message): void;
  subscribe(topic: string, handler: MessageHandler): void;
}

interface Message {
  type: string;
  payload: unknown;
  timestamp: Date;
  source: string;
}
```

### Topics

| Topic | Publisher | Subscriber |
|-------|-----------|------------|
| `plan.complete` | Planner | Generators |
| `generation.complete` | Generators | Validator |
| `validation.complete` | Validator | Linter |
| `lint.complete` | Linter | Fixer |
| `fix.complete` | Fixer | Writer |

## Parallel Execution

For role generation, multiple generators run in parallel:

```typescript
async function generateRole(plan: Plan): Promise<GeneratedFiles> {
  // Run generators in parallel
  const [core, tasks, templates, molecule] = await Promise.all([
    coreGenerator.generate(plan),
    tasksGenerator.generate(plan),
    templatesGenerator.generate(plan),
    plan.molecule ? moleculeGenerator.generate(plan) : null
  ]);

  return { ...core, ...tasks, ...templates, ...molecule };
}
```

### Dependency Graph

```
                    ┌──────────┐
                    │  PLAN    │
                    └────┬─────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  CORE    │   │  TASKS   │   │TEMPLATES │
    └────┬─────┘   └────┬─────┘   └────┬─────┘
          │              │              │
          └──────────────┼──────────────┘
                         │
                         ▼
                   ┌──────────┐
                   │ VALIDATE │
                   └────┬─────┘
                         │
                         ▼
                   ┌──────────┐
                   │   LINT   │
                   └────┬─────┘
                         │
                         ▼
                   ┌──────────┐
                   │   FIX    │
                   └────┬─────┘
                         │
                         ▼
                   ┌──────────┐
                   │  WRITE   │
                   └──────────┘
```

## Agent Interface

All agents implement a common interface:

```typescript
interface Agent<TInput, TOutput> {
  name: string;

  // Main execution method
  run(input: TInput): Promise<TOutput>;

  // Optional: stream output
  runStream?(input: TInput): AsyncGenerator<string, TOutput>;
}
```

### Specialized Interfaces

```typescript
interface GeneratorAgent extends Agent<Plan, GeneratedFiles> {
  fileTypes: string[]; // Files this generator produces
}

interface ValidatorAgent extends Agent<GeneratedFiles, ValidationResult> {
  rules: string[]; // Validation rules applied
}
```

## Error Handling

### Retry Logic

Agents use exponential backoff for transient failures:

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelay: 1000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === options.maxRetries) {
        throw error;
      }

      const delay = options.baseDelay * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw lastError;
}
```

### Error Propagation

Errors bubble up to the orchestrator:

```typescript
try {
  const result = await orchestrator.run(input);
} catch (error) {
  if (error instanceof ValidationError) {
    // Show validation errors to user
  } else if (error instanceof APIError) {
    // Handle API errors
  } else {
    // Unknown error
  }
}
```

## State Management

### Generation Context

Context flows through the pipeline:

```typescript
interface GenerationContext {
  // User input
  description: string;
  wizardAnswers: WizardContext;

  // Generated artifacts
  plan?: Plan;
  files?: GeneratedFiles;

  // Validation state
  validationResult?: ValidationResult;
  lintResult?: LintResult;

  // Options
  options: GenerationOptions;
}
```

### Checkpointing

For long-running operations, state can be checkpointed:

```typescript
interface Checkpoint {
  phase: string;
  context: GenerationContext;
  timestamp: Date;
}
```

## Claude Code Integration

### Agent Definitions

Agent definitions for Claude Code are in `cc/agents/`:

```markdown
# ac-planner.md

## Agent Definition

Type: ac-planner
Description: Generates structured plans from requirements

## Capabilities
- Analyze natural language requirements
- Break down into Ansible components
- Define task structure

## Inputs
- description: Natural language description
- context: Wizard configuration context

## Outputs
- Structured plan JSON
```

### Task Tool Usage

In Claude Code, agents are invoked via the Task tool:

```typescript
// Claude Code invokes agent
Task({
  subagent_type: "ac-planner",
  prompt: "Generate a plan for: nginx with SSL",
  description: "Planning nginx role"
});
```

## Extending the Agent System

### Adding a New Agent

1. Create agent class in `src/core/`:

```typescript
// src/core/my-agent.ts
export class MyAgent implements Agent<Input, Output> {
  name = 'my-agent';

  async run(input: Input): Promise<Output> {
    // Implementation
  }
}
```

2. Register with orchestrator:

```typescript
// src/core/orchestrator.ts
orchestrator.registerAgent('my-agent', new MyAgent());
```

3. Create Claude Code definition:

```markdown
# cc/agents/ac-my-agent.md
Agent definition for Claude Code Task tool
```

### Custom Generator

To add a new file type generator:

```typescript
class CustomGenerator implements GeneratorAgent {
  name = 'custom-generator';
  fileTypes = ['custom/*.yml'];

  async run(plan: Plan): Promise<GeneratedFiles> {
    // Generate custom files
  }
}
```

## Performance Considerations

### Parallel vs Sequential

| Scenario | Execution |
|----------|-----------|
| Independent generators | Parallel |
| Validation after generation | Sequential |
| Lint after validation | Sequential |
| Fix after lint | Sequential |

### Caching

Plan results can be cached for retry scenarios:

```typescript
const cache = new Map<string, Plan>();

async function getPlan(description: string): Promise<Plan> {
  const key = hash(description);

  if (cache.has(key)) {
    return cache.get(key);
  }

  const plan = await planner.generatePlan(description);
  cache.set(key, plan);
  return plan;
}
```

## Related

- **[Generation Flow](generation-flow.md)** - End-to-end process
- **[AI Integration](ai-integration.md)** - LLM integration details
- **[Validation Pipeline](validation-pipeline.md)** - Validation details
