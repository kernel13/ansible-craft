/**
 * Code generation prompt builder for playbooks.
 *
 * Generates a prompt that instructs the AI to produce complete
 * Ansible playbook project files based on an approved plan.
 */

/**
 * Task in a playbook plan.
 */
interface PlaybookPlanTask {
  name: string;
  module: string;
  purpose: string;
  role_extraction_hint?: string;
}

/**
 * Play in a playbook plan.
 */
interface PlaybookPlanPlay {
  name: string;
  hosts: string;
  purpose: string;
  tasks: PlaybookPlanTask[];
  handlers: string[];
  has_pre_tasks?: boolean;
  has_post_tasks?: boolean;
}

/**
 * Variable in a group_vars file.
 */
interface PlaybookPlanVariable {
  name: string;
  default?: string;
  description: string;
}

/**
 * Group variables for a specific inventory group.
 */
interface PlaybookPlanGroupVar {
  group: string;
  variables: PlaybookPlanVariable[];
}

/**
 * Complete playbook plan preview.
 *
 * Note: This interface is defined locally until the schema module is created.
 * It will be replaced with an import from '../schemas/playbook-plan.js' when available.
 */
export interface PlaybookPlanPreview {
  playbook_name: string;
  description: string;
  plays: PlaybookPlanPlay[];
  group_vars: PlaybookPlanGroupVar[];
  inventory_groups: string[];
}

/**
 * Build a prompt for generating complete Ansible playbook project code.
 *
 * The AI will generate all playbook files using a specific marker format
 * that can be parsed to extract individual files.
 *
 * @param plan - The approved playbook plan preview
 * @param description - Original natural language description
 * @returns Prompt string for the AI to generate playbook code
 *
 * @example
 * ```typescript
 * const prompt = buildPlaybookGeneratePrompt(approvedPlan, 'Deploy LAMP stack');
 * // AI generates all files with === PATH: ... === markers
 * ```
 */
export function buildPlaybookGeneratePrompt(
  plan: PlaybookPlanPreview,
  description: string,
): string {
  const playsSection = plan.plays
    .map((p, i) => {
      const tasks = p.tasks.map((t) => `    - ${t.name} (${t.module})`).join('\n');
      return `${i + 1}. **${p.name}** (hosts: ${p.hosts})
   Purpose: ${p.purpose}
   Tasks:
${tasks}
   Handlers: ${p.handlers.length > 0 ? p.handlers.join(', ') : 'None'}
   Pre-tasks: ${p.has_pre_tasks ? 'Yes' : 'No'}
   Post-tasks: ${p.has_post_tasks ? 'Yes' : 'No'}`;
    })
    .join('\n\n');

  const groupVarsSection = plan.group_vars
    .map((g) => {
      const vars = g.variables
        .map((v) => `  - ${v.name}: ${v.default ?? 'required'} - ${v.description}`)
        .join('\n');
      return `**group_vars/${g.group}.yml:**
${vars}`;
    })
    .join('\n\n');

  return `Generate a complete Ansible playbook project based on this approved plan.

## Original Request
"${description}"

## Approved Plan

**Playbook Name:** ${plan.playbook_name}
**Description:** ${plan.description}
**Inventory Groups:** ${plan.inventory_groups.join(', ')}

### Plays (in execution order)
${playsSection}

### Group Variables
${groupVarsSection}

## Output Format

Generate each file using this exact marker format:

=== PATH: playbook.yml ===
---
[content]
=== END ===

=== PATH: inventory.example ===
[content]
=== END ===

=== PATH: group_vars/all.yml ===
---
[content]
=== END ===

## Required Files

1. **playbook.yml** - All plays with tasks, handlers, pre_tasks, post_tasks
2. **inventory.example** - INI format with all groups from inventory_groups
3. **group_vars/all.yml** - Global variables
4. **group_vars/[group].yml** - One file per non-all group in group_vars
5. **README.md** - Usage instructions with ansible-playbook examples

## Reminders

- Use FQCN for ALL modules (ansible.builtin.*, community.*)
- Every task needs a descriptive \`name:\` field
- Always specify \`state:\` parameter
- Handlers are per-play, not global
- become: on tasks that need it, not play-level
- Add role extraction comments for reusable task groups
- Include assert/fail in pre_tasks for validation
- Include verification in post_tasks (uri, wait_for)
- group_vars use section headers (# Network settings)
- Comments explain "why" not "what"
- Use \`true\`/\`false\`, not \`yes\`/\`no\`
- Quote Jinja2 variables: \`"{{ var }}"\`
- 2-space indentation throughout

Generate complete, production-ready code. Do not use placeholders or TODOs.`;
}
