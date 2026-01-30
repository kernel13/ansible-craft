/**
 * Smart defaults engine for exploration workflow.
 *
 * Calculates intelligent defaults based on research findings,
 * selected features, and feature correlations.
 */

import type { ResearchFindings, Feature, Package } from '../research/schemas/findings.js';
import type {
  RoleWizardContext,
  RoleStructureDirectory,
  RolePlatform,
  RoleHandler,
  AnsibleVersionConfig,
  VariableStrategyConfig,
  PrivilegeEscalationConfig,
  TagsConfig,
  IdempotencyConfig,
  DependenciesConfig,
  MoleculeConfig,
} from '../wizard/types.js';
import type { ExplorationSession, ExplorationTopic, TopicResolution } from './types.js';

// ============================================
// Feature Correlation Rules
// ============================================

/**
 * Feature correlation rules that influence defaults.
 */
interface FeatureCorrelation {
  /** Feature name patterns that trigger this correlation */
  featurePatterns: RegExp[];
  /** Implied handlers */
  handlers?: RoleHandler[];
  /** Implied structure directories */
  structure?: RoleStructureDirectory[];
  /** Implied platforms */
  platforms?: RolePlatform[];
  /** Tag groups to add */
  tagGroups?: string[];
  /** Whether templates are needed */
  needsTemplates?: boolean;
  /** Whether handlers are needed */
  needsHandlers?: boolean;
}

const FEATURE_CORRELATIONS: FeatureCorrelation[] = [
  {
    // SSL/TLS features
    featurePatterns: [/ssl/i, /tls/i, /https/i, /certificate/i],
    handlers: ['reload'],
    structure: ['templates', 'handlers'],
    tagGroups: ['ssl', 'config'],
    needsTemplates: true,
    needsHandlers: true,
  },
  {
    // Service management features
    featurePatterns: [/service/i, /daemon/i, /systemd/i],
    handlers: ['restart', 'reload', 'enable'],
    structure: ['handlers'],
    tagGroups: ['service'],
    needsHandlers: true,
  },
  {
    // Configuration management
    featurePatterns: [/config/i, /configuration/i, /virtual.?host/i],
    structure: ['templates', 'handlers'],
    handlers: ['reload'],
    tagGroups: ['config'],
    needsTemplates: true,
    needsHandlers: true,
  },
  {
    // Backup features
    featurePatterns: [/backup/i, /snapshot/i],
    structure: ['files', 'templates'],
    tagGroups: ['backup'],
  },
  {
    // Monitoring/logging
    featurePatterns: [/monitor/i, /logging/i, /log/i],
    structure: ['templates'],
    tagGroups: ['monitoring'],
    needsTemplates: true,
  },
  {
    // User management
    featurePatterns: [/user/i, /auth/i, /access/i],
    tagGroups: ['users'],
  },
  {
    // Database features
    featurePatterns: [/database/i, /db/i, /replication/i],
    handlers: ['restart'],
    tagGroups: ['database'],
    needsHandlers: true,
  },
  {
    // Firewall features
    featurePatterns: [/firewall/i, /iptables/i, /ufw/i],
    tagGroups: ['firewall'],
  },
];

/**
 * Apply feature correlations to determine implied settings.
 */
function applyFeatureCorrelations(
  selectedFeatures: string[],
): {
  handlers: Set<RoleHandler>;
  structure: Set<RoleStructureDirectory>;
  tagGroups: Set<string>;
  needsTemplates: boolean;
  needsHandlers: boolean;
} {
  const handlers = new Set<RoleHandler>();
  const structure = new Set<RoleStructureDirectory>();
  const tagGroups = new Set<string>();
  let needsTemplates = false;
  let needsHandlers = false;

  for (const feature of selectedFeatures) {
    for (const correlation of FEATURE_CORRELATIONS) {
      if (correlation.featurePatterns.some((pattern) => pattern.test(feature))) {
        correlation.handlers?.forEach((h) => handlers.add(h));
        correlation.structure?.forEach((s) => structure.add(s));
        correlation.tagGroups?.forEach((t) => tagGroups.add(t));
        if (correlation.needsTemplates) needsTemplates = true;
        if (correlation.needsHandlers) needsHandlers = true;
      }
    }
  }

  return { handlers, structure, tagGroups, needsTemplates, needsHandlers };
}

// ============================================
// Research-Informed Defaults
// ============================================

/**
 * Determine default package from research findings.
 */
function getDefaultPackage(findings: ResearchFindings): string | undefined {
  // First check for explicit default
  const defaultPkg = findings.packages.find((p) => p.isDefault);
  if (defaultPkg) return defaultPkg.name;

  // Then check for high confidence package
  const highConfidence = findings.packages.find((p) => p.confidence === 'high');
  if (highConfidence) return highConfidence.name;

  // Then check for official package
  const official = findings.packages.find(
    (p) => p.qualityIndicators?.official,
  );
  if (official) return official.name;

  // Fall back to first package
  return findings.packages[0]?.name;
}

/**
 * Determine default features from research findings.
 */
