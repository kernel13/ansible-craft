/**
 * Code generation prompt builder.
 *
 * Generates a prompt that instructs the AI to produce complete
 * Ansible role files based on an approved plan.
 */

import type { PlanPreview } from '../schemas/plan-preview.ts';

/**
 * Build generation options from wizard clarifications.
 */
export interface GenerateOptions {
  /** Ansible minimum version */
  ansibleMinVersion?: string;
  /** Whether to include version check task */
  includeVersionCheck?: boolean;
  /** Variable naming convention */
  variableNaming?: string;
  /** Tag strategy */
  tagStrategy?: string;
  /** Tag groups for grouped strategy */
  tagGroups?: string;
  /** Privilege escalation requirement */
  privilegeEscalation?: string;
  /** Become user */
  becomeUser?: string;
  /** Idempotency settings */
  idempotency?: string;
  /** Whether molecule testing is enabled */
  moleculeEnabled?: boolean;
  /** Molecule driver */
  moleculeDriver?: string;
  /** Molecule platforms */
  moleculePlatforms?: string;
  /** Molecule scenarios */
  moleculeScenarios?: string;
}

/**
 * Build a prompt for generating complete Ansible role code.
 *
 * The AI will generate all role files using a specific marker format
 * that can be parsed to extract individual files.
 *
 * @param plan - The approved plan preview
 * @param userDescription - Original natural language description
 * @param options - Generation options from wizard context
 * @returns Prompt string for the AI to generate role code
 *
 * @example
 * ```typescript
 * const prompt = buildGeneratePrompt(approvedPlan, 'Install nginx with SSL', {
 *   moleculeEnabled: true,
 *   moleculeDriver: 'docker',
 * });
 * // AI generates all YAML files with === PATH: ... === markers
 * ```
 */
export function buildGeneratePrompt(
  plan: PlanPreview,
  userDescription: string,
  options: GenerateOptions = {},
): string {
  const tasksSection = plan.tasks
    .map((t, i) => `${i + 1}. ${t.name} (${t.module}) - ${t.purpose}`)
    .join('\n');

  const variablesSection = plan.variables
    .map((v) => `- ${v.name}: ${v.default ?? 'required'} - ${v.description}`)
    .join('\n');

  const handlersSection =
    plan.handlers.length > 0 ? plan.handlers.map((h) => `- ${h}`).join('\n') : '- None required';

  const templatesSection =
    plan.templates.length > 0 ? plan.templates.map((t) => `- ${t}`).join('\n') : '- None required';

  // Build molecule section based on options
  const moleculeFiles =
    options.moleculeEnabled !== false
      ? `7. **molecule/default/molecule.yml** - Test configuration with ${options.moleculeDriver || 'docker'} driver
8. **molecule/default/converge.yml** - Test playbook
9. **molecule/default/verify.yml** - Verification tests`
      : '(Molecule tests not required)';

  // Build tag instructions
  const tagInstructions = options.tagStrategy
    ? {
        none: '',
        'per-task': '- Add a unique, descriptive tag to each task',
        grouped: `- Group tasks with tags: ${options.tagGroups || 'install, config, service'}`,
        always: '- Use "always" tag on critical tasks',
      }[options.tagStrategy] || ''
    : '';

  // Build privilege escalation instructions
  const privilegeInstructions = options.privilegeEscalation
    ? {
        yes: `- Use become: true for all tasks (become_user: ${options.becomeUser || 'root'})`,
        no: '- No privilege escalation needed',
        sometimes: `- Use become: true only where needed (become_user: ${options.becomeUser || 'root'})`,
      }[options.privilegeEscalation] || ''
    : '';

  // Build idempotency instructions
  const idempotencyInstructions = options.idempotency
    ? `- Idempotency: ${options.idempotency}`
    : '';

  // Build version check task instruction
  const versionCheckInstruction = options.includeVersionCheck
    ? `- Include an Ansible version check task at the start (min version: ${options.ansibleMinVersion || '2.14'})`
    : '';

  return `Generate a complete Ansible role based on this approved plan.

## Original Request
"${userDescription}"

## Approved Plan

**Role Name:** ${plan.role_name}
**Description:** ${plan.description}
**Platforms:** ${plan.platforms.join(', ')}
**Minimum Ansible Version:** ${options.ansibleMinVersion || '2.14'}

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
5. **meta/main.yml** - Galaxy metadata with platforms and min_ansible_version: "${options.ansibleMinVersion || '2.14'}"
6. **README.md** - Galaxy-ready documentation
${moleculeFiles}

If templates are in the plan:
10. **templates/*.j2** - Each template file

## Configuration Requirements

${versionCheckInstruction}
${privilegeInstructions}
${tagInstructions}
${idempotencyInstructions}

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
