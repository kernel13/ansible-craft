# Phase 9: Foundation - Research

**Researched:** 2026-01-21
**Domain:** TypeScript type definitions, Zod runtime validation, prompt formatting utilities
**Confidence:** HIGH

## Summary

Phase 9 establishes the foundational type system and validation infrastructure for the wizard feature. Research reveals that the codebase currently uses TypeScript-only type definitions (no Zod), with types organized in domain-specific directories. The unused `clarifications` parameter in generation functions expects `Record<string, string>` format and is already integrated into prompt builders.

The standard approach is TypeScript interfaces for internal boundaries and Zod schemas for external data validation. However, wizard data originates from `@inquirer/prompts` (already a dependency) which provides type-safe validation at collection time, questioning the need for additional runtime validation.

**Primary recommendation:** Define TypeScript interfaces in new `src/wizard/types.ts`, export formatting utilities, and defer Zod schema decision to planning phase where trade-offs can be evaluated against actual wizard implementation needs.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.5+ | Compile-time type safety | Already used throughout codebase, provides interface definitions and type inference |
| Bun test | Latest | Testing framework | Project standard, built-in to runtime, no additional dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 3.x | Runtime validation | **Deferred decision** — use for untrusted external data (APIs, user files), not needed for type-safe prompt libraries |
| @inquirer/prompts | 8.2.0 | Interactive prompts | Already dependency, provides type-safe input validation at collection time |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| TypeScript interfaces | Zod-first with type inference | Zod adds runtime overhead for data already validated by @inquirer/prompts |
| Record<string, string> | Custom class with methods | Over-engineering for simple key-value context |
| Separate formatters per type | Single generic formatter | Generic harder to implement but more maintainable |

**Installation:**
```bash
# No new dependencies needed for TypeScript-only approach
# IF Zod is chosen during planning:
bun add zod
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── wizard/              # New directory for wizard system
│   ├── types.ts        # WizardContext interfaces, formatters
│   ├── types.test.ts   # Unit tests for formatters and validation
│   └── (future)        # role.ts, playbook.ts added in Phase 10-11
├── generation/
│   ├── prompts/
│   │   ├── plan.ts     # Already has clarifications parameter
│   │   └── playbook-plan.ts  # Already has clarifications parameter
│   └── generate-role.ts      # clarifications?: Record<string, string>
└── types/               # Existing shared types directory
    └── cli.ts          # CLI-specific types (not wizard types)
```

### Pattern 1: Domain-Specific Type Files
**What:** Each domain module exports its own interfaces in same directory as implementation
**When to use:** When types are tightly coupled to domain logic (e.g., validation types next to validator)
**Example:**
```typescript
// Source: src/generation/schemas/plan-preview.ts
export interface PlanPreview {
  role_name: string;
  description: string;
  tasks: PlanTask[];
  variables: PlanVariable[];
  handlers: string[];
  templates: string[];
  platforms: string[];
}

export const PLAN_PREVIEW_SCHEMA = {
  type: 'object',
  properties: { /* JSON schema for Anthropic API */ },
  required: ['role_name', 'description', /* ... */],
} as const;
```

### Pattern 2: Flat Interface Definitions
**What:** Simple interfaces with required fields, minimal nesting
**When to use:** Configuration-like data structures
**Example:**
```typescript
// Source: src/config/schema.ts
export interface Config {
  api: ApiConfig;
  defaults: DefaultsConfig;
  output: OutputConfig;
}

export interface DefaultsConfig {
  model: 'sonnet' | 'opus';  // Union types for enums
  complex: boolean;
}
```

### Pattern 3: Function Parameters for Optional Context
**What:** Optional parameters passed through function chains
**When to use:** Cross-cutting concerns that some call sites provide, others omit
**Example:**
```typescript
// Source: src/generation/generate-role.ts lines 64-71
export async function generateRolePlan(
  client: Anthropic,
  description: string,
  clarifications?: Record<string, string>,  // Optional context
  options: Pick<GenerateOptions, 'quiet' | 'noRetry'> = {},
): Promise<PlanPreview>

// Used in prompt builder at line 88:
const prompt = buildPlanPrompt(description, clarifications);
```