function getDefaultFeatures(findings: ResearchFindings): string[] {
  // Essential features are always selected
  const essential = findings.features
    .filter((f) => f.category === 'essential')
    .map((f) => f.name);

  // High-confidence recommended features are also included
  const highConfidenceRecommended = findings.features
    .filter(
      (f) =>
        f.category === 'recommended' &&
        f.confidence === 'high' &&
        f.complexity !== 'complex',
    )
    .map((f) => f.name);

  return [...essential, ...highConfidenceRecommended];
}

// ============================================
// Default Calculation
// ============================================

/**
 * Options for smart defaults calculation.
 */
export interface SmartDefaultsOptions {
  /** Research findings to inform defaults */
  findings?: ResearchFindings;
  /** Features selected by user or from research */
  selectedFeatures?: string[];
  /** Package selected by user */
  selectedPackage?: string;
  /** Conservative mode - fewer features enabled */
  conservative?: boolean;
}

/**
 * Calculate structure directories based on features and correlations.
 */
function calculateStructure(
  correlations: ReturnType<typeof applyFeatureCorrelations>,
  options: SmartDefaultsOptions,
): RoleStructureDirectory[] {
  const structure = new Set<RoleStructureDirectory>(['tasks']);

  // Always include defaults for user-configurable vars
  structure.add('defaults');

  // Add meta for dependencies
  structure.add('meta');

  // Add correlated structure
  for (const dir of correlations.structure) {
    structure.add(dir);
  }

  // Add handlers if needed
  if (correlations.needsHandlers || correlations.handlers.size > 0) {
    structure.add('handlers');
  }

  // Add templates if needed
  if (correlations.needsTemplates) {
    structure.add('templates');
  }

  return Array.from(structure);
}

/**
 * Calculate handlers based on features and correlations.
 */
function calculateHandlers(
  correlations: ReturnType<typeof applyFeatureCorrelations>,
): RoleHandler[] {
  const handlers = new Set<RoleHandler>();

  // Add correlated handlers
  for (const handler of correlations.handlers) {
    handlers.add(handler);
  }

  // If no handlers detected but handlers directory needed, add restart
  if (correlations.needsHandlers && handlers.size === 0) {
    handlers.add('restart');
    handlers.add('reload');
  }

  return Array.from(handlers);
}

/**
 * Calculate tag groups based on features and correlations.
 */
function calculateTags(
  correlations: ReturnType<typeof applyFeatureCorrelations>,
): TagsConfig {
  const groups = new Set<string>(['install', 'config', 'service']);

  // Add correlated tag groups
  for (const group of correlations.tagGroups) {
    groups.add(group);
  }

  return {
    strategy: 'grouped',
    groups: Array.from(groups),
  };
}

/**
 * Calculate smart defaults for unexplored topics.
 *
 * Uses research findings and selected features to determine
 * intelligent defaults for configuration.
 */
export function calculateSmartDefaults(options: SmartDefaultsOptions = {}): RoleWizardContext {
  const { findings, selectedFeatures = [], selectedPackage, conservative = false } = options;

  // Get features from research if not provided
  const features =
    selectedFeatures.length > 0
      ? selectedFeatures
      : findings
        ? getDefaultFeatures(findings)
        : [];

  // Apply feature correlations
  const correlations = applyFeatureCorrelations(features);

  // Build wizard context with smart defaults
  const context: RoleWizardContext = {
    // Structure based on features
    structure: calculateStructure(correlations, options),

    // Generic platform by default
    platforms: ['Generic'],

    // Handlers based on features
    handlers: calculateHandlers(correlations),

    // Ansible version
    ansibleVersion: {
      minimum: '2.14',
      includeVersionCheck: false,
    },

    // Variable strategy
    variableStrategy: {
      includeDefaults: true,
      includeVars: false,
      naming: 'prefixed',
    },

    // Privilege escalation - most roles need it
    privilegeEscalation: {
      required: 'yes',
      becomeUser: 'root',
    },

    // Tags based on features
    tags: calculateTags(correlations),

    // Idempotency settings
    idempotency: {
      supportCheckMode: true,
      includeChangedWhen: true,
      includeFailedWhen: false,
    },

    // Dependencies
    dependencies: {
      includeMeta: true,
      roles: [],
    },

    // Molecule testing
    molecule: conservative
      ? { enabled: false }
      : {
          enabled: true,
          level: 'basic',
          driver: 'docker',
          verifier: 'ansible',
          testSequence: ['create', 'converge', 'idempotence', 'verify', 'destroy'],
        },

    // Selected features from exploration
    selectedFeatures: features.length > 0 ? features : undefined,

    // Selected package
    selectedPackages: selectedPackage ? [selectedPackage] : findings ? [getDefaultPackage(findings)].filter((p): p is string => !!p) : undefined,

    // Empty custom field
    custom: {},
  };

  return context;
}

/**
 * Merge exploration session decisions with smart defaults.
 */
