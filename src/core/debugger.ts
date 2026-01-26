/**
 * Ansible Debugger Agent.
 *
 * Diagnoses Ansible errors and provides fix suggestions.
 * Supports --complex flag for deeper analysis with Claude Opus.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../ai/client.js';
import { transformApiError } from '../ai/errors.js';
import { selectModel } from '../ai/models.js';
import { type MessageParams, extractText, streamMessage } from '../ai/stream.js';
import { extractYamlFromResponse, locateTargetFile } from '../explain/fix-applier.js';
import {
  type ContextExtraction,
  detectLowConfidence,
  extractFixContext,
} from '../explain/index.js';
import { FIX_SYSTEM_PROMPT, buildFixPrompt } from '../explain/prompts/index.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type DebuggerInput,
  type DebuggerOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Ansible Debugger Agent implementation.
 *
 * Analyzes Ansible errors and provides fix suggestions.
 */
export class DebuggerAgent implements Agent<DebuggerInput, DebuggerOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.debugger.name;
  readonly description = DEFAULT_AGENT_CONFIGS.debugger.description;

  private client: Anthropic | null = null;
  private maxRetries: number;

  constructor(options?: { client?: Anthropic; maxRetries?: number }) {
    this.client = options?.client ?? null;
    this.maxRetries = options?.maxRetries ?? DEFAULT_AGENT_CONFIGS.debugger.retries;
  }

  /**
   * Execute error diagnosis.
   */
  async execute(input: DebuggerInput, context: AgentContext): Promise<AgentResult<DebuggerOutput>> {
    const startTime = Date.now();
    const { errorMessage, playbookContext, useComplex } = input;

    // Publish start message
    await globalMessageBus.publish(MessageTypes.DEBUG_START, { useComplex }, this.name);

    try {
      // Get or create client
      const client = this.client ?? this.createClientFromContext(context);

      // Select model based on --complex flag
      const modelSelection = await selectModel(useComplex);
      if (!modelSelection.confirmed) {
        return failureResult(
          [createAgentError(this.name, 'MODEL_DECLINED', 'Model selection declined by user')],
          Date.now() - startTime,
        );
      }

      // Try to locate target file from error
      const targetFile = locateTargetFile(errorMessage);

      // Extract context if playbook provided
      let extractedContext: ContextExtraction | undefined;
      if (playbookContext) {
        try {
          extractedContext = await extractFixContext(errorMessage, playbookContext);
        } catch {
          // Continue without context
        }
      }

      // Build prompt
      const prompt = buildFixPrompt(errorMessage, extractedContext);

      // Stream the diagnosis
      let fullResponse = '';
      const messageParams: MessageParams = {
        userMessage: prompt,
        systemPrompt: FIX_SYSTEM_PROMPT,
        model: modelSelection.model,
        maxTokens: 4096,
      };

      const message = await streamMessage(client, messageParams, {
        quiet: context.quiet,
        noRetry: this.maxRetries === 0,
        onText: (text) => {
          fullResponse += text;
        },
      });

      // Extract full text if streaming didn't capture it
      if (!fullResponse) {
        fullResponse = extractText(message);
      }

      const duration = Date.now() - startTime;

      // Try to extract YAML fix from response
      const suggestedFix = extractYamlFromResponse(fullResponse);

      // Detect confidence level
      const lowConfidence = detectLowConfidence(fullResponse);
      const confidence = lowConfidence ? 'low' : 'high';

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.DEBUG_COMPLETE,
        {
          hasFix: suggestedFix !== null,
          hasTargetFile: targetFile !== undefined,
          confidence,
          duration,
        },
        this.name,
      );

      const output: DebuggerOutput = {
        diagnosis: fullResponse,
        suggestedFix: suggestedFix ?? undefined,
        targetFile,
        confidence,
      };

      const warnings: string[] = [];
      if (!useComplex && lowConfidence) {
        warnings.push(
          'This analysis shows uncertainty. Consider using --complex for deeper analysis.',
        );
      }
      if (!playbookContext && !targetFile) {
        warnings.push('No playbook context provided. Use --playbook for better analysis.');
      }

      return successResult(output, duration, warnings);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(MessageTypes.DEBUG_ERROR, { error: String(error) }, this.name);

      // Transform API errors for better messages
      const apiError = transformApiError(error);
      const errorMessage2 = apiError?.message || String(error);

      return failureResult(
        [
          createAgentError(this.name, 'DEBUG_ERROR', errorMessage2, {
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
 * Create a debugger agent with optional configuration.
 */
export function createDebuggerAgent(options?: {
  client?: Anthropic;
  maxRetries?: number;
}): DebuggerAgent {
  return new DebuggerAgent(options);
}

/**
 * Debug an Ansible error using the debugger agent (convenience function).
 */
export async function debugAnsibleError(
  errorMessage: string,
  context: AgentContext,
  options?: {
    client?: Anthropic;
    playbookContext?: string;
    useComplex?: boolean;
  },
): Promise<AgentResult<DebuggerOutput>> {
  const agent = createDebuggerAgent({ client: options?.client });
  return agent.execute(
    {
      errorMessage,
      playbookContext: options?.playbookContext,
      useComplex: options?.useComplex ?? false,
    },
    context,
  );
}
