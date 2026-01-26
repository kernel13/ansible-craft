/**
 * Ansible Planner Agent.
 *
 * Generates and refines role/playbook plans from natural language descriptions
 * using Claude's structured outputs API.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { DEFAULT_MODEL, createClient } from '../ai/client.js';
import { transformApiError } from '../ai/errors.js';
import { withRetry } from '../ai/retry.js';
import {
  ANSIBLE_EXPERT_SYSTEM_PROMPT,
  ANSIBLE_PLAYBOOK_SYSTEM_PROMPT,
  buildPlanPrompt,
  buildPlaybookPlanPrompt,
} from '../generation/prompts/index.js';
import { PLAN_PREVIEW_SCHEMA, type PlanPreview } from '../generation/schemas/plan-preview.js';
import {
  PLAYBOOK_PLAN_SCHEMA,
  type PlaybookPlanPreview,
} from '../generation/schemas/playbook-plan.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type PlannerInput,
  type PlannerOutput,
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
 * Get the appropriate plan prompt for the generation type.
 */
function getPlanPrompt(
  type: 'role' | 'playbook',
  description: string,
  clarifications?: Record<string, string>,
): string {
  return type === 'role'
    ? buildPlanPrompt(description, clarifications)
    : buildPlaybookPlanPrompt(description, clarifications);
}

/**
 * Get the appropriate JSON schema for the generation type.
 */
function getSchema(type: 'role' | 'playbook'): unknown {
  return type === 'role' ? PLAN_PREVIEW_SCHEMA : PLAYBOOK_PLAN_SCHEMA;
}

/**
 * Ansible Planner Agent implementation.
 *
 * Generates structured plan previews using Claude's structured outputs API.
 * Supports both role and playbook generation.
 */
export class PlannerAgent implements Agent<PlannerInput, PlannerOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.planner.name;
  readonly description = DEFAULT_AGENT_CONFIGS.planner.description;

  private client: Anthropic | null = null;
  private maxRetries: number;

  constructor(options?: { client?: Anthropic; maxRetries?: number }) {
    this.client = options?.client ?? null;
    this.maxRetries = options?.maxRetries ?? DEFAULT_AGENT_CONFIGS.planner.retries;
  }

  /**
   * Execute plan generation.
   */
  async execute(input: PlannerInput, context: AgentContext): Promise<AgentResult<PlannerOutput>> {
    const startTime = Date.now();
    const { description, type, clarifications, feedback } = input;

    // Publish start message
    await globalMessageBus.publish(
      MessageTypes.PLAN_START,
      { type, description: description.substring(0, 100) },
      this.name,
    );

    try {
      // Get or create client
      const client = this.client ?? this.createClientFromContext(context);

      // Build prompt - include feedback if this is a refinement
      const userDescription = feedback
        ? `${description}\n\n## Refinement Request\n${feedback}`
        : description;
      const prompt = getPlanPrompt(type, userDescription, clarifications);
      const systemPrompt = getSystemPrompt(type);
      const schema = getSchema(type);

      // Call Anthropic beta API with structured outputs
      const response = await withRetry(
        async () => {
          return client.beta.messages.create({
            model: DEFAULT_MODEL,
            max_tokens: 4096,
            betas: ['structured-outputs-2025-11-13'],
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            output_format: {
              type: 'json_schema',
              schema: schema as Record<string, unknown>,
            },
          });
        },
        { noRetry: this.maxRetries === 0, quiet: context.quiet },
      );

      // Parse the JSON response
      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in response');
      }

      const plan = JSON.parse(textBlock.text) as PlanPreview | PlaybookPlanPreview;
      const duration = Date.now() - startTime;

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.PLAN_COMPLETE,
        {
          type,
          name:
            type === 'role'
              ? (plan as PlanPreview).role_name
              : (plan as PlaybookPlanPreview).playbook_name,
          duration,
        },
        this.name,
      );

      const output: PlannerOutput = {
        plan: plan as PlanPreview,
        suggestedClarifications: this.extractSuggestedClarifications(plan),
      };

      return successResult(output, duration);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(MessageTypes.PLAN_ERROR, { error: String(error) }, this.name);

      // Transform API errors for better messages
      const apiError = transformApiError(error);
      const errorMessage = apiError?.message || String(error);

      return failureResult(
        [
          createAgentError(this.name, 'PLAN_ERROR', errorMessage, {
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

  /**
   * Extract any suggested clarification questions from the plan.
   * This helps users refine their requirements.
   */
  private extractSuggestedClarifications(
    plan: PlanPreview | PlaybookPlanPreview,
  ): string[] | undefined {
    // For now, return undefined - in the future, we could analyze the plan
    // and suggest clarifications based on incomplete or ambiguous elements
    return undefined;
  }
}

/**
 * Create a planner agent with optional configuration.
 */
export function createPlannerAgent(options?: {
  client?: Anthropic;
  maxRetries?: number;
}): PlannerAgent {
  return new PlannerAgent(options);
}

/**
 * Generate a role plan using the planner agent (convenience function).
 */
export async function generateRolePlan(
  description: string,
  context: AgentContext,
  options?: {
    client?: Anthropic;
    clarifications?: Record<string, string>;
    feedback?: string;
  },
): Promise<AgentResult<PlannerOutput>> {
  const agent = createPlannerAgent({ client: options?.client });
  return agent.execute(
    {
      description,
      type: 'role',
      clarifications: options?.clarifications,
      feedback: options?.feedback,
    },
    context,
  );
}

/**
 * Generate a playbook plan using the planner agent (convenience function).
 */
export async function generatePlaybookPlan(
  description: string,
  context: AgentContext,
  options?: {
    client?: Anthropic;
    clarifications?: Record<string, string>;
    feedback?: string;
  },
): Promise<AgentResult<PlannerOutput>> {
  const agent = createPlannerAgent({ client: options?.client });
  return agent.execute(
    {
      description,
      type: 'playbook',
      clarifications: options?.clarifications,
      feedback: options?.feedback,
    },
    context,
  );
}
