/**
 * Clarifying questions prompt builder.
 *
 * Generates a prompt that instructs the AI to identify ambiguities
 * in the user's role description and ask targeted questions.
 */

/**
 * Build a prompt for generating clarifying questions.
 *
 * The AI will analyze the user's description and identify 3-5 questions
 * that would help produce a better role.
 *
 * @param userDescription - Natural language description of the desired role
 * @returns Prompt string for the AI to generate questions
 *
 * @example
 * ```typescript
 * const prompt = buildClarifyPrompt('Install and configure nginx with SSL');
 * // AI responds with questions about SSL source, OS, virtual hosts, etc.
 * ```
 */
export function buildClarifyPrompt(userDescription: string): string {
  return `Analyze this Ansible role request and identify 3-5 clarifying questions that would help generate a better, more targeted role.

## User Request
"${userDescription}"

## Question Guidelines

Focus questions on areas that are:
1. **Ambiguous** - Multiple valid interpretations exist
2. **Critical** - Answers significantly affect the generated code
3. **Technical** - Cover infrastructure and configuration details

## Question Categories to Consider

- **Target OS/distributions** - Ubuntu, RHEL, multi-platform support
- **Service configuration** - Ports, users, directories, resource limits
- **Security requirements** - SSL/TLS sources, firewall rules, authentication
- **Integration points** - Reverse proxy backends, database connections, external services
- **Scale considerations** - Single server vs cluster, high availability needs

## Output Format

Respond with a JSON array of question objects:
\`\`\`json
[
  {
    "question": "The specific question to ask",
    "default": "A reasonable default if the user skips this question",
    "reason": "Brief explanation of why this matters for the role"
  }
]
\`\`\`

## Rules

1. Only ask questions about genuinely ambiguous aspects
2. Do NOT ask about things clearly stated in the request
3. Provide sensible defaults that work for common cases
4. Keep questions concise and actionable
5. Output valid JSON only, no additional text`;
}
