/**
 * Role generation orchestration.
 *
 * Implements two-phase generation:
 * 1. Plan preview using structured outputs for guaranteed JSON
 * 2. Streaming YAML generation with visual feedback
 *
 * @example
 * ```typescript
 * import Anthropic from '@anthropic-ai/sdk';
 * import { generateRolePlan, generateRoleCode } from './generation/generate-role.js';
 *
 * const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const plan = await generateRolePlan(client, 'nginx web server with SSL');
 * // User reviews/modifies plan...
 * const files = await generateRoleCode(client, plan, 'nginx web server with SSL');
 * ```
 */
import Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import { DEFAULT_MODEL } from '../ai/client.js';
import { withRetry } from '../ai/retry.js';
import { transformApiError, displayApiError } from '../ai/errors.js';
import { streamMessage, extractText } from '../ai/stream.js';
import { ANSIBLE_EXPERT_SYSTEM_PROMPT, buildPlanPrompt, buildGeneratePrompt } from './prompts/index.js';
import { PLAN_PREVIEW_SCHEMA, type PlanPreview } from './schemas/plan-preview.js';
import { parseGeneratedFiles, type GeneratedFile } from './role/index.js';

/**
 * Options for role generation.
 */
export interface GenerateOptions {
  /** Skip interactive clarifying questions */
  noInteractive?: boolean;
  /** Custom output directory */
  outputDir?: string;
  /** Override inferred role name */
  roleName?: string;
  /** Preview without writing files */
  dryRun?: boolean;
  /** Overwrite existing directory */
  force?: boolean;
  /**
   * Suppress internal spinner/progress output.
   * Use this when external progress tracking (e.g., PhaseTracker) handles display.
   */
  quiet?: boolean;
  /** No retries on failure */
  noRetry?: boolean;
}

/**
 * Generate a role plan preview using structured outputs.
 *
 * Uses Anthropic's structured-outputs-2025-11-13 beta to guarantee
 * the response matches our PlanPreview schema.
 *
 * @param client - Configured Anthropic client
 * @param description - Natural language role description
 * @param clarifications - Optional answers to clarifying questions
 * @param options - Generation options
 * @returns Validated plan preview
 */
export async function generateRolePlan(
  client: Anthropic,
  description: string,
  clarifications?: Record<string, string>,
  options: Pick<GenerateOptions, 'quiet' | 'noRetry'> = {},
): Promise<PlanPreview> {
  // Show spinner unless quiet mode
  const spinner = options.quiet
    ? null
    : ora({
        text: 'Generating role plan...',
        color: 'cyan',
        spinner: 'dots',
        stream: process.stderr,
      });

  spinner?.start();

  try {
    // Build the plan prompt
    const prompt = buildPlanPrompt(description, clarifications);

    // Call Anthropic beta API with structured outputs
    const response = await withRetry(
      async () => {
        return client.beta.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 4096,
          betas: ['structured-outputs-2025-11-13'],
          system: ANSIBLE_EXPERT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          output_format: {
            type: 'json_schema',
            schema: PLAN_PREVIEW_SCHEMA,
          },
        });
      },
      { noRetry: options.noRetry, quiet: options.quiet },
    );

    // Parse the JSON response
    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text content in response');
    }

    const plan = JSON.parse(textBlock.text) as PlanPreview;

    // Stop spinner on success
    spinner?.stop();

    return plan;
  } catch (error) {
    // Stop spinner on error
    spinner?.stop();

    // Transform and display error if not already handled by withRetry
    if (!(error instanceof Error && 'code' in error)) {
      const cliError = transformApiError(error);
      if (!options.quiet) {
        displayApiError(cliError, false, error);
      }
      throw cliError;
    }

    throw error;
  }
}

/**
 * Generate complete role code from an approved plan.
 *
 * Streams YAML output with spinner transition on first token.
 * Returns parsed files ready for writing to disk.
 *
 * @param client - Configured Anthropic client
 * @param plan - Approved plan preview
 * @param description - Original natural language description
 * @param options - Generation options
 * @returns Parsed generated files
 */
export async function generateRoleCode(
  client: Anthropic,
  plan: PlanPreview,
  description: string,
  options: Pick<GenerateOptions, 'quiet' | 'noRetry'> = {},
): Promise<GeneratedFile[]> {
  // Build generation prompt
  const prompt = buildGeneratePrompt(plan, description);

  // Use streamMessage for visual streaming
  // It handles spinner, streaming tokens, and errors
  const message = await streamMessage(
    client,
    {
      userMessage: prompt,
      systemPrompt: ANSIBLE_EXPERT_SYSTEM_PROMPT,
      maxTokens: 8192, // Roles can be large
    },
    {
      quiet: options.quiet,
      noRetry: options.noRetry,
    },
  );

  // Extract and parse output
  const output = extractText(message);
  const files = parseGeneratedFiles(output);

  // Warn if fewer files than expected based on plan
  const expectedMinFiles = 2 + plan.handlers.length + plan.templates.length; // tasks + defaults + handlers + templates
  if (files.length < expectedMinFiles && !options.quiet) {
    process.stderr.write(
      `\nWarning: Generated ${files.length} files, expected at least ${expectedMinFiles}\n`,
    );
  }

  return files;
}
