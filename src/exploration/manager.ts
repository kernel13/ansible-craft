/**
 * Exploration manager orchestrator.
 *
 * Coordinates the conversational exploration workflow, handling
 * topic selection, exploration, and summary phases.
 */

import { randomUUID } from 'crypto';
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
import type { ResearchFindings } from '../research/schemas/findings.js';
import type { RoleWizardContext } from '../wizard/types.js';
import type {
  ExplorationSession,
  ExplorationTopic,
  ExplorationOptions,
  ExplorationResult,
  ExplorationPhase,
  TopicResolution,
  ExploredTopicState,
} from './types.js';
import {
  formatOverview,
  createTopicsFromFindings,
  groupTopicsByInterest,
} from './overview.js';
import { buildTopicContext, formatTopicContextForDisplay, extractTopicOptions } from './topic-context.js';
import { calculateSmartDefaults, buildContextFromSession, getDefaultsSummary } from './defaults.js';
import { parseModifications, applyModifications, formatModificationResults, suggestModifications } from './conversation.js';
import { loadSession, saveSession } from './session.js';
import { getTemplateForTool, mergeTemplateWithFindings } from './templates/registry.js';

// ============================================
// Exploration Manager
// ============================================

/**
 * Manager for the conversational exploration workflow.
 */
export class ExplorationManager {
  private session: ExplorationSession;
  private phase: ExplorationPhase = 'research';
  private options: ExplorationOptions;

  constructor(
    roleDescription: string,
    roleName: string,
    findings: ResearchFindings,
    options: ExplorationOptions = {},
  ) {
    this.options = options;

    // Check for starter template
    let topics: ExplorationTopic[];
    if (options.useStarterTemplates !== false) {
      const template = getTemplateForTool(roleName);
      if (template) {
        topics = mergeTemplateWithFindings(template, findings);
      } else {
        topics = createTopicsFromFindings(findings);
      }
    } else {
      topics = createTopicsFromFindings(findings);
    }

    // Initialize session
    this.session = {
      id: randomUUID(),
      roleDescription,
      roleName,
      researchFindings: findings,
      topics,
      explored: {},
      skipped: [],
      modifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: false,
    };
  }

  /**
   * Resume an existing session.
   */
  static async resume(sessionId: string): Promise<ExplorationManager | null> {
    const session = await loadSession(sessionId);
    if (!session) return null;

    const manager = new ExplorationManager(
      session.roleDescription,
      session.roleName,
      session.researchFindings,
      { resumeSessionId: sessionId },
    );
    manager.session = session;
    manager.phase = session.completed ? 'complete' : 'topic_selection';

    return manager;
  }

  /**
   * Get current session.
   */
  getSession(): ExplorationSession {
    return this.session;
  }

  /**
   * Get current phase.
   */
  getPhase(): ExplorationPhase {
    return this.phase;
  }

  // ============================================
  // Overview Phase
  // ============================================

  /**
   * Display the overview of research findings.
   */
  displayOverview(): string {
    this.phase = 'overview';
    return formatOverview(
      this.session.roleName,
      this.session.roleDescription,
      this.session.researchFindings,
      { maxInteresting: this.options.maxInterestingTopics },
    );
  }

  /**
   * Get interesting topics for display.
   */
  getInterestingTopics(): ExplorationTopic[] {
    const grouped = groupTopicsByInterest(
      this.session.researchFindings,
      this.options.maxInterestingTopics,
    );
    return grouped.interesting;
  }

  // ============================================
  // Topic Selection Phase
  // ============================================

  /**
   * Handle user's topic selection.
   *
   * Returns the selected topic or null for "continue".
   */
  selectTopic(input: string): ExplorationTopic | null {
    this.phase = 'topic_selection';
    const normalized = input.trim().toLowerCase();

    // Check for continue/done commands
    if (['continue', 'done', 'finish', 'next', 'skip all'].includes(normalized)) {
      return null;
    }

    // Check for "explore all" command
    if (['explore all', 'all'].includes(normalized)) {
      // Return first interesting topic
      const interesting = this.getInterestingTopics();
      return interesting[0] || null;
    }

    // Find matching topic
    const topic = this.findTopic(normalized);
    return topic || null;
  }

  /**
   * Find a topic by name or partial match.
   */
  private findTopic(input: string): ExplorationTopic | undefined {
    const normalized = input.toLowerCase();

    // Exact match
    const exact = this.session.topics.find(
      (t) => t.name.toLowerCase() === normalized,
    );
    if (exact) return exact;

    // Partial match
    const partial = this.session.topics.find(
      (t) =>
        t.name.toLowerCase().includes(normalized) ||
        normalized.includes(t.name.toLowerCase()),
    );
    if (partial) return partial;

    // Check by ID
    const byId = this.session.topics.find(
      (t) => t.id.toLowerCase() === normalized,
    );
    if (byId) return byId;

    return undefined;
  }

