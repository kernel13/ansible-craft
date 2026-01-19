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
- **name**: Variable name with role prefix (e.g., nginx_port)
- **default**: Default value (as a string representation)
- **description**: What this variable controls

## Output

Respond with a structured plan following the JSON schema that will be enforced.
The plan will be shown to the user for approval before code generation begins.`;
}
