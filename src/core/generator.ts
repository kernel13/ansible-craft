/**
 * Ansible Generator Agent.
 *
 * Generates complete Ansible role/playbook code from approved plans
 * using streaming for real-time feedback.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../ai/client.js';
import { transformApiError } from '../ai/errors.js';
import { extractText, streamMessage } from '../ai/stream.js';
import {
  ANSIBLE_EXPERT_SYSTEM_PROMPT,
  ANSIBLE_PLAYBOOK_SYSTEM_PROMPT,
  buildGeneratePrompt,
  buildPlaybookGeneratePrompt,
} from '../generation/prompts/index.js';
import { type GeneratedFile, parseGeneratedFiles } from '../generation/role/parser.js';
import type { PlanPreview } from '../generation/schemas/plan-preview.js';
import type { PlaybookPlanPreview } from '../generation/schemas/playbook-plan.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type GeneratorInput,
  type GeneratorOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Get the appropriate system prompt for the generation type.
 */
function getSystemPrompt(type: 'role' | 'playbook'): string {
  return type === 'role' ? ANSIBLE_EXPERT_SYSTEM_PROMPT : ANSIBLE_PLAYBOOK_SYSTEM_PROMPT;
}

/**
 * Get the appropriate generation prompt for the type.
 */
function getGeneratePrompt(
  type: 'role' | 'playbook',
  plan: PlanPreview | PlaybookPlanPreview,
  description: string,
): string {
  return type === 'role'
    ? buildGeneratePrompt(plan as PlanPreview, description)
    : buildPlaybookGeneratePrompt(plan as PlaybookPlanPreview, description);
}

/**
 * Get the minimum expected file count based on plan.
 */
function getMinExpectedFiles(
  type: 'role' | 'playbook',
  plan: PlanPreview | PlaybookPlanPreview,
): number {
  if (type === 'role') {
    const rolePlan = plan as PlanPreview;
    // tasks + defaults + handlers + templates
    return 2 + rolePlan.handlers.length + rolePlan.templates.length;
  }
  // playbook: playbook.yml + inventory + README + group_vars
  const playbookPlan = plan as PlaybookPlanPreview;
  return 3 + playbookPlan.group_vars.length;
}

/**
 * Ansible Generator Agent implementation.
 *
 * Generates complete Ansible code from approved plans using streaming.
 */
export class GeneratorAgent implements Agent<GeneratorInput, GeneratorOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.generator.name;
  readonly description = DEFAULT_AGENT_CONFIGS.generator.description;

  private client: Anthropic | null = null;
  private maxRetries: number;

  constructor(options?: { client?: Anthropic; maxRetries?: number }) {
    this.client = options?.client ?? null;
    this.maxRetries = options?.maxRetries ?? DEFAULT_AGENT_CONFIGS.generator.retries;
  }

  /**
   * Execute code generation.
   */
  async execute(
    input: GeneratorInput,
    context: AgentContext,
  ): Promise<AgentResult<GeneratorOutput>> {
    const startTime = Date.now();
    const { plan, description, type } = input;

    // Publish start message
    await globalMessageBus.publish(MessageTypes.GENERATE_START, { type }, this.name);

    try {
      // Get or create client
      const client = this.client ?? this.createClientFromContext(context);

      // Build prompts
      const prompt = getGeneratePrompt(type, plan, description);
      const systemPrompt = getSystemPrompt(type);

      // Track tokens and response
      let tokensUsed = 0;
      let fullOutput = '';

      // Stream the generation
      const message = await streamMessage(
        client,
        {
          userMessage: prompt,
          systemPrompt,
          maxTokens: 8192, // Roles/playbooks can be large
        },
        {
          quiet: context.quiet,
          noRetry: this.maxRetries === 0,
          onText: (text) => {
            fullOutput += text;
            // Publish progress messages
            globalMessageBus.publish(
              MessageTypes.PROGRESS,
              { phase: 'generating', length: fullOutput.length },
              this.name,
            );
          },
        },
      );

      // Extract full text if streaming didn't capture it
      if (!fullOutput) {
        fullOutput = extractText(message);
      }

      // Get token usage from response
      if (message.usage) {
        tokensUsed = message.usage.input_tokens + message.usage.output_tokens;
      }

      // Parse the generated files
      const files = parseGeneratedFiles(fullOutput);
      const duration = Date.now() - startTime;

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.GENERATE_COMPLETE,
        {
          type,
          fileCount: files.length,
          tokensUsed,
          duration,
        },
        this.name,
      );

      const output: GeneratorOutput = {
        files,
        tokensUsed,
      };

      // Check if we got the expected number of files
      const minExpected = getMinExpectedFiles(type, plan);
      const warnings: string[] = [];
      if (files.length < minExpected) {
        warnings.push(`Generated ${files.length} files, expected at least ${minExpected}`);
      }

      // Check if we got any files
      if (files.length === 0) {
        return failureResult(
          [
            createAgentError(
              this.name,
              'NO_FILES_GENERATED',
              'No valid files were generated. The output may be malformed.',
              { recoverable: true },
            ),
          ],
          duration,
          warnings,
        );
      }

      return successResult(output, duration, warnings);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(
        MessageTypes.GENERATE_ERROR,
        { error: String(error) },
        this.name,
      );

      // Transform API errors for better messages
      const apiError = transformApiError(error);
      const errorMessage = apiError?.message || String(error);

      return failureResult(
        [
          createAgentError(this.name, 'GENERATE_ERROR', errorMessage, {
            cause: error instanceof Error ? error : undefined,
            recoverable: true,
          }),
        ],
        duration,
      );
    }
  }

  /**
   * Create an Anthropic client from context.
   */
  private createClientFromContext(context: AgentContext): Anthropic {
    if (!context.config.api.key) {
      throw new Error('API key not configured');
    }
    return createClient({ apiKey: context.config.api.key });
  }
}

/**
 * Create a generator agent with optional configuration.
 */
export function createGeneratorAgent(options?: {
  client?: Anthropic;
  maxRetries?: number;
}): GeneratorAgent {
  return new GeneratorAgent(options);
}

/**
 * Generate role code using the generator agent (convenience function).
 */
export async function generateRoleCode(
  plan: PlanPreview,
  description: string,
  context: AgentContext,
  options?: { client?: Anthropic },
): Promise<AgentResult<GeneratorOutput>> {
  const agent = createGeneratorAgent({ client: options?.client });
  return agent.execute({ plan, description, type: 'role' }, context);
}

/**
 * Generate playbook code using the generator agent (convenience function).
 */
export async function generatePlaybookCode(
  plan: PlaybookPlanPreview,
  description: string,
  context: AgentContext,
  options?: { client?: Anthropic },
): Promise<AgentResult<GeneratorOutput>> {
  const agent = createGeneratorAgent({ client: options?.client });
  return agent.execute({ plan, description, type: 'playbook' }, context);
}
