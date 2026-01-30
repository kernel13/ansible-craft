/**
 * Overview presenter for exploration workflow.
 *
 * Formats research findings into a scannable overview that categorizes
 * topics as interesting (worth exploring), standard (smart defaults ready),
 * or optional (hidden by default).
 */

import chalk from 'chalk';
import type { ResearchFindings, Feature, Package, Practice } from '../research/schemas/findings.js';
import type {
  ExplorationTopic,
  OverviewSection,
  TopicResolution,
  EnhancedFeature,
} from './types.js';

// ============================================
// Topic Grouping
// ============================================

/**
 * Topics grouped by interest level.
 */
export interface GroupedTopics {
  /** Topics with depth worth exploring */
  interesting: ExplorationTopic[];
  /** Topics with smart defaults ready */
  standard: ExplorationTopic[];
  /** Optional topics (hidden by default) */
  optional: ExplorationTopic[];
}

/**
 * Determine if a feature is interesting enough to explore.
 *
 * A feature is interesting if:
 * - It has multiple alternatives
 * - It has moderate/complex complexity
 * - It has an explicit exploreHint
 * - It's a recommended category with high confidence
 */
function isFeatureInteresting(feature: Feature): boolean {
  // Has alternatives to choose from
  if (feature.alternatives && feature.alternatives.length > 0) {
    return true;
  }

  // Complex features warrant exploration
  if (feature.complexity === 'complex') {
    return true;
  }

  // Has explicit exploration hint
  if (feature.exploreHint) {
    return true;
  }

  // Recommended features with moderate complexity
  if (feature.category === 'recommended' && feature.complexity === 'moderate') {
    return true;
  }

  return false;
}

/**
 * Convert a Feature to an ExplorationTopic.
 */
