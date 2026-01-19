/**
 * Plan preview prompt builder for playbooks.
 *
 * Generates a prompt that instructs the AI to create a structured
 * plan of what the playbook project will contain before generating code.
 */

/**
 * Build a prompt for generating a playbook plan preview.
 *
 * The AI will create a detailed breakdown of the playbook structure
 * including plays, tasks, group_vars, and inventory groups.
 *
 * @param description - Natural language description of the desired playbook
 * @param clarifications - Optional answers to clarifying questions
 * @returns Prompt string for the AI to generate a plan preview
 *
 * @example
 * ```typescript
 * const prompt = buildPlaybookPlanPrompt(
 *   'Deploy LAMP stack to web and database servers',
 *   { 'database': 'MySQL', 'webserver': 'Apache' }
 * );
 * ```
 */
export function buildPlaybookPlanPrompt(
  description: string,
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

  return `Create a detailed plan for an Ansible playbook based on this request.

## User Request
"${description}"
${clarificationSection}
## Plan Requirements

Create a comprehensive plan that includes:

1. **playbook_name** - A valid playbook name (lowercase, hyphens allowed)
2. **description** - Clear, concise description of what the playbook does
3. **plays** - List of plays in execution order
4. **group_vars** - Variables organized by inventory group
5. **inventory_groups** - List of inventory group names needed

## Play Format

For each play, specify:
- **name**: Descriptive play name
- **hosts**: Target hosts pattern (e.g., "webservers", "all", "databases")
- **purpose**: What this play accomplishes
- **tasks**: List of tasks with name, module (FQCN), and purpose
- **handlers**: Handler names for this play
- **has_pre_tasks**: Whether play needs pre_tasks for validation
- **has_post_tasks**: Whether play needs post_tasks for verification

## Task Module Requirements

For each task, use FQCN (Fully Qualified Collection Names):
- ansible.builtin.apt, ansible.builtin.dnf, ansible.builtin.package
- ansible.builtin.file, ansible.builtin.copy, ansible.builtin.template
- ansible.builtin.service, ansible.builtin.systemd_service
- ansible.builtin.user, ansible.builtin.group
- ansible.builtin.assert, ansible.builtin.fail, ansible.builtin.debug

## Pre-tasks Best Practices

Use pre_tasks for:
- Variable validation with ansible.builtin.assert
- Prerequisite checks
- Gathering additional facts

Example pre_tasks validation:
\`\`\`yaml
pre_tasks:
  - name: Validate required variables
    ansible.builtin.assert:
      that:
        - db_password is defined
        - db_password | length > 8
\`\`\`

## Group Variables Format

For each group, specify:
- **group**: Group name (e.g., "all", "webservers", "databases")
- **variables**: List of variables with name, optional default, and description

Variables should be organized by purpose:
- all.yml: Global settings, common packages
- [group].yml: Group-specific settings

## Output

Respond with a structured plan following the JSON schema that will be enforced.
The plan will be shown to the user for approval before code generation begins.`;
}
