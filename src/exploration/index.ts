/**
 * Exploration workflow module.
 *
 * Provides conversational role generation through research-driven
 * topic exploration with smart defaults.
 *
 * @example
 * ```typescript
 * import { runExplorationWorkflow, ExplorationManager } from './exploration';
 *
 * // Run the full interactive workflow
 * const result = await runExplorationWorkflow(
 *   'nginx web server with SSL',
 *   'nginx',
 *   researchFindings
 * );
 *
 * // Or use the manager directly
 * const manager = new ExplorationManager(description, roleName, findings);
 * const overview = manager.displayOverview();
 * ```
 */

// Types
export type {
  // Confidence and sources
  ConfidenceLevel,
  ResearchSourceInfo,
  // Enhanced findings
  EnhancedFeature,
  EnhancedPackage,
  // Topic types
  TopicType,
  TopicResolution,
  ExplorationTopic,
  // Session types
  Modification,
  ExploredTopicState,
  ExplorationSession,
  // Flow types
  ExplorationPhase,
  ExplorationEvent,
  ExplorationOptions,
  ExplorationResult,
  // Template types
  StarterTopic,
  StarterTemplate,
  // Helper types
  OverviewSection,
  TopicContext,
} from './types.js';

// Schemas
export {
  confidenceLevelSchema,
  researchSourceInfoSchema,
  enhancedFeatureSchema,
  enhancedPackageSchema,
  topicTypeSchema,
  topicResolutionSchema,
  explorationTopicSchema,
  modificationSchema,
  exploredTopicStateSchema,
  explorationSessionSchema,
} from './types.js';

// Overview presenter
export {
  formatOverview,
  formatInterestingFindings,
  formatStandardDecisions,
  formatOptionalTopics,
  formatBestPractices,
  groupTopicsByInterest,
  createTopicsFromFindings,
  type GroupedTopics,
} from './overview.js';

// Smart defaults engine
export {
  calculateSmartDefaults,
  buildContextFromSession,
  getDefaultsSummary,
  type SmartDefaultsOptions,
} from './defaults.js';

// Topic context builder
export {
  buildTopicContext,
  formatTopicSummary,
  extractTopicOptions,
  generateContextualQuestions,
  findRelatedPractices,
  formatTopicContextForDisplay,
  formatOptionsForSkill,
  type TopicOption,
} from './topic-context.js';

// Conversation parser
export {
  parseModification,
  parseModifications,
  applyModification,
  applyModifications,
  formatModificationResults,
  suggestModifications,
} from './conversation.js';

// Session persistence
export {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  cleanupOldSessions,
  findRecentSession,
  sessionExists,
  getSessionsDir,
  formatSessionMetadata,
  formatSessionsList,
  type SessionMetadata,
} from './session.js';

// Template registry
export {
  getTemplateForTool,
  listTemplates,
  mergeTemplateWithFindings,
  hasTemplate,
} from './templates/registry.js';

// Exploration manager
export { ExplorationManager, runExplorationWorkflow } from './manager.js';
