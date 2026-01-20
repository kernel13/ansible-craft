/**
 * Explain command for ansible-craft CLI.
 *
 * Provides AI-powered explanations of Ansible files and roles.
 */

import { stat } from 'node:fs/promises';
import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { selectModel } from '../../ai/models.js';
import { type MessageParams, extractText, streamMessage } from '../../ai/stream.js';
import { loadConfig } from '../../config/index.js';
import {
  type ContextExtraction,
  extractContext,
  readAnsiblePath,
  suggestComplexIfNeeded,
} from '../../explain/index.js';
import {
  EXPLAIN_SYSTEM_PROMPT,
  type ExplainFileType,
  buildExplainPrompt,
} from '../../explain/prompts/index.js';
import { createPhaseTracker } from '../output.js';

/**
 * Options for explain command.
 */
interface ExplainOptions {
  /** Path to playbook/role for context extraction */
  playbook?: string;
  /** Use Claude Opus for deeper analysis (higher cost) */
  complex?: boolean;
  /** Suppress progress output */
  quiet?: boolean;
}

/**
 * Explain command - explain existing Ansible code in plain English.
 */
export const explainCommand = new Command('explain')
  .description('Explain existing Ansible code in plain English')
  .argument('<path>', 'Path to Ansible file or role directory')
  .option('--playbook <path>', 'Provide context from a playbook or role')
  .option('--complex', 'Use Claude Opus for deeper analysis (higher cost)')
  .option('-q, --quiet', 'Suppress progress output')
  .action(async (ansiblePath: string, options: ExplainOptions) => {
    try {
      // 1. Load config and validate API key
      const config = await loadConfig();
      if (!config.api.key) {
        console.error(chalk.red('Error: API key not configured'));
        console.error(chalk.dim('Run: ansible-craft config save'));
        process.exit(1);
      }

      // 2. Select model (with confirmation if using Opus)
      const modelSelection = await selectModel(options.complex ?? false);
      if (!modelSelection.confirmed) {
        // User declined Opus, exit gracefully
        console.log(chalk.yellow('\nOperation cancelled.'));
        return;
      }

      // 3. Check if path exists
      try {
        await stat(ansiblePath);
      } catch {
        console.error(chalk.red(`Error: File or directory not found: ${ansiblePath}`));
        process.exit(1);
      }

      // Create phase tracker
      const tracker = createPhaseTracker(options.quiet ?? false);

      // 4. Read the Ansible path
      tracker.start('Reading Ansible code...');
      const files = await readAnsiblePath(ansiblePath);

      if (files.length === 0) {
        tracker.fail('No Ansible files found');
        console.error(chalk.red(`Error: No readable Ansible files found at: ${ansiblePath}`));
        process.exit(1);
      }

      // Determine file type (single file vs role directory)
      const fileType: ExplainFileType = files.length === 1 ? files[0].type : 'role';
      tracker.succeed('Code loaded');

      // 5. Extract context if --playbook provided
      let context: ContextExtraction | undefined;
      if (options.playbook) {
        tracker.start('Extracting context...');
        try {
          context = await extractContext(options.playbook);
          tracker.succeed('Context extracted');
        } catch (error) {
          tracker.fail('Context extraction failed');
          console.error(
            chalk.yellow(
              `Warning: Could not extract context from ${options.playbook}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
          // Continue without context
        }
      }

      // 6. Build content string
      let content: string;
      if (files.length === 1) {
        // Single file - use content directly
        content = files[0].content;
      } else {
        // Role directory - concatenate files with headers
        content = files
          .map((file) => {
            const filename = file.path.split('/').pop() || file.path;
            return `=== ${file.type}/${filename} ===\n${file.content}`;
          })
          .join('\n\n');
      }

      // 7. Build prompt and stream response
      const prompt = buildExplainPrompt(content, fileType, context);

      const client = createClient({ apiKey: config.api.key });

      console.log(chalk.cyan('\n=== Explanation ===\n'));

      // Capture full response for confidence check
      let fullResponse = '';

      const messageParams: MessageParams = {
        userMessage: prompt,
        systemPrompt: EXPLAIN_SYSTEM_PROMPT,
        model: modelSelection.model,
        maxTokens: 4096,
      };

      const message = await streamMessage(client, messageParams, {
        quiet: options.quiet,
        onText: (text) => {
          fullResponse += text;
        },
      });

      // Extract text from message (in case streaming didn't capture all)
      if (!fullResponse) {
        fullResponse = extractText(message);
      }

      // 8. Suggest --complex if low confidence detected (only if not already using Opus)
      if (!options.complex) {
        suggestComplexIfNeeded(fullResponse, options.complex ?? false);
      }
    } catch (error) {
      // Handle API errors
      const apiError = transformApiError(error);
      if (apiError) {
        displayApiError(apiError);
        process.exit(1);
      }

      // Handle other errors
      console.error(
        chalk.red(`\nError: ${error instanceof Error ? error.message : 'Unknown error'}`),
      );
      process.exit(1);
    }
  });
