/**
 * Code generation prompt builder.
 *
 * Generates a prompt that instructs the AI to produce complete
 * Ansible role files based on an approved plan.
 */

import type { PlanPreview } from '../schemas/plan-preview.ts';

/**
 * Build a prompt for generating complete Ansible role code.
 *
 * The AI will generate all role files using a specific marker format
 * that can be parsed to extract individual files.
 *
 * @param plan - The approved plan preview
 * @param userDescription - Original natural language description
 * @returns Prompt string for the AI to generate role code
 *
 * @example
 * ```typescript
 * const prompt = buildGeneratePrompt(approvedPlan, 'Install nginx with SSL');
 * // AI generates all YAML files with === PATH: ... === markers
 * ```
 */
export function buildGeneratePrompt(
  plan: PlanPreview,
  userDescription: string,
): string {
  const tasksSection = plan.tasks
    .map((t, i) => `${i + 1}. ${t.name} (${t.module}) - ${t.purpose}`)
    .join('\n');

  const variablesSection = plan.variables
    .map(
      (v) => `- ${v.name}: ${v.default ?? 'required'} - ${v.description}`,
    )
    .join('\n');

  const handlersSection =
    plan.handlers.length > 0
      ? plan.handlers.map((h) => `- ${h}`).join('\n')
      : '- None required';

  const templatesSection =
    plan.templates.length > 0
      ? plan.templates.map((t) => `- ${t}`).join('\n')
      : '- None required';

  return `Generate a complete Ansible role based on this approved plan.

## Original Request
"${userDescription}"

## Approved Plan

**Role Name:** ${plan.role_name}
**Description:** ${plan.description}
**Platforms:** ${plan.platforms.join(', ')}

### Tasks
${tasksSection}

### Variables (defaults/main.yml)
${variablesSection}

### Handlers
${handlersSection}

### Templates
${templatesSection}

## Output Format

Generate each file using this exact marker format:

=== PATH: path/to/file.yml ===
---
[file content here]
=== END ===

## Required Files

Generate ALL of these files:

1. **tasks/main.yml** - All tasks from the plan
2. **handlers/main.yml** - All handlers (or empty with comment if none)
3. **defaults/main.yml** - All variables with their defaults
4. **vars/main.yml** - Internal variables (or empty with comment)
5. **meta/main.yml** - Galaxy metadata with platforms
6. **README.md** - Galaxy-ready documentation
7. **molecule/default/molecule.yml** - Test configuration
8. **molecule/default/converge.yml** - Test playbook
9. **molecule/default/verify.yml** - Verification tests

If templates are in the plan:
10. **templates/*.j2** - Each template file

## Reminders

- Use FQCN for ALL modules (ansible.builtin.*, community.*)
- Every task needs a descriptive \`name:\` field
- Always specify \`state:\` parameter
- Use handlers for service restarts, never inline
- Quote Jinja2 variables: \`"{{ var }}"\`
- Use \`true\`/\`false\`, not \`yes\`/\`no\`
- 2-space indentation throughout
- Add inline comments for non-obvious logic

Generate complete, production-ready code. Do not use placeholders or TODOs.`;
}