export function buildContextFromSession(session: ExplorationSession): RoleWizardContext {
  // Start with smart defaults based on research
  const context = calculateSmartDefaults({
    findings: session.researchFindings,
    selectedFeatures: extractSelectedFeatures(session),
    selectedPackage: extractSelectedPackage(session),
  });

  // Override with explored topic resolutions
  for (const [topicId, state] of Object.entries(session.explored)) {
    applyTopicResolution(context, topicId, state.resolution);
  }

  // Apply any natural language modifications
  for (const modification of session.modifications) {
    applyModificationToContext(context, modification);
  }

  return context;
}

/**
 * Extract selected features from session.
 */
function extractSelectedFeatures(session: ExplorationSession): string[] {
  const features: string[] = [];

  for (const [topicId, state] of Object.entries(session.explored)) {
    if (topicId.startsWith('feature-') && state.resolution.type === 'user_choice') {
      const value = state.resolution.value;
      if (typeof value === 'string') {
        features.push(value);
      } else if (Array.isArray(value)) {
        features.push(...value.filter((v): v is string => typeof v === 'string'));
      }
    }
  }

  return features;
}

/**
 * Extract selected package from session.
 */
function extractSelectedPackage(session: ExplorationSession): string | undefined {
  const packageState = session.explored['package-selection'];
  if (packageState?.resolution.type === 'user_choice') {
    const value = packageState.resolution.value;
    return typeof value === 'string' ? value : undefined;
  }
  return undefined;
}

/**
 * Apply a topic resolution to the context.
 */
function applyTopicResolution(
  context: RoleWizardContext,
  topicId: string,
  resolution: TopicResolution,
): void {
  const value = resolution.value;

  switch (topicId) {
    case 'platforms':
      if (Array.isArray(value)) {
        context.platforms = value as RolePlatform[];
      }
      break;

    case 'privilege-escalation':
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if ('required' in obj) {
          context.privilegeEscalation.required = obj.required as 'yes' | 'no' | 'sometimes';
        }
        if ('becomeUser' in obj && typeof obj.becomeUser === 'string') {
          context.privilegeEscalation.becomeUser = obj.becomeUser;
        }
      }
      break;

    case 'molecule-testing':
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        context.molecule = {
          ...context.molecule,
          enabled: obj.enabled !== false,
          level: (obj.level as MoleculeConfig['level']) || 'basic',
          driver: (obj.driver as MoleculeConfig['driver']) || 'docker',
        };
      }
      break;

    case 'tags-strategy':
      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        if ('strategy' in obj) {
          context.tags.strategy = obj.strategy as TagsConfig['strategy'];
        }
        if ('groups' in obj && Array.isArray(obj.groups)) {
          context.tags.groups = obj.groups as string[];
        }
      }
      break;

    case 'variable-naming':
      if (typeof value === 'string') {
        context.variableStrategy.naming = value as 'prefixed' | 'flat';
      }
      break;

    case 'package-selection':
      if (typeof value === 'string') {
        context.selectedPackages = [value];
      }
      break;
  }
}

/**
 * Apply a natural language modification to the context.
 */
function applyModificationToContext(
  context: RoleWizardContext,
  modification: { type: string; target: string; value?: unknown },
): void {
  switch (modification.type) {
    case 'add_feature':
      if (!context.selectedFeatures) {
        context.selectedFeatures = [];
      }
      if (!context.selectedFeatures.includes(modification.target)) {
        context.selectedFeatures.push(modification.target);
      }
      break;

    case 'remove_feature':
      if (context.selectedFeatures) {
        context.selectedFeatures = context.selectedFeatures.filter(
          (f) => f.toLowerCase() !== modification.target.toLowerCase(),
        );
      }
      break;

    case 'add_platform':
      const platform = modification.target as RolePlatform;
      if (!context.platforms.includes(platform)) {
        // Remove Generic if adding specific platform
        context.platforms = context.platforms.filter((p) => p !== 'Generic');
        context.platforms.push(platform);
      }
      break;

    case 'remove_platform':
      context.platforms = context.platforms.filter(
        (p) => p.toLowerCase() !== modification.target.toLowerCase(),
      );
      if (context.platforms.length === 0) {
        context.platforms = ['Generic'];
      }
      break;

    case 'toggle_molecule':
      const enable = modification.value !== false;
      context.molecule = {
        ...context.molecule,
        enabled: enable,
      };
      break;

    case 'change_setting':
      // Handle generic setting changes via custom field
      context.custom[modification.target] = String(modification.value ?? '');
      break;
  }
}

/**
 * Get a summary of what was defaulted vs explored.
 */
export function getDefaultsSummary(
  session: ExplorationSession,
  context: RoleWizardContext,
): {
  explored: string[];
  defaulted: string[];
  modifications: string[];
} {
  const explored = Object.keys(session.explored);
  const allTopicIds = session.topics.map((t) => t.id);
  const defaulted = allTopicIds.filter(
    (id) => !explored.includes(id) && !session.skipped.includes(id),
  );

  return {
    explored,
    defaulted,
    modifications: session.modifications.map((m) => m.originalText),
  };
}
