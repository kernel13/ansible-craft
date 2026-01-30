/**
 * Exploration workflow type definitions.
 *
 * Provides types for the conversational role generation workflow
 * where users explore research findings interactively.
 */

import { z } from 'zod';
import type {
  Feature,
  Package,
  Practice,
  GalaxyRole,
  ResearchFindings,
} from '../research/schemas/findings.js';
import type { RoleWizardContext } from '../wizard/types.js';

// ============================================
// Confidence and Source Types
// ============================================

/**
 * Confidence level for research findings.
 */
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

/**
 * Source of a research finding with quality indicators.
 */
export const researchSourceInfoSchema = z.object({
  /** Source type (galaxy, docs, web, package_manager) */
  type: z.enum(['galaxy', 'docs', 'web', 'package_manager']),
  /** Source URL or identifier */
  url: z.string().optional(),
  /** Quality score (0-100) */
  quality: z.number().min(0).max(100).optional(),
  /** When the source was last updated */
  freshness: z.string().optional(),
});
export type ResearchSourceInfo = z.infer<typeof researchSourceInfoSchema>;

// ============================================
// Enhanced Finding Types
// ============================================

/**
 * Enhanced feature finding with exploration metadata.
 */
export const enhancedFeatureSchema = z.object({
  /** Feature name */
  name: z.string(),
  /** Description of what this feature provides */
  description: z.string(),
  /** Category classification */
  category: z.enum(['essential', 'recommended', 'optional']),
  /** Implementation complexity */
  complexity: z.enum(['simple', 'moderate', 'complex']),
  /** Confidence in this finding */
  confidence: confidenceLevelSchema,
  /** Hint about why this is worth exploring */
  exploreHint: z.string().optional(),
  /** Sources that support this finding */
  sources: z.array(researchSourceInfoSchema).optional(),
  /** Alternative implementations */
  alternatives: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        tradeoffs: z.string().optional(),
      }),
    )
    .optional(),
});
export type EnhancedFeature = z.infer<typeof enhancedFeatureSchema>;

/**
 * Enhanced package finding with exploration metadata.
 */
export const enhancedPackageSchema = z.object({
  /** Package name */
  name: z.string(),
  /** Package source/repository */
  source: z.enum(['apt', 'yum', 'dnf', 'choco', 'pip', 'npm', 'gem']),
  /** Version (if available) */
  version: z.string().optional(),
  /** Package description */
  description: z.string().optional(),
  /** Whether this is the default/recommended option */
  isDefault: z.boolean(),
  /** Confidence in this finding */
  confidence: confidenceLevelSchema,
  /** Quality indicators */
  qualityIndicators: z
    .object({
      /** Official vs community package */
      official: z.boolean().optional(),
      /** Maintenance status */
      wellMaintained: z.boolean().optional(),
      /** Documentation quality */
      documentedWell: z.boolean().optional(),
    })
    .optional(),
});
export type EnhancedPackage = z.infer<typeof enhancedPackageSchema>;

// ============================================
// Exploration Topic Types
// ============================================

/**
 * Topic types for exploration.
 */
export const topicTypeSchema = z.enum([
  'feature', // A feature to implement (SSL, virtual hosts)
  'configuration', // A configuration decision (platform, handlers)
  'testing', // Testing-related decisions (molecule)
  'structure', // Role structure decisions
]);
export type TopicType = z.infer<typeof topicTypeSchema>;

/**
 * Resolution for a topic (user decision or default).
 */
export const topicResolutionSchema = z.object({
  /** How this was resolved */
  type: z.enum(['user_choice', 'smart_default', 'skipped']),
  /** The chosen value(s) */
  value: z.union([z.string(), z.array(z.string()), z.record(z.unknown())]),
  /** If user choice, what was the original question */
  question: z.string().optional(),
  /** Rationale for the resolution */
  rationale: z.string().optional(),
});
export type TopicResolution = z.infer<typeof topicResolutionSchema>;

/**
 * An exploration topic that can be explored or skipped.
 */
export const explorationTopicSchema = z.object({
  /** Unique topic identifier */
  id: z.string(),
  /** Display name */
  name: z.string(),
  /** Topic type */
  type: topicTypeSchema,
  /** Brief description */
  description: z.string(),
  /** Whether this topic has depth worth exploring */
  isInteresting: z.boolean(),
  /** Why this is interesting (if it is) */
  interestReason: z.string().optional(),
  /** Related findings from research */
  findings: z.array(enhancedFeatureSchema).optional(),
  /** Related packages (for feature topics) */
  packages: z.array(enhancedPackageSchema).optional(),
  /** Best practices related to this topic */
  bestPractices: z
    .array(
      z.object({
        practice: z.string(),
        rationale: z.string(),
        priority: z.enum(['critical', 'recommended', 'optional']),
      }),
    )
    .optional(),
  /** Default resolution if not explored */
  defaultResolution: topicResolutionSchema.optional(),
  /** Current resolution (after exploration or skip) */
  resolution: topicResolutionSchema.optional(),
  /** Sub-topics for drilling down */
  subTopics: z.array(z.lazy(() => explorationTopicSchema)).optional(),
});
export type ExplorationTopic = z.infer<typeof explorationTopicSchema>;

// ============================================
// Exploration Session Types
// ============================================

