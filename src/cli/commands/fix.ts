/**
 * Fix command for ansible-craft CLI.
 *
 * Interprets Ansible errors and provides corrected code with optional apply workflow.
 * Uses the DebuggerAgent for error diagnosis and fix suggestions.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { DebuggerAgent } from '../../agents/index.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig } from '../../config/index.js';
import { applyFix } from '../../explain/fix-applier.js';
import { createAgentContext, displayAgentWarnings, handleAgentFailure } from '../helpers/index.js';
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

      // Create phase tracker
      const tracker = createPhaseTracker(options.quiet ?? false);

      // 2. Create agent context
      const agentContext = createAgentContext({
        config,
        quiet: options.quiet,
      });

      // 3. Execute DebuggerAgent
      tracker.start('Analyzing error...');
      const debuggerAgent = new DebuggerAgent();
      const result = await debuggerAgent.execute(
        {
          errorMessage,
          playbookContext: options.playbook,
          useComplex: options.complex ?? false,
        },
        agentContext,
      );

      // Handle agent failure
      if (!result.success) {
        // Check if user declined model selection
        const modelDeclined = result.errors?.some((e) => e.code === 'MODEL_DECLINED');
        if (modelDeclined) {
          tracker.fail('Operation cancelled');
          console.log(chalk.yellow('\nOperation cancelled.'));
          return;
        }

        handleAgentFailure(result, {
          jsonMode: false,
          tracker,
          phaseName: 'Analysis failed',
        });
      }

      tracker.succeed('Analysis received');

      // 4. Display the diagnosis
      console.log(chalk.cyan('\n=== Error Analysis ===\n'));
      console.log(result.data!.diagnosis);

      // 5. Display warnings
      displayAgentWarnings(result.warnings, options.quiet ?? false);

      // 6. Try to apply fix if possible
      const { suggestedFix, targetFile } = result.data!;

      if (suggestedFix && targetFile) {
        // We have both YAML and target file - offer to apply
        console.log(chalk.dim(`\nDetected file: ${targetFile}`));
        try {
          await applyFix(targetFile, suggestedFix, { skipConfirm: options.apply });
        } catch (error) {
          console.error(
            chalk.yellow(
              `\nWarning: Could not apply fix: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ),
          );
        }
      } else if (suggestedFix && !targetFile) {
        // Have YAML but no target file
        console.log(chalk.dim('\nTip: Specify --playbook to enable automatic fix application.'));
      }

      // 7. Suggest --complex if low confidence detected (only if not already using Opus)
      if (result.data!.confidence === 'low' && !options.complex) {
        console.log(chalk.dim('\nTip: Use --complex for deeper analysis with Claude Opus.'));
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
