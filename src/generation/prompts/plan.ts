/**
 * Plan preview prompt builder.
 *
 * Generates a prompt that instructs the AI to create a structured
 * plan of what the role will contain before generating code.
 */

import type { ResearchFindings } from '../../research/index.js';
import type { ExistingRoleContent } from '../role/reader.js';
import { formatExistingRoleForPrompt } from '../role/reader.js';

/**
 * Format research findings for inclusion in planner prompt.
 *
 * @param findings - Research findings to format
 * @returns Formatted research context string
 */
export function formatResearchForPlanner(findings?: ResearchFindings): string {
  if (!findings) return '';

  const sections: string[] = [];

  // Features
  if (findings.features.length > 0) {
    sections.push('**Discovered Features:**');
    for (const feature of findings.features.slice(0, 5)) {
      sections.push(`- ${feature.name} (${feature.category}): ${feature.description}`);
    }
    sections.push('');
  }

  // Packages
  if (findings.packages.length > 0) {
    sections.push('**Available Packages:**');
    for (const pkg of findings.packages.slice(0, 3)) {
      const desc = pkg.description ? `: ${pkg.description}` : '';
      sections.push(`- ${pkg.name} (${pkg.source})${desc}`);
    }
    sections.push('');
  }

  // Best Practices
  if (findings.bestPractices.length > 0) {
    sections.push('**Best Practices:**');
    for (const practice of findings.bestPractices.slice(0, 5)) {
      sections.push(`- ${practice.practice} (${practice.priority})`);
      sections.push(`  Rationale: ${practice.rationale}`);
    }
    sections.push('');
  }

  // Galaxy Roles
  if (findings.galaxyRoles.length > 0) {
    sections.push('**Reference Galaxy Roles:**');
    for (const role of findings.galaxyRoles.slice(0, 3)) {
      const features = role.keyFeatures.length > 0 ? ` - Features: ${role.keyFeatures.join(', ')}` : '';
      sections.push(`- ${role.namespace}.${role.name} (${role.downloads} downloads)${features}`);
    }
    sections.push('');
  }

  if (sections.length === 0) return '';

  return `
## Research Findings

The following information was discovered through research and should inform your plan:

${sections.join('\n')}

Consider these findings when planning the role structure, but adapt them to the specific user requirements.
`;
}

/**
 * Build a prompt for generating a plan preview.
 *
 * The AI will create a detailed breakdown of the role structure
 * including tasks, variables, handlers, and templates.
 *
 * @param userDescription - Natural language description of the desired role
 * @param clarifications - Optional answers to clarifying questions
 * @param researchFindings - Optional research findings
 * @param existingRole - Optional existing role content to improve
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
  researchFindings?: ResearchFindings,
  existingRole?: ExistingRoleContent,
): string {
  const clarificationSection = clarifications
    ? `
## Additional Context (from wizard configuration)

${Object.entries(clarifications)
  .map(([key, value]) => `- **${key}**: ${value}`)
  .join('\n')}
`
    : '';

  const researchSection = formatResearchForPlanner(researchFindings);
  const existingRoleSection = existingRole ? formatExistingRoleForPrompt(existingRole) : '';

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
${clarificationSection}${researchSection}${existingRoleSection}
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
