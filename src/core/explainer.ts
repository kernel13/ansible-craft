/**
 * Ansible Explainer Agent.
 *
 * Explains Ansible code with contextual understanding.
 * Supports --complex flag for deeper analysis with Claude Opus.
 */

import type Anthropic from '@anthropic-ai/sdk';
import { createClient } from '../ai/client.js';
import { transformApiError } from '../ai/errors.js';
import { selectModel } from '../ai/models.js';
import { type MessageParams, extractText, streamMessage } from '../ai/stream.js';
import {
  type ContextExtraction,
  detectLowConfidence,
  extractContext,
  readAnsiblePath,
} from '../explain/index.js';
import {
  EXPLAIN_SYSTEM_PROMPT,
  type ExplainFileType,
  buildExplainPrompt,
} from '../explain/prompts/index.js';
import { MessageTypes, globalMessageBus } from './message-bus.js';
import {
  type Agent,
  type AgentContext,
  type AgentResult,
  DEFAULT_AGENT_CONFIGS,
  type ExplainerInput,
  type ExplainerOutput,
  createAgentError,
  failureResult,
  successResult,
} from './types.js';

/**
 * Ansible Explainer Agent implementation.
 *
 * Reads and explains Ansible files with contextual understanding.
 */
export class ExplainerAgent implements Agent<ExplainerInput, ExplainerOutput> {
  readonly name = DEFAULT_AGENT_CONFIGS.explainer.name;
  readonly description = DEFAULT_AGENT_CONFIGS.explainer.description;

  private client: Anthropic | null = null;
  private maxRetries: number;

  constructor(options?: { client?: Anthropic; maxRetries?: number }) {
    this.client = options?.client ?? null;
    this.maxRetries = options?.maxRetries ?? DEFAULT_AGENT_CONFIGS.explainer.retries;
  }

  /**
   * Execute explanation generation.
   */
  async execute(
    input: ExplainerInput,
    context: AgentContext,
  ): Promise<AgentResult<ExplainerOutput>> {
    const startTime = Date.now();
    const { path, playbookContext, useComplex } = input;

    // Publish start message
    await globalMessageBus.publish(MessageTypes.EXPLAIN_START, { path, useComplex }, this.name);

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

      // Read the Ansible path
      const files = await readAnsiblePath(path);
      if (files.length === 0) {
        return failureResult(
          [createAgentError(this.name, 'NO_FILES', `No Ansible files found at: ${path}`)],
          Date.now() - startTime,
        );
      }

      // Determine file type
      const fileType: ExplainFileType = files.length === 1 ? files[0].type : 'role';

      // Extract context if playbook provided
      let extractedContext: ContextExtraction | undefined;
      if (playbookContext) {
        try {
          extractedContext = await extractContext(playbookContext);
        } catch {
          // Continue without context
        }
      }

      // Build content string
      let content: string;
      if (files.length === 1) {
        content = files[0].content;
      } else {
        content = files
          .map((file) => {
            const filename = file.path.split('/').pop() || file.path;
            return `=== ${file.type}/${filename} ===\n${file.content}`;
          })
          .join('\n\n');
      }

      // Build prompt
      const prompt = buildExplainPrompt(content, fileType, extractedContext);

      // Stream the explanation
      let fullResponse = '';
      const messageParams: MessageParams = {
        userMessage: prompt,
        systemPrompt: EXPLAIN_SYSTEM_PROMPT,
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

      // Detect confidence level
      const lowConfidence = detectLowConfidence(fullResponse);
      const confidence = lowConfidence ? 'low' : 'high';
      const suggestComplex = !useComplex && lowConfidence;

      // Publish completion message
      await globalMessageBus.publish(
        MessageTypes.EXPLAIN_COMPLETE,
        {
          fileCount: files.length,
          confidence,
          duration,
        },
        this.name,
      );

      const output: ExplainerOutput = {
        explanation: fullResponse,
        confidence,
        suggestComplex,
      };

      const warnings: string[] = [];
      if (suggestComplex) {
        warnings.push(
          'This analysis shows uncertainty. Consider using --complex for deeper analysis.',
        );
      }

      return successResult(output, duration, warnings);
    } catch (error) {
      const duration = Date.now() - startTime;

      // Publish error message
      await globalMessageBus.publish(
        MessageTypes.EXPLAIN_ERROR,
        { error: String(error) },
        this.name,
      );

      // Transform API errors for better messages
      const apiError = transformApiError(error);
      const errorMessage = apiError?.message || String(error);

      return failureResult(
        [
          createAgentError(this.name, 'EXPLAIN_ERROR', errorMessage, {
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
 * Create an explainer agent with optional configuration.
 */
export function createExplainerAgent(options?: {
  client?: Anthropic;
  maxRetries?: number;
}): ExplainerAgent {
  return new ExplainerAgent(options);
}

/**
 * Explain Ansible code using the explainer agent (convenience function).
 */
export async function explainAnsible(
  path: string,
  context: AgentContext,
  options?: {
    client?: Anthropic;
    playbookContext?: string;
    useComplex?: boolean;
  },
): Promise<AgentResult<ExplainerOutput>> {
  const agent = createExplainerAgent({ client: options?.client });
  return agent.execute(
    {
      path,
      playbookContext: options?.playbookContext,
      useComplex: options?.useComplex ?? false,
    },
    context,
  );
}