### Pattern 4: Prompt Context Formatting
**What:** Build prompt sections conditionally based on provided context
**When to use:** Adding optional context to AI prompts
**Example:**
```typescript
// Source: src/generation/prompts/plan.ts lines 30-38
const clarificationSection = clarifications
  ? `
## Additional Context (from clarifying questions)

${Object.entries(clarifications)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}
`
  : '';

return `Create a detailed plan for an Ansible role based on this request.

## User Request
"${userDescription}"
${clarificationSection}
## Plan Requirements
...`;
```

### Anti-Patterns to Avoid
- **JSON schemas for internal boundaries:** Project uses JSON schemas exclusively for Anthropic API structured outputs, not internal validation
- **Shared global types file:** No `src/types/shared.ts` dumping ground — types live with their domain
- **Class-based configuration objects:** Config uses plain interfaces, not classes with methods
- **Mixed promise/callback patterns:** All async uses async/await, no callbacks

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime validation | Custom validation functions | Zod (if needed) | Type inference, composition, error messages, ecosystem |
| Interactive prompts | Custom readline wrapper | @inquirer/prompts (already dep) | Accessibility, validation, consistent UX |
| YAML parsing | String manipulation | yaml library (already dep) | Edge cases, spec compliance, type safety |
| Test assertions | Custom matchers | Bun test expect() | Rich matchers, async support, error messages |

**Key insight:** This codebase prefers TypeScript-first design with minimal runtime overhead. Zod should only be added if runtime validation provides clear value over @inquirer's type-safe prompts.

## Common Pitfalls

### Pitfall 1: Premature Zod Adoption
**What goes wrong:** Add Zod validation for data already validated by type-safe libraries
**Why it happens:** "Always validate untrusted data" advice applied without considering source trust
**How to avoid:**
- Trust boundary analysis: @inquirer/prompts validates at collection → TypeScript types sufficient
- Only add Zod if wizard context stored/loaded from untrusted sources (config files, API)
**Warning signs:** Duplicating @inquirer's built-in validation in Zod schemas

### Pitfall 2: Over-Nested Type Hierarchies
**What goes wrong:** Create deep object hierarchies that complicate access patterns
**Why it happens:** Modeling domain concepts too literally in type structure
**How to avoid:**
- Follow codebase pattern: flat interfaces with union types for enums
- Example: `platform: 'Ubuntu' | 'RHEL'` not `platform: { name: 'Ubuntu', family: 'Debian' }`
**Warning signs:** More than 2 levels of object nesting in wizard context types

### Pitfall 3: formatForPrompt() Coupling
**What goes wrong:** Format function tightly coupled to specific AI prompt structure
**Why it happens:** Implementing for current use case without considering reusability
**How to avoid:**
- Return flexible object: `{ key: formatted }` not formatted string
- Let prompt builders decide what to include and how to structure
- Generic enough for both role and playbook prompts
**Warning signs:** Function name includes "plan" or "generate" suggesting narrow scope

### Pitfall 4: Missing Test Coverage for Edge Cases
**What goes wrong:** formatForPrompt() breaks on empty arrays, undefined fields
**Why it happens:** Testing happy path without considering optional/empty data
**How to avoid:**
- Test matrix: required fields only, all fields, arrays with 0/1/multiple items
- Follow project pattern: describe/test blocks with clear scenarios
**Warning signs:** Tests only verify "full context" scenario

## Code Examples

Verified patterns from official sources:

### Type Definition with Union Types
```typescript
// Source: src/config/schema.ts lines 9-12
export interface DefaultsConfig {
  model: 'sonnet' | 'opus';  // String literal union for enum values
  complex: boolean;
}
```

### Optional Parameter with Default Object
```typescript
// Source: src/generation/generate-role.ts lines 68-73
export async function generateRolePlan(
  client: Anthropic,
  description: string,
  clarifications?: Record<string, string>,  // Optional context
  options: Pick<GenerateOptions, 'quiet' | 'noRetry'> = {},  // Default empty object
): Promise<PlanPreview>
```

### Conditional Prompt Section Building
```typescript
// Source: src/generation/prompts/plan.ts lines 30-38
export function buildPlanPrompt(
  userDescription: string,
  clarifications?: Record<string, string>,
): string {
  const clarificationSection = clarifications
    ? `
