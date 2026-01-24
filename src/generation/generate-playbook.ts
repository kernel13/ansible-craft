/**
 * Playbook generation orchestration.
 *
 * Implements two-phase generation:
 * 1. Plan preview using structured outputs for guaranteed JSON
 * 2. Streaming YAML generation with visual feedback
 *
 * @example
 * ```typescript
 * import Anthropic from '@anthropic-ai/sdk';
 * import { generatePlaybookPlan, generatePlaybookCode } from './generation/generate-playbook.js';
 *
 * const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 * const plan = await generatePlaybookPlan(client, 'deploy LAMP stack');
 * // User reviews/modifies plan...
 * const files = await generatePlaybookCode(client, plan, 'deploy LAMP stack');
 * ```
 */
import type Anthropic from '@anthropic-ai/sdk';
import ora from 'ora';
import { DEFAULT_MODEL } from '../ai/client.js';
import { displayApiError, transformApiError } from '../ai/errors.js';
import { withRetry } from '../ai/retry.js';
import { extractText, streamMessage } from '../ai/stream.js';
import {
  ANSIBLE_PLAYBOOK_SYSTEM_PROMPT,
  buildPlaybookGeneratePrompt,
  buildPlaybookPlanPrompt,
} from './prompts/index.js';
import { type GeneratedFile, parseGeneratedFiles } from './role/index.js';
import { PLAYBOOK_PLAN_SCHEMA, type PlaybookPlanPreview } from './schemas/playbook-plan.js';

/**
 * Options for playbook generation.
 */
export interface PlaybookGenerateOptions {
  /** Skip interactive clarifying questions */
  noInteractive?: boolean;
  /** Custom output directory */
  outputDir?: string;
  /** Override inferred playbook name */
  playbookName?: string;
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
 * Generate a playbook plan preview using structured outputs.
 *
 * Uses Anthropic's structured-outputs-2025-11-13 beta to guarantee
 * the response matches our PlaybookPlanPreview schema.
 *
 * @param client - Configured Anthropic client
 * @param description - Natural language playbook description
 * @param clarifications - Optional answers to clarifying questions
 * @param options - Generation options
 * @returns Validated playbook plan preview
 */
export async function generatePlaybookPlan(
  client: Anthropic,
  description: string,
  clarifications?: Record<string, string>,
  options: Pick<PlaybookGenerateOptions, 'quiet' | 'noRetry'> = {},
): Promise<PlaybookPlanPreview> {
  // Show spinner unless quiet mode
  const spinner = options.quiet
    ? null
    : ora({
        text: 'Generating playbook plan...',
        color: 'cyan',
        spinner: 'dots',
        stream: process.stderr,
      });

  spinner?.start();

  try {
    // Build the plan prompt
    const prompt = buildPlaybookPlanPrompt(description, clarifications);

    // Call Anthropic beta API with structured outputs
    const response = await withRetry(
      async () => {
        return client.beta.messages.create({
          model: DEFAULT_MODEL,
          max_tokens: 4096,
          betas: ['structured-outputs-2025-11-13'],
          system: ANSIBLE_PLAYBOOK_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
          output_format: {
            type: 'json_schema',
            schema: PLAYBOOK_PLAN_SCHEMA,
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

    const plan = JSON.parse(textBlock.text) as PlaybookPlanPreview;

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
 * Generate complete playbook code from an approved plan.
 *
 * Streams YAML output with spinner transition on first token.
 * Returns parsed files ready for writing to disk.
 *
 * @param client - Configured Anthropic client
 * @param plan - Approved playbook plan preview
 * @param description - Original natural language description
 * @param options - Generation options
 * @returns Parsed generated files
 */
export async function generatePlaybookCode(
  client: Anthropic,
  plan: PlaybookPlanPreview,
  description: string,
  options: Pick<PlaybookGenerateOptions, 'quiet' | 'noRetry'> = {},
): Promise<GeneratedFile[]> {
  // Build generation prompt
  const prompt = buildPlaybookGeneratePrompt(plan, description);

  // Use streamMessage for visual streaming
  // It handles spinner, streaming tokens, and errors
  const message = await streamMessage(
    client,
    {
      userMessage: prompt,
      systemPrompt: ANSIBLE_PLAYBOOK_SYSTEM_PROMPT,
      maxTokens: 8192, // Playbooks can be large
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
  // Expected minimum: playbook.yml + inventory.example + group_vars/all.yml + README.md = 4
  // Plus one group_vars file per non-all inventory group
  const nonAllGroups = plan.group_vars.filter((g) => g.group !== 'all').length;
  const expectedMinFiles = 4 + nonAllGroups;

  if (files.length < expectedMinFiles && !options.quiet) {
    process.stderr.write(
      `\nWarning: Generated ${files.length} files, expected at least ${expectedMinFiles}\n`,
    );
  }

  return files;
}
