/**
 * Explain command for ansible-craft CLI.
 *
 * Provides AI-powered explanations of Ansible files and roles.
 * Uses the ExplainerAgent for context-aware explanations.
 */

import { stat } from 'node:fs/promises';
import chalk from 'chalk';
import { Command } from 'commander';
import { ExplainerAgent } from '../../agents/index.js';
import { displayApiError, transformApiError } from '../../ai/errors.js';
import { loadConfig } from '../../config/index.js';
import { createAgentContext, displayAgentWarnings, handleAgentFailure } from '../helpers/index.js';
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

      // 2. Check if path exists
      try {
        await stat(ansiblePath);
      } catch {
        console.error(chalk.red(`Error: File or directory not found: ${ansiblePath}`));
        process.exit(1);
      }

      // Create phase tracker
      const tracker = createPhaseTracker(options.quiet ?? false);

      // 3. Create agent context
      const agentContext = createAgentContext({
        config,
        quiet: options.quiet,
      });

      // 4. Execute ExplainerAgent
      tracker.start('Analyzing Ansible code...');
      const explainerAgent = new ExplainerAgent();
      const result = await explainerAgent.execute(
        {
          path: ansiblePath,
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

      tracker.succeed('Analysis complete');

      // 5. Display the explanation
      console.log(chalk.cyan('\n=== Explanation ===\n'));
      console.log(result.data!.explanation);

      // 6. Display warnings (e.g., suggest --complex if low confidence)
      displayAgentWarnings(result.warnings, options.quiet ?? false);

      if (result.data!.suggestComplex && !options.complex) {
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
