# Generation Flow

Detailed explanation of the two-phase generation process.

## Overview

ansible-craft uses a two-phase approach to generate high-quality Ansible code:

1. **Plan Phase**: Generate and review a structured plan
2. **Code Phase**: Generate actual YAML code based on approved plan

This ensures users can review and refine requirements before committing to code generation.

## Phase 1: Plan Preview

### Purpose

- Generate a structured outline of what will be created
- Allow user review and modification
- Reduce wasted API calls and regenerations

### Implementation

Uses Anthropic's **Structured Outputs** beta API to guarantee valid JSON:

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  betas: ['structured-outputs-2025-11-13'], // Ensure valid JSON
  messages: [{
    role: 'user',
    content: buildPlanPrompt(description)
  }],
  response_format: {
    type: 'json_schema',
    json_schema: planPreviewSchema // Defined in schemas/plan-preview.ts
  }
})
```

### Plan Preview Schema

```typescript
// src/generation/schemas/plan-preview.ts
export const planPreviewSchema = {
  type: 'object',
  required: ['name', 'description', 'tasks', 'variables', 'handlers'],
  properties: {
    name: {
      type: 'string',
      description: 'Role name (snake_case)'
    },
    description: {
      type: 'string',
      description: 'Brief description of the role'
    },
    tasks: {
      type: 'array',
      description: 'Tasks that will be created',
      items: {
        type: 'object',
        required: ['name', 'module'],
        properties: {
          name: { type: 'string' },
          module: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    variables: {
      type: 'array',
      description: 'Variables with defaults',
      items: {
        type: 'object',
        required: ['name', 'default'],
        properties: {
          name: { type: 'string' },
          default: { type: ['string', 'number', 'boolean'] },
          description: { type: 'string' }
        }
      }
    },
    handlers: {
      type: 'array',
      description: 'Handlers that will be created',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    templates: {
      type: 'array',
      description: 'Jinja2 templates',
      items: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' }
        }
      }
    },
    files: {
      type: 'array',
      description: 'Static files',
      items: { type: 'string' }
    }
  }
}
```

### User Interaction

After plan generation, user can:

**1. Accept** - Proceed to code generation
```
✓ Plan looks good!
Generating code...
```

**2. Modify** - Provide additional requirements
```
✎ Modifications needed:
- Also include SSL configuration
- Add log rotation
```

**3. Reject** - Cancel generation
```
✗ Cancelling generation
```

### Interactive Wizard

If `--no-interactive` is not set, ansible-craft may ask clarifying questions:

```typescript
// src/wizard/role-wizard.ts
if (needsClarification(planPreview)) {
  const answers = await askClarifyingQuestions(planPreview)
  // Incorporate answers into plan
}
```

Example questions:
- "Which Linux distributions should be supported?"
- "Should SSL certificates use Let's Encrypt or manual?"
- "What Python version is required?"

## Phase 2: Code Generation

### Purpose

- Generate actual YAML code based on approved plan
- Stream output for real-time feedback
- Validate generated code

### Implementation

```typescript
// src/generation/generate-role.ts
export async function generateRole(
  description: string,
  plan: PlanPreview,
  options: GenerateOptions
) {
  // Build prompt from approved plan
  const prompt = buildCodePrompt(description, plan)

  // Stream generation with visual feedback
  const content = await streamMessage({
    prompt,
    model: options.complex ? 'opus' : 'sonnet',
    onStart: () => phaseTracker.start('Generating code'),
    onToken: (token) => process.stdout.write(token),
    onComplete: () => phaseTracker.complete('Code generated')
  })

  // Parse generated content
  const structure = parseRoleStructure(content)

  // Validate
  await validateRole(structure)

  // Write files
  await writeRoleFiles(structure, options.output)

  return structure
}
```

### Streaming Display

```
Generating code...
---
# tasks/main.yml
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
    state: present
...
```

Benefits:
- User sees progress in real-time
- Can cancel if generation goes wrong
- More engaging user experience

### Code Prompt Structure

```typescript
function buildCodePrompt(description: string, plan: PlanPreview) {
  return `
Generate a complete Ansible role for: ${description}

Based on the approved plan:
${JSON.stringify(plan, null, 2)}

Requirements:
- Use FQCN for all modules (ansible.builtin.*)
- Follow ansible-lint best practices
- Write idempotent tasks
- Include proper error handling with block/rescue
- Add meaningful task names
- Use variables from the plan with sensible defaults
- Include handlers as specified
- Generate Jinja2 templates as needed
- Include comprehensive README.md

Generate files in this exact format:
---FILE: tasks/main.yml
<content>
---FILE: handlers/main.yml
<content>
...
`
}
```

### Content Parsing

```typescript
// src/generation/role/parser.ts
export function parseRoleStructure(content: string): RoleStructure {
  const files: FileContent[] = []

  // Split by ---FILE: markers
  const sections = content.split(/---FILE:\s+/)

  for (const section of sections) {
    if (!section.trim()) continue

    const [path, ...contentLines] = section.split('\n')
    const fileContent = contentLines.join('\n').trim()

    files.push({
      path: path.trim(),
      content: fileContent
    })
  }

  return { files }
}
```

## Validation Pipeline

After code generation, content passes through validation:

```
Generated Code
    │
    ▼
┌─────────────────┐
│  YAML Syntax    │ ✓ Valid YAML?
│  Validator      │ ✗ Block and show errors
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  FQCN Checker   │ ✓ Uses ansible.builtin.*?
│                 │ ⚠ Warn about short names
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Idempotency    │ ✓ state-based?
│  Checker        │ ⚠ Warn about shell without creates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  ansible-lint   │ ✓ Passes lint?
│  (if available) │ ⚠ Show warnings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auto-fix       │ ✓ Apply fixes?
│  (optional)     │ ✗ User declines
└────────┬────────┘
         │
         ▼
   Write Files
```

See [Validation Pipeline](validation-pipeline.md) for details.

## Error Handling

### Plan Phase Errors

**API Error:**
```
Error: Failed to generate plan preview
Suggestion: Check your API key and network connection
```

**Invalid Description:**
```
⚠ Description is too vague. Please be more specific.
Example: "nginx web server with SSL and gzip compression"
```

### Code Phase Errors

**YAML Syntax Error:**
```
✗ YAML syntax error in tasks/main.yml:15
  mapping values are not allowed here
```

**FQCN Violation:**
```
⚠ Use FQCN: ansible.builtin.apt instead of apt (line 12)
```

**Auto-fix Available:**
```
⚠ Found 3 auto-fixable issues
? Apply fixes automatically? (Y/n)
```

## Performance Optimization

### Caching

Not currently implemented, but planned:
- Cache plan previews for similar descriptions
- Cache validated templates

### Parallel Validation

Validation steps run sequentially to provide clear error messages.
Future: parallel validation with aggregated results.

### Token Optimization

- Plan phase uses minimal tokens (~1K-2K)
- Code phase optimized prompts (~2K-4K input)
- Total: ~3K-6K tokens per role generation

## Model Selection

### Sonnet (Default)

- **Use For**: Most roles and playbooks
- **Characteristics**:
  - Fast (5-10 seconds)
  - Cost-effective (~$0.02-0.05)
  - High quality output

### Opus (Complex Mode)

- **Use For**: Complex multi-component systems
- **Characteristics**:
  - Slower (15-30 seconds)
  - Higher cost (~$0.10-0.25)
  - Highest quality, deeper analysis

**Enable with:**
```bash
ansible-craft new role "complex system" --complex
```

## Retry Logic

API calls include retry with exponential backoff:

```typescript
// src/ai/retry.ts
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3
  const baseDelay = options.baseDelay ?? 1000

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries) throw error
      if (!isRetryableError(error)) throw error

      const delay = baseDelay * Math.pow(2, attempt)
      await sleep(delay)
    }
  }
}
```

Retryable errors:
- Network timeouts
- Rate limit exceeded (429)
- Internal server error (500)

Non-retryable errors:
- Invalid API key (401)
- Bad request (400)

## Future Enhancements

### Planned Features

1. **Iterative Refinement**
   - Generate → Review → Refine → Regenerate
   - Keep conversation context across iterations

2. **Template Library**
   - Save successful generations
   - Reuse patterns across roles

3. **Multi-role Generation**
   - Generate multiple related roles
   - Maintain consistency across roles

4. **Custom Prompts**
   - Allow users to customize system prompts
   - Organization-specific best practices

## See Also

- **[Validation Pipeline](validation-pipeline.md)** - Quality checks
- **[AI Integration](ai-integration.md)** - Anthropic SDK details
- **[Architecture Overview](README.md)** - System design