  /**
   * Get available topics for selection (not yet explored).
   */
  getAvailableTopics(): ExplorationTopic[] {
    return this.session.topics.filter(
      (t) => !this.session.explored[t.id] && !this.session.skipped.includes(t.id),
    );
  }

  // ============================================
  // Topic Exploration Phase
  // ============================================

  /**
   * Start exploring a specific topic.
   *
   * Returns the context for the topic exploration conversation.
   */
  startTopicExploration(topic: ExplorationTopic): {
    context: ReturnType<typeof buildTopicContext>;
    display: string;
  } {
    this.phase = 'topic_exploration';

    const context = buildTopicContext(topic, this.session.researchFindings.bestPractices);
    const display = formatTopicContextForDisplay(context);

    return { context, display };
  }

  /**
   * Record a decision made during topic exploration.
   */
  recordTopicDecision(
    topic: ExplorationTopic,
    value: unknown,
    question?: string,
    rationale?: string,
  ): void {
    const state: ExploredTopicState = {
      topicId: topic.id,
      resolution: {
        type: 'user_choice',
        value: value as string | string[] | Record<string, unknown>,
        question,
        rationale,
      },
      exploredAt: new Date().toISOString(),
    };

    this.session.explored[topic.id] = state;
    this.session.updatedAt = new Date().toISOString();
  }

  /**
   * Skip a topic (will use defaults).
   */
  skipTopic(topicId: string): void {
    if (!this.session.skipped.includes(topicId)) {
      this.session.skipped.push(topicId);
      this.session.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Check if more topics are available to explore.
   */
  hasMoreTopics(): boolean {
    return this.getAvailableTopics().some((t) => t.isInteresting);
  }

  // ============================================
  // Summary Phase
  // ============================================

  /**
   * Generate the final summary.
   */
  generateSummary(): {
    context: RoleWizardContext;
    summary: ReturnType<typeof getDefaultsSummary>;
    display: string;
  } {
    this.phase = 'summary';

    const context = buildContextFromSession(this.session);
    const summary = getDefaultsSummary(this.session, context);

    const display = this.formatSummaryDisplay(context, summary);

    return { context, summary, display };
  }

  /**
   * Format summary for display.
   */
  private formatSummaryDisplay(
    context: RoleWizardContext,
    summary: ReturnType<typeof getDefaultsSummary>,
  ): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.cyan.bold(`## Role Summary: ${this.session.roleName}`));
    lines.push('');

    // Core features (explored)
    if (summary.explored.length > 0) {
      lines.push(chalk.green.bold('### Explored Topics'));
      for (const topicId of summary.explored) {
        const topic = this.session.topics.find((t) => t.id === topicId);
        const state = this.session.explored[topicId];
        if (topic && state) {
          const value =
            typeof state.resolution.value === 'string'
              ? state.resolution.value
              : JSON.stringify(state.resolution.value);
          lines.push(`  ${chalk.green('✓')} ${topic.name}: ${value}`);
        }
      }
      lines.push('');
    }

    // Applied defaults
    if (summary.defaulted.length > 0) {
      lines.push(chalk.yellow.bold('### Applied Defaults'));
      for (const topicId of summary.defaulted.slice(0, 5)) {
        const topic = this.session.topics.find((t) => t.id === topicId);
        if (topic && topic.defaultResolution) {
          const value =
            typeof topic.defaultResolution.value === 'string'
              ? topic.defaultResolution.value
              : Array.isArray(topic.defaultResolution.value)
                ? topic.defaultResolution.value.join(', ')
                : 'configured';
          lines.push(`  ${chalk.dim('•')} ${topic.name}: ${value}`);
        }
      }
      if (summary.defaulted.length > 5) {
        lines.push(chalk.dim(`  ... and ${summary.defaulted.length - 5} more`));
      }
      lines.push('');
    }

    // Structure
    lines.push(chalk.bold('### Structure'));
    lines.push(`  ${context.structure.join(', ')}`);
    lines.push('');

    // Selected features
    if (context.selectedFeatures && context.selectedFeatures.length > 0) {
      lines.push(chalk.bold('### Selected Features'));
      lines.push(`  ${context.selectedFeatures.join(', ')}`);
      lines.push('');
    }

    // Prompt
    lines.push(chalk.cyan('Does this look right?'));
    lines.push(chalk.dim("  - Type 'yes' to generate"));
    lines.push(chalk.dim("  - Or describe changes: \"add CentOS support\", \"skip molecule tests\", etc."));

    return lines.join('\n');
  }

  // ============================================
  // Modification Phase
  // ============================================

