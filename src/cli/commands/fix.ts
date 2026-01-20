/**
 * Fix command for ansible-craft CLI.
 *
 * Interprets Ansible errors and provides corrected code with optional apply workflow.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { createClient } from '../../ai/client.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { selectModel } from '../../ai/models.js';
import { type MessageParams, extractText, streamMessage } from '../../ai/stream.js';
import { loadConfig } from '../../config/index.js';
import {
  type ContextExtraction,
  extractFixContext,
  suggestComplexIfNeeded,
} from '../../explain/index.js';
import {
  FIX_SYSTEM_PROMPT,
  buildFixPrompt,
} from '../../explain/prompts/index.js';
import {
  applyFix,
  extractYamlFromResponse,
  locateTargetFile,
} from '../../explain/fix-applier.js';
import { createPhaseTracker } from '../output.js';

/**
 * Options for fix command.
 */
interface FixOptions {
  /** Path to playbook/role for context extraction */
  playbook?: string;
  /** Use Claude Opus for deeper analysis (higher cost) */
  complex?: boolean;
  /** Apply the fix without confirmation */
  apply?: boolean;
  /** Suppress progress output */
  quiet?: boolean;
}

/**
 * Fix command - interpret Ansible errors and suggest fixes.
 */
export const fixCommand = new Command('fix')
  .description('Interpret an Ansible error and suggest a fix')
  .argument('<error>', 'The error message (quote the entire error)')
  .option('--playbook <path>', 'Provide context from a playbook or role')
  .option('--complex', 'Use Claude Opus for deeper analysis (higher cost)')
  .option('--apply', 'Apply the fix without confirmation')
  .option('-q, --quiet', 'Suppress progress output')
  .action(async (errorMessage: string, options: FixOptions) => {
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

      // Create phase tracker
      const tracker = createPhaseTracker(options.quiet ?? false);

      // 3. Extract context if --playbook provided
      let context: ContextExtraction | undefined;
      let targetFile: string | undefined;

      if (options.playbook) {
        tracker.start('Extracting context from playbook...');
        try {
          context = await extractFixContext(errorMessage, options.playbook);
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

      // Try to locate target file from error message
      targetFile = locateTargetFile(errorMessage);
      if (targetFile) {
        console.log(chalk.dim(`Detected file: ${targetFile}`));
      }

      // 4. Build prompt and stream response
      const prompt = buildFixPrompt(errorMessage, context);
      const client = createClient({ apiKey: config.api.key });

      tracker.start('Analyzing error...');

      let fullResponse = '';

      const messageParams: MessageParams = {
        userMessage: prompt,
        systemPrompt: FIX_SYSTEM_PROMPT,
        model: modelSelection.model,
        maxTokens: 4096,
      };

      const message = await streamMessage(client, messageParams, {
        quiet: options.quiet,
        onFirstToken: () => {
          tracker.succeed('Analysis received');
          console.log(chalk.cyan('\n=== Error Analysis ===\n'));
        },
        onText: (text) => {
          fullResponse += text;
        },
      });

      // Extract text from message (in case streaming didn't capture all)
      if (!fullResponse) {
        fullResponse = extractText(message);
      }

      // 5. Try to extract and apply fix if possible
      const fixedYaml = extractYamlFromResponse(fullResponse);

      if (fixedYaml && targetFile) {
        // We have both YAML and target file - offer to apply
        try {
          await applyFix(targetFile, fixedYaml, { skipConfirm: options.apply });
        } catch (error) {
          console.error(
            chalk.yellow(
              `\nWarning: Could not apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        }
      } else if (fixedYaml && !targetFile) {
        // Have YAML but no target file
        console.log(chalk.dim('\nTip: Specify --playbook to enable automatic fix application.'));
      }

      // 6. Suggest --complex if low confidence detected (only if not already using Opus)
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
