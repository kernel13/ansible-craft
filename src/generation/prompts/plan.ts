/**
 * Plan preview prompt builder.
 *
 * Generates a prompt that instructs the AI to create a structured
 * plan of what the role will contain before generating code.
 */

/**
 * Build a prompt for generating a plan preview.
 *
 * The AI will create a detailed breakdown of the role structure
 * including tasks, variables, handlers, and templates.
 *
 * @param userDescription - Natural language description of the desired role
 * @param clarifications - Optional answers to clarifying questions
 * @returns Prompt string for the AI to generate a plan preview
 *
 * @example
 * ```typescript
 * const prompt = buildPlanPrompt(
 *   'Install and configure nginx with SSL',
 *   { 'ssl_source': 'Let\'s Encrypt', 'os': 'Ubuntu 22.04' }
 * );
 * ```
 */
export function buildPlanPrompt(
  userDescription: string,
  clarifications?: Record<string, string>,
): string {
  const clarificationSection = clarifications
    ? `
## Additional Context (from wizard configuration)

${Object.entries(clarifications)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}
`
    : '';

  // Extract specific wizard settings for specialized instructions
  const variableNaming = clarifications?.variable_naming;
  const tagStrategy = clarifications?.tag_strategy;
  const moleculeTesting = clarifications?.molecule_testing;
  const ansibleVersion = clarifications?.ansible_min_version;
  const privilegeEscalation = clarifications?.privilege_escalation;

  const variableNamingInstruction =
    variableNaming === 'prefixed by role name'
      ? 'Use role name as prefix for all variables (e.g., nginx_port, nginx_user)'
      : 'Use flat variable names without role prefix (e.g., port, user)';

  const tagInstruction = tagStrategy
    ? {
        none: 'Do not add tags to tasks.',
        'per-task': 'Add a unique, descriptive tag to each task.',
        grouped: `Group tasks with logical tags (${clarifications?.tag_groups || 'install, config, service'}).`,
        always: 'Use "always" tag on critical tasks that must run.',
      }[tagStrategy] || ''
    : '';

  const moleculeInstruction =
    moleculeTesting === 'enabled'
      ? `Include Molecule testing with ${clarifications?.molecule_driver || 'docker'} driver.`
      : 'Do not include Molecule tests.';

  const privilegeInstruction = privilegeEscalation
    ? {
        yes: `Role requires privilege escalation (become: true, become_user: ${clarifications?.become_user || 'root'}).`,
        no: 'Role does not require privilege escalation.',
        sometimes: `Some tasks require privilege escalation (become_user: ${clarifications?.become_user || 'root'}).`,
      }[privilegeEscalation] || ''
    : '';

  return `Create a detailed plan for an Ansible role based on this request.

## User Request
"${userDescription}"
${clarificationSection}
## Plan Requirements

Create a comprehensive plan that includes:

1. **role_name** - A valid Ansible role name (lowercase, hyphens allowed)
2. **description** - Clear, concise description of what the role does
3. **tasks** - List of tasks that will be in tasks/main.yml
4. **variables** - Variables to define in defaults/main.yml (with defaults)
5. **handlers** - Event handlers for service management
6. **templates** - Jinja2 template files to generate
7. **platforms** - Supported operating systems

## Task Format

For each task, specify:
- **name**: Descriptive task name
- **module**: FQCN of the Ansible module (e.g., ansible.builtin.apt)
- **purpose**: What this task accomplishes

## Variable Format

For each variable, specify:
- **name**: ${variableNamingInstruction}
- **default**: Default value (as a string representation)
- **description**: What this variable controls

## Configuration Guidelines

${ansibleVersion ? `- Minimum Ansible version: ${ansibleVersion}` : ''}
${privilegeInstruction ? `- ${privilegeInstruction}` : ''}
${tagInstruction ? `- Tagging: ${tagInstruction}` : ''}
${moleculeInstruction ? `- Testing: ${moleculeInstruction}` : ''}

## Output

Respond with a structured plan following the JSON schema that will be enforced.
The plan will be shown to the user for approval before code generation begins.`;
}