  /**
   * Apply natural language modifications.
   */
  applyModifications(input: string): {
    success: boolean;
    message: string;
    session: ExplorationSession;
  } {
    this.phase = 'modification';

    const modifications = parseModifications(input);
    if (modifications.length === 0) {
      return {
        success: false,
        message: 'No modifications recognized. Try "add CentOS support" or "skip molecule tests".',
        session: this.session,
      };
    }

    const { session, results } = applyModifications(this.session, modifications);
    this.session = session;

    const message = formatModificationResults(results);
    const success = results.some((r) => r.applied);

    return { success, message, session };
  }

  /**
   * Get suggested modifications based on current session.
   */
  getSuggestions(): string[] {
    return suggestModifications(this.session);
  }

  // ============================================
  // Completion
  // ============================================

  /**
   * Complete the exploration and build the result.
   */
  complete(): ExplorationResult {
    this.phase = 'complete';
    this.session.completed = true;
    this.session.updatedAt = new Date().toISOString();

    const wizardContext = buildContextFromSession(this.session);
    const summary = getDefaultsSummary(this.session, wizardContext);

    return {
      session: this.session,
      wizardContext,
      summary,
    };
  }

  /**
   * Save the current session for later resumption.
   */
  async save(): Promise<string> {
    await saveSession(this.session);
    return this.session.id;
  }
}

// ============================================
// CLI Integration
// ============================================

/**
 * Run the full exploration workflow interactively.
 */
export async function runExplorationWorkflow(
  roleDescription: string,
  roleName: string,
  findings: ResearchFindings,
  options: ExplorationOptions = {},
): Promise<ExplorationResult> {
  // Check for resume
  let manager: ExplorationManager;
  if (options.resumeSessionId) {
    const resumed = await ExplorationManager.resume(options.resumeSessionId);
    if (resumed) {
      console.log(chalk.cyan('\nResuming previous session...\n'));
      manager = resumed;
    } else {
      console.log(chalk.yellow('\nSession not found, starting fresh...\n'));
      manager = new ExplorationManager(roleDescription, roleName, findings, options);
    }
  } else {
    manager = new ExplorationManager(roleDescription, roleName, findings, options);
  }

  // Phase 1: Overview
  if (!options.skipOverview) {
    const overview = manager.displayOverview();
    console.log(overview);
  }

  // Phase 2: Topic exploration loop
  let exploring = true;
  while (exploring) {
    const interestingTopics = manager.getInterestingTopics().filter(
      (t) => !manager.getSession().explored[t.id],
    );

    if (interestingTopics.length === 0) {
      console.log(chalk.dim('\nNo more interesting topics to explore.'));
      exploring = false;
      break;
    }

    // Topic selection
    const topicInput = await input({
      message: 'What would you like to explore? (or "continue" for defaults)',
    });

    const selectedTopic = manager.selectTopic(topicInput);

    if (!selectedTopic) {
      exploring = false;
      break;
    }

    // Explore the topic
    const { display, context } = manager.startTopicExploration(selectedTopic);
    console.log(display);

    const options = extractTopicOptions(selectedTopic);
    if (options.length > 0) {
      const choice = await select({
        message: `Which option for ${selectedTopic.name}?`,
        choices: [
          ...options.map((opt) => ({
            name: opt.isRecommended ? `${opt.label} (Recommended)` : opt.label,
            value: opt.label,
          })),
          { name: 'Skip this topic', value: '__skip__' },
        ],
      });

      if (choice === '__skip__') {
        manager.skipTopic(selectedTopic.id);
        console.log(chalk.dim(`Skipped ${selectedTopic.name}, will use defaults.`));
      } else {
        manager.recordTopicDecision(selectedTopic, choice);
        console.log(chalk.green(`✓ ${selectedTopic.name}: ${choice}`));
      }
    } else {
      manager.skipTopic(selectedTopic.id);
    }

    // Check if more topics
    if (!manager.hasMoreTopics()) {
      exploring = false;
    } else {
      const continueExploring = await confirm({
        message: 'Explore another topic?',
        default: true,
      });
      exploring = continueExploring;
    }
  }

  // Phase 3: Summary
  const { display: summaryDisplay } = manager.generateSummary();
  console.log(summaryDisplay);

  // Phase 4: Modification loop
  let modifying = true;
  while (modifying) {
    const response = await input({
      message: "Type 'yes' to generate, or describe changes:",
    });

    const normalized = response.trim().toLowerCase();
    if (['yes', 'y', 'ok', 'generate', 'proceed'].includes(normalized)) {
      modifying = false;
    } else if (['no', 'cancel', 'abort'].includes(normalized)) {
      throw new Error('Generation cancelled by user');
    } else {
      // Apply modifications
      const { success, message } = manager.applyModifications(response);
      console.log(message);

      if (success) {
        // Show updated summary
        const { display } = manager.generateSummary();
        console.log(display);
      }
    }
  }

  // Complete and return
  return manager.complete();
}
