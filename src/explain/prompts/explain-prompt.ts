/**
 * System and user prompts for the explain command.
 *
 * Produces structured explanations of Ansible code with consistent sections:
 * Purpose, Tasks, Variables, Dependencies, Issues, and Role Structure (for directories).
 */

/**
 * Context extracted from related Ansible files.
 * Will be defined in context-extractor.ts (07-01).
 * Temporary local definition for type safety.
 */
interface ContextExtraction {
  variables: Record<string, unknown>;
  handlers: string[];
  roleStructure?: string;
  taskContext?: string;
}

/** Ansible file types that can be explained */
export type ExplainFileType = 'tasks' | 'handlers' | 'playbook' | 'role' | 'defaults' | 'vars' | 'meta' | 'template';

/**
 * System prompt establishing Claude as an Ansible explainer.
 *
 * Enforces consistent output format with required sections:
 * - Purpose
 * - Tasks Breakdown
 * - Variables Used
 * - Dependencies
 * - Potential Issues
 * - Role Structure (for directories)
 */
export const EXPLAIN_SYSTEM_PROMPT = `You are an Ansible expert helping DevOps engineers understand existing Ansible code.

Your explanations should be:
- Clear and accessible to intermediate Ansible users
- Structured with consistent sections
- Actionable with specific recommendations
- Honest about issues found (non-FQCN, non-idempotent patterns)

When explaining code, ALWAYS use this output format:

## Purpose
[One paragraph explaining what this code accomplishes and when you would use it]

## Tasks Breakdown
[For each task in the file:]
- **[Task name]**: [What it does and why it's needed]

## Variables Used
[For each variable referenced:]
- **[variable_name]**: [Purpose and default value if known]

## Dependencies
[List any:]
- Handlers referenced
- External roles or collections required
- System packages or services needed
- Required Ansible version or modules

## Potential Issues
[Flag any best practice violations:]
- Non-FQCN modules (e.g., "apt" should be "ansible.builtin.apt")
- Non-idempotent tasks (commands without creates/removes)
- Missing error handling
- Hardcoded values that should be variables
- Security concerns

If explaining a full role (directory), add:

## Role Structure
[Describe how the role is organized and how files relate to each other]

Be direct and helpful. Don't pad responses with unnecessary caveats.`;

/**
 * Build user prompt for explain command.
 *
 * Incorporates context from --playbook flag when provided:
 * - Variables available in scope
 * - Handlers defined in the playbook/role
 * - Role structure for directory explanations
 *
 * @param content - File content to explain
 * @param fileType - Type of Ansible file
 * @param context - Optional context from related files (via --playbook)
 * @returns User prompt with content and context
 */
export function buildExplainPrompt(
  content: string,
  fileType: ExplainFileType,
  context?: ContextExtraction
): string {
  let prompt = `Explain the following Ansible ${fileType}:\n\n`;

  if (context) {
    prompt += `CONTEXT FROM RELATED FILES:\n`;
    if (Object.keys(context.variables).length > 0) {
      prompt += `Variables available:\n${JSON.stringify(context.variables, null, 2)}\n\n`;
    }
    if (context.handlers.length > 0) {
      prompt += `Handlers defined: ${context.handlers.join(', ')}\n\n`;
    }
    if (context.roleStructure) {
      prompt += `Role structure:\n${context.roleStructure}\n\n`;
    }
  }

  prompt += `FILE CONTENT:\n\`\`\`yaml\n${content}\n\`\`\``;

  return prompt;
}