## Additional Context (from clarifying questions)

${Object.entries(clarifications)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}
`
    : '';

  return `Create a detailed plan...
${clarificationSection}
## Plan Requirements...`;
}
```

### Test Structure
```typescript
// Source: src/generation/role/parser.test.ts lines 1-20
import { describe, expect, test } from 'bun:test';
import { type GeneratedFile, parseGeneratedFiles } from './parser.js';

describe('parseGeneratedFiles', () => {
  describe('valid output parsing', () => {
    test('should parse single file block', () => {
      const output = `=== PATH: tasks/main.yml ===
---
- name: Install nginx
=== END ===`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('tasks/main.yml');
      expect(files[0].content).toContain('Install nginx');
    });
  });

  describe('edge cases', () => {
    test('should return empty array for empty string', () => {
      const files = parseGeneratedFiles('');
      expect(files).toEqual([]);
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate type and schema definitions | TypeScript interface + JSON schema as const | N/A (existing pattern) | Single source of truth for Anthropic API integration |
| Zod for all validation | TypeScript-only for internal boundaries | N/A (project standard) | Simpler types, less runtime overhead |
| Classes for config | Plain interfaces | N/A (project standard) | Easier serialization, no this context |
| Global shared types | Domain-specific type files | N/A (project standard) | Better encapsulation, clearer dependencies |

**Deprecated/outdated:**
- None identified — codebase appears modern and consistent

## Open Questions

Things that couldn't be fully resolved:

1. **Zod adoption decision**
   - What we know: Codebase doesn't use Zod currently, @inquirer/prompts provides type-safe validation
   - What's unclear: Whether wizard context needs persistence (loading from config file) or only in-memory passing
   - Recommendation: Start with TypeScript-only, add Zod if Phase 13 (Defaults Management) requires validating loaded config

2. **formatForPrompt() return type**
   - What we know: Current clarifications uses `Record<string, string>`, prompt builders expect optional parameter
   - What's unclear: Whether returned object should match input type exactly or allow richer formatting
   - Recommendation: Return `Record<string, string>` for compatibility with existing prompt builders, document formatting behavior in tests

3. **Context persistence format**
   - What we know: Phase 13 saves defaults to config file (TOML), current config uses smol-toml library
   - What's unclear: Whether wizard context is subset of config or separate storage
   - Recommendation: Design types to be serializable (no functions/classes), defer storage implementation to Phase 13

## Sources

### Primary (HIGH confidence)
- **Codebase analysis:**
  - `src/generation/generate-role.ts` (clarifications parameter pattern)
  - `src/generation/prompts/plan.ts` (prompt formatting pattern)
  - `src/config/schema.ts` (type definition pattern)
  - `src/generation/role/parser.test.ts` (test structure pattern)
  - `package.json` (existing dependencies: @inquirer/prompts 8.2.0)

### Secondary (MEDIUM confidence)
- [@inquirer/prompts documentation](https://github.com/SBoudrias/Inquirer.js) - Type-safe interactive prompts
- [Zod official site](https://zod.dev/) - Runtime validation capabilities

### Tertiary (LOW confidence)
- [Why You Should Use Zod Instead of TypeScript Alone](https://medium.com/@rv.bobrovskiy/why-you-should-use-zod-instead-of-typescript-alone-e3f349f44b0c) - Validation best practices
- [TypeScript vs Zod: When to use each](https://blog.logrocket.com/when-use-zod-typescript-both-developers-guide/) - Use case guidance
- [When should you use Zod?](https://www.totaltypescript.com/when-should-you-use-zod) - Trust boundary analysis

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Codebase analysis shows clear TypeScript-first pattern, @inquirer already dependency
- Architecture: HIGH - Multiple examples found of domain-specific types, flat interfaces, optional parameters
- Pitfalls: MEDIUM - Based on web research and general TypeScript patterns, not project-specific incidents
- Zod decision: MEDIUM - Clear that codebase doesn't use Zod currently, but persistence needs unclear until Phase 13

**Research date:** 2026-01-21
**Valid until:** 30 days (stable TypeScript patterns, Zod ecosystem stable)
