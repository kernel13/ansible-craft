# Phase 9: Foundation - Context

**Gathered:** 2026-01-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Type definitions and context schema for wizard system. Establishes WizardContext TypeScript interfaces, Zod validation schemas, and formatForPrompt() utility that all subsequent wizard phases depend on. Does NOT include wizard UI, prompts, or CLI integration.

</domain>

<decisions>
## Implementation Decisions

### Context Structure
- Organization: Claude's discretion — flat or nested based on what works best with existing code
- Completeness: All wizard fields are required — no optional fields, wizard must gather everything
- Field types: Rich types — include enums, union types, nested objects for complex choices
- Metadata: Claude's discretion on whether schema includes presentation metadata

### Validation Behavior
- Strictness: Strict mode — reject unknown fields, exact types required, no coercion
- Error handling: Claude's discretion on throw vs result type pattern
- Semantic checks: Type validation only — business logic validated elsewhere, no Zod refinements
- Exports: Claude's discretion on whether to include parsing helper functions

### Prompt Formatting
- Verbosity: Minimal — terse key-value pairs for token efficiency
- Output type: Object — returns `{ key: formattedValue }` for flexible insertion
- Array formatting: Claude's discretion on comma-separated vs bulleted
- Context awareness: Generic formatter — one formatForPrompt() works for any context type

### Extension Points
- Type relationship: Separate types — RoleWizardContext and PlaybookWizardContext are independent
- Scope: Both types defined in this phase — not deferred to playbook phase
- Extensibility: Allow custom fields — schema has optional field for future user-defined data
- Location: `src/wizard/types.ts` — new wizard directory for all wizard-related code

### Claude's Discretion
- Flat vs nested organization for context fields
- Throw vs result type for validation errors
- Whether to export parsing helper functions
- Array formatting in prompt output
- Whether to include presentation metadata in schema

</decisions>

<specifics>
## Specific Ideas

- Wizard context should feel like a configuration object — straightforward to construct and validate
- formatForPrompt() returns object so generation prompts can pick which fields to include
- Custom fields provide escape hatch for unforeseen needs without schema changes

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-foundation*
*Context gathered: 2026-01-21*