/**
 * Modification request from natural language input.
 */
export const modificationSchema = z.object({
  /** Type of modification */
  type: z.enum([
    'add_feature',
    'remove_feature',
    'add_platform',
    'remove_platform',
    'change_setting',
    'toggle_molecule',
    'custom',
  ]),
  /** Target of the modification */
  target: z.string(),
  /** New value (for changes) */
  value: z.unknown().optional(),
  /** Original natural language input */
  originalText: z.string(),
  /** Whether this was successfully applied */
  applied: z.boolean().optional(),
});
export type Modification = z.infer<typeof modificationSchema>;

/**
 * State of a topic during exploration.
 */
export const exploredTopicStateSchema = z.object({
  /** Topic ID */
  topicId: z.string(),
  /** Resolution after exploration */
  resolution: topicResolutionSchema,
  /** Questions asked during exploration */
  questionsAsked: z.array(z.string()).optional(),
  /** User responses during exploration */
  responses: z.array(z.string()).optional(),
  /** Timestamp of exploration */
  exploredAt: z.string(),
});
export type ExploredTopicState = z.infer<typeof exploredTopicStateSchema>;

/**
 * Complete exploration session state.
 */
export const explorationSessionSchema = z.object({
  /** Unique session ID */
  id: z.string(),
  /** Role description */
  roleDescription: z.string(),
  /** Sanitized role name */
  roleName: z.string(),
  /** Original research findings */
  researchFindings: z.custom<ResearchFindings>(),
  /** All available topics */
  topics: z.array(explorationTopicSchema),
  /** Topics that have been explored */
  explored: z.record(z.string(), exploredTopicStateSchema),
  /** Topics that were skipped (will use defaults) */
  skipped: z.array(z.string()),
  /** Natural language modifications applied */
  modifications: z.array(modificationSchema),
  /** Session creation timestamp */
  createdAt: z.string(),
  /** Last modified timestamp */
  updatedAt: z.string(),
  /** Whether exploration is complete */
  completed: z.boolean(),
});
export type ExplorationSession = z.infer<typeof explorationSessionSchema>;

// ============================================
// Exploration Flow Types
// ============================================

/**
 * Phase of the exploration workflow.
 */
export type ExplorationPhase =
  | 'research' // Initial research phase
  | 'overview' // Presenting overview
  | 'topic_selection' // User selecting topic to explore
  | 'topic_exploration' // Deep exploration of selected topic
  | 'summary' // Final summary with modification option
  | 'modification' // Applying natural language modifications
  | 'complete'; // Ready for generation

/**
 * Event during exploration for tracking.
 */
export interface ExplorationEvent {
  type:
    | 'session_started'
    | 'overview_shown'
    | 'topic_selected'
    | 'topic_explored'
    | 'topic_skipped'
    | 'modification_applied'
    | 'session_completed';
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Options for the exploration manager.
 */
export interface ExplorationOptions {
  /** Skip overview and go directly to topics */
  skipOverview?: boolean;
  /** Maximum topics to show as "interesting" */
  maxInterestingTopics?: number;
  /** Enable session persistence */
  enablePersistence?: boolean;
  /** Resume from existing session ID */
  resumeSessionId?: string;
  /** Use starter template if available */
  useStarterTemplates?: boolean;
}

/**
 * Result of the exploration workflow.
 */
export interface ExplorationResult {
  /** The exploration session */
  session: ExplorationSession;
  /** Built wizard context from exploration */
  wizardContext: RoleWizardContext;
  /** Summary of what was explored vs defaulted */
  summary: {
    explored: string[];
    defaulted: string[];
    modifications: string[];
  };
}

// ============================================
// Topic Definition for Starter Templates
// ============================================

/**
 * Pre-defined topic for starter templates.
 */
export interface StarterTopic {
  /** Topic ID */
  id: string;
  /** Display name */
  name: string;
  /** Topic type */
  type: TopicType;
  /** Description */
  description: string;
  /** Whether this is typically interesting for this tool */
  typicallyInteresting: boolean;
  /** Common options for this topic */
  commonOptions: Array<{
    label: string;
    description: string;
    isDefault?: boolean;
  }>;
  /** Questions to ask when exploring */
  explorationQuestions: string[];
  /** Default value when skipped */
  defaultValue: unknown;
}

/**
 * Starter template for a known tool.
 */
export interface StarterTemplate {
  /** Tool/software name (e.g., 'nginx', 'postgresql') */
  tool: string;
  /** Alternative names that match this template */
  aliases: string[];
  /** Known topics for this tool */
  topics: StarterTopic[];
  /** Common best practices for this tool */
  bestPractices: Array<{
    practice: string;
    rationale: string;
    priority: 'critical' | 'recommended' | 'optional';
  }>;
}

// ============================================
// Helper Types
// ============================================

/**
 * Overview section for display.
 */
export interface OverviewSection {
  title: string;
  items: Array<{
    name: string;
    description: string;
    badge?: string;
    status?: 'ready' | 'explore' | 'optional';
  }>;
}

/**
 * Topic context for focused exploration.
 */
export interface TopicContext {
  topic: ExplorationTopic;
  summary: string;
  options: Array<{
    label: string;
    description: string;
    tradeoffs?: string;
  }>;
  followUpQuestions: string[];
  relatedPractices: string[];
}