function featureToTopic(feature: Feature, index: number): ExplorationTopic {
  const isInteresting = isFeatureInteresting(feature);

  // Build default resolution
  let defaultResolution: TopicResolution | undefined;
  if (feature.category === 'essential') {
    defaultResolution = {
      type: 'smart_default',
      value: 'enabled',
      rationale: 'Essential feature - enabled by default',
    };
  } else if (feature.category === 'optional') {
    defaultResolution = {
      type: 'smart_default',
      value: 'disabled',
      rationale: 'Optional feature - disabled by default',
    };
  }

  return {
    id: `feature-${index}-${feature.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: feature.name,
    type: 'feature',
    description: feature.description,
    isInteresting,
    interestReason: feature.exploreHint || (isInteresting ? 'Multiple implementation options available' : undefined),
    findings: [feature as EnhancedFeature],
    defaultResolution,
  };
}

/**
 * Create standard configuration topics.
 */
function createStandardTopics(findings: ResearchFindings): ExplorationTopic[] {
  const topics: ExplorationTopic[] = [];

  // Package selection topic (if packages found)
  if (findings.packages.length > 0) {
    const defaultPkg = findings.packages.find((p) => p.isDefault) || findings.packages[0];
    topics.push({
      id: 'package-selection',
      name: 'Package',
      type: 'configuration',
      description: 'Package to use for installation',
      isInteresting: findings.packages.length > 1,
      interestReason: findings.packages.length > 1 ? 'Multiple package options available' : undefined,
      packages: findings.packages.map((p) => ({
        ...p,
        confidence: p.confidence || 'medium',
      })),
      defaultResolution: {
        type: 'smart_default',
        value: defaultPkg.name,
        rationale: defaultPkg.isDefault ? 'Recommended package' : 'First available package',
      },
    });
  }

  // Platform topic
  topics.push({
    id: 'platforms',
    name: 'Platforms',
    type: 'configuration',
    description: 'Target operating systems',
    isInteresting: false,
    defaultResolution: {
      type: 'smart_default',
      value: ['Generic'],
      rationale: 'Platform-agnostic by default',
    },
  });

  // Privilege escalation topic
  topics.push({
    id: 'privilege-escalation',
    name: 'Privilege Escalation',
    type: 'configuration',
    description: 'Whether tasks require sudo/root',
    isInteresting: false,
    defaultResolution: {
      type: 'smart_default',
      value: { required: 'yes', becomeUser: 'root' },
      rationale: 'Most roles require root privileges',
    },
  });

  return topics;
}

/**
 * Create optional configuration topics.
 */
function createOptionalTopics(): ExplorationTopic[] {
  return [
    {
      id: 'molecule-testing',
      name: 'Molecule Testing',
      type: 'testing',
      description: 'Automated testing configuration',
      isInteresting: false,
      defaultResolution: {
        type: 'smart_default',
        value: { enabled: true, level: 'basic', driver: 'docker' },
        rationale: 'Basic Docker-based testing',
      },
    },
    {
      id: 'tags-strategy',
      name: 'Tags Strategy',
      type: 'configuration',
      description: 'Task tagging approach',
      isInteresting: false,
      defaultResolution: {
        type: 'smart_default',
        value: { strategy: 'grouped', groups: ['install', 'config', 'service'] },
        rationale: 'Grouped tags for common operations',
      },
    },
    {
      id: 'variable-naming',
      name: 'Variable Naming',
      type: 'configuration',
      description: 'Variable naming convention',
      isInteresting: false,
      defaultResolution: {
        type: 'smart_default',
        value: 'prefixed',
        rationale: 'Prefixed naming prevents conflicts',
      },
    },
  ];
}

/**
 * Group topics by interest level.
 */
export function groupTopicsByInterest(
  findings: ResearchFindings,
  maxInteresting: number = 5,
): GroupedTopics {
  const result: GroupedTopics = {
    interesting: [],
    standard: [],
    optional: [],
  };

  // Convert features to topics
  const featureTopics = findings.features.map((f, i) => featureToTopic(f, i));

  // Separate interesting features
  const interestingFeatures = featureTopics.filter((t) => t.isInteresting);
  const standardFeatures = featureTopics.filter((t) => !t.isInteresting);

  // Add standard features to standard
  result.standard.push(...standardFeatures);

  // Add standard configuration topics
  const standardConfig = createStandardTopics(findings);
  const interestingConfig = standardConfig.filter((t) => t.isInteresting);
  const standardConfigTopics = standardConfig.filter((t) => !t.isInteresting);

  result.standard.push(...standardConfigTopics);

  // Combine all interesting topics
  const allInteresting = [...interestingFeatures, ...interestingConfig];

  // Limit interesting topics and move overflow to standard
  if (allInteresting.length > maxInteresting) {
    result.interesting = allInteresting.slice(0, maxInteresting);
    result.standard.push(...allInteresting.slice(maxInteresting));
  } else {
    result.interesting = allInteresting;
  }

  // Add optional topics
  result.optional = createOptionalTopics();

  return result;
}

// ============================================
// Overview Formatting
// ============================================

/**
 * Format a badge for a topic.
 */
function formatBadge(topic: ExplorationTopic): string {
  if (topic.type === 'feature') {
    const finding = topic.findings?.[0];
    if (finding) {
      const categoryColor =
        finding.category === 'essential'
          ? chalk.green
          : finding.category === 'recommended'
            ? chalk.yellow
            : chalk.dim;
      return categoryColor(`[${finding.category}]`);
    }
  }
  return '';
}

/**
 * Format the interesting findings section.
 */
export function formatInterestingFindings(topics: ExplorationTopic[]): OverviewSection {
  return {
    title: 'Interesting Findings (explore these)',
    items: topics.map((topic) => ({
      name: topic.name,
      description: topic.interestReason || topic.description,
      badge: formatBadge(topic),
      status: 'explore' as const,
    })),
  };
}

/**
 * Format the standard decisions section.
 */
export function formatStandardDecisions(topics: ExplorationTopic[]): OverviewSection {
  return {
    title: 'Standard Decisions (smart defaults ready)',
    items: topics.map((topic) => {
      let defaultValue = '';
      if (topic.defaultResolution) {
        const val = topic.defaultResolution.value;
        if (typeof val === 'string') {
          defaultValue = val;
        } else if (Array.isArray(val)) {
          defaultValue = val.join(', ');
        } else if (typeof val === 'object' && val !== null) {
          // Extract a meaningful string from the object
          const obj = val as Record<string, unknown>;
          if ('name' in obj) defaultValue = String(obj.name);
          else if ('enabled' in obj) defaultValue = obj.enabled ? 'enabled' : 'disabled';
          else defaultValue = 'configured';
        }
      }
      return {
        name: topic.name,
        description: defaultValue ? `${defaultValue} ✓` : topic.description,
        status: 'ready' as const,
      };
    }),
  };
}

/**
 * Format the optional topics section.
 */
export function formatOptionalTopics(topics: ExplorationTopic[]): OverviewSection {
  return {
    title: 'Optional Topics (hidden by default)',
    items: topics.map((topic) => ({
      name: topic.name,
      description: topic.description,
      status: 'optional' as const,
    })),
  };
}

/**
 * Format best practices section.
 */
export function formatBestPractices(practices: Practice[]): string {
  if (practices.length === 0) return '';

  const lines = ['', chalk.bold('Best Practices:')];

  const critical = practices.filter((p) => p.priority === 'critical');
  const recommended = practices.filter((p) => p.priority === 'recommended');

  for (const practice of [...critical, ...recommended].slice(0, 4)) {
    const icon = practice.priority === 'critical' ? chalk.red('!') : chalk.yellow('•');
    lines.push(`  ${icon} ${practice.practice}`);
    lines.push(chalk.dim(`     ${practice.rationale}`));
  }

  return lines.join('\n');
}

/**
 * Format complete overview for CLI display.
 */
export function formatOverview(
  roleName: string,
  roleDescription: string,
  findings: ResearchFindings,
  options?: { maxInteresting?: number },
): string {
  const grouped = groupTopicsByInterest(findings, options?.maxInteresting);
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.cyan.bold(`## Research Complete for "${roleDescription}"`));
  lines.push('');

  // Interesting findings section
  if (grouped.interesting.length > 0) {
    const section = formatInterestingFindings(grouped.interesting);
    lines.push(chalk.yellow.bold(`### ${section.title}`));
    for (const item of section.items) {
      const badge = item.badge ? ` ${item.badge}` : '';
      lines.push(`  ${chalk.cyan('•')} ${chalk.bold(item.name)}${badge} - ${item.description}`);
    }
    lines.push('');
  }

  // Standard decisions section
  if (grouped.standard.length > 0) {
    const section = formatStandardDecisions(grouped.standard);
    lines.push(chalk.green.bold(`### ${section.title}`));
    for (const item of section.items) {
      lines.push(`  ${chalk.green('✓')} ${item.name}: ${item.description}`);
    }
    lines.push('');
  }

  // Optional topics section (collapsed)
  if (grouped.optional.length > 0) {
    const section = formatOptionalTopics(grouped.optional);
    const topicNames = section.items.map((i) => i.name).join(', ');
    lines.push(chalk.dim(`### ${section.title}`));
    lines.push(chalk.dim(`  ${topicNames}...`));
    lines.push('');
  }

  // Best practices
  if (findings.bestPractices.length > 0) {
    lines.push(formatBestPractices(findings.bestPractices));
    lines.push('');
  }

  // Galaxy roles reference
  if (findings.galaxyRoles.length > 0) {
    lines.push(chalk.bold('Reference Galaxy Roles:'));
    for (const role of findings.galaxyRoles.slice(0, 3)) {
      const stars = '⭐'.repeat(Math.min(Math.ceil(role.stars / 100), 5));
      lines.push(
        `  ${role.namespace}.${role.name} (${stars} ${role.downloads.toLocaleString()} downloads)`,
      );
      if (role.keyFeatures.length > 0) {
        lines.push(chalk.dim(`     Features: ${role.keyFeatures.slice(0, 3).join(', ')}`));
      }
    }
    lines.push('');
  }

  // Prompt
  lines.push(chalk.cyan('What would you like to explore? (type topic name or "continue" for defaults)'));

  return lines.join('\n');
}

/**
 * Create all exploration topics from research findings.
 */
export function createTopicsFromFindings(findings: ResearchFindings): ExplorationTopic[] {
  const grouped = groupTopicsByInterest(findings);
  return [...grouped.interesting, ...grouped.standard, ...grouped.optional];
}
