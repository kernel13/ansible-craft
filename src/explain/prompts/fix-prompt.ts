/**
 * System and user prompts for the fix command.
 *
 * Produces error explanations followed by corrected YAML code.
 * Output format enforces extractable ```yaml blocks for applying fixes.
 */

import type { ContextExtraction } from '../context-extractor.js';

/**
 * System prompt establishing Claude as an Ansible error fixer.
 *
 * Enforces consistent output format with required sections:
 * - Error Explanation (why it failed)
 * - Root Cause (technical reason)
 * - Corrected Code (YAML block)
 * - What Changed (specific modifications)
 * - Additional Recommendations (optional improvements)
 *
 * Ensures corrected code uses FQCN, idempotency patterns, and proper formatting.
 */
export const FIX_SYSTEM_PROMPT = `You are an Ansible expert helping DevOps engineers fix errors in their Ansible code.

Your responses should:
1. Explain WHY the error occurred in plain English
2. Provide the CORRECTED code that fixes the issue
3. Note any additional issues you spot while fixing

ALWAYS use this output format:

## Error Explanation
[1-2 paragraphs explaining what went wrong and why]

## Root Cause
[Specific technical reason - e.g., "undefined variable", "YAML syntax", "module parameter"]

## Corrected Code
\`\`\`yaml
[The corrected YAML code - complete task or section, not just the changed line]
\`\`\`

## What Changed
[Bullet list of specific changes made]

## Additional Recommendations
[Optional: other issues spotted or improvements suggested]

IMPORTANT RULES:
- Use FQCN for all modules (ansible.builtin.*, ansible.posix.*, etc.)
- Ensure tasks are idempotent (state parameter, creates/removes for commands)
- Quote Jinja2 variables: "{{ variable }}"
- Use 2-space indentation
- If the error message is incomplete, provide best-effort analysis and note limitations

If you cannot determine the fix with confidence, say so clearly rather than guessing.`;

/**
 * Build user prompt for fix command.
 *
 * Incorporates context from --playbook flag when provided:
 * - Code around the failing task (taskContext)
 * - Variables available in scope
 * - Handlers defined in the playbook/role
 *
 * Suggests using --playbook flag when no context is provided for better analysis.
 *
 * @param errorMessage - Ansible error message to analyze
 * @param context - Optional context from playbook/role (via --playbook)
 * @returns User prompt with error and context
 */
export function buildFixPrompt(errorMessage: string, context?: ContextExtraction): string {
  let prompt = 'Fix this Ansible error:\n\n';
  prompt += `ERROR MESSAGE:\n\`\`\`\n${errorMessage}\n\`\`\`\n\n`;

  if (context) {
    prompt += 'CONTEXT FROM PLAYBOOK/ROLE:\n';

    if (context.taskContext) {
      prompt += `Code around the failing task:\n\`\`\`yaml\n${context.taskContext}\n\`\`\`\n\n`;
    }

    if (Object.keys(context.variables).length > 0) {
      prompt += `Available variables:\n${JSON.stringify(context.variables, null, 2)}\n\n`;
    }

    if (context.handlers.length > 0) {
      prompt += `Available handlers: ${context.handlers.join(', ')}\n\n`;
    }
  } else {
    prompt += 'Note: No playbook context provided. For better results, use --playbook flag.\n\n';
  }

  prompt += 'Analyze this error and provide a fix following the output format.';

  return prompt;
}
