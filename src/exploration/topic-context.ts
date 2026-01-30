/**
 * Topic context builder for exploration workflow.
 *
 * Builds focused context for each topic during exploration,
 * including options, trade-offs, and follow-up questions.
 */

import type { Feature, Practice } from '../research/schemas/findings.js';
import type { ExplorationTopic, TopicContext, EnhancedFeature } from './types.js';

// ============================================
// Topic Summary Generation
// ============================================

/**
 * Generate a brief summary for a topic.
 */
export function formatTopicSummary(topic: ExplorationTopic): string {
  const finding = topic.findings?.[0];

  if (finding) {
    // Feature topic
    const alternatives = finding.alternatives?.length || 0;
    if (alternatives > 0) {
      return `Research found ${alternatives + 1} implementation approaches for ${topic.name}. ${finding.description}`;
    }
    return finding.description;
  }

  if (topic.packages && topic.packages.length > 0) {
    // Package topic
    const count = topic.packages.length;
    if (count > 1) {
      return `${count} package options available for installation.`;
    }
    return `Package: ${topic.packages[0].name} (${topic.packages[0].source})`;
  }

  // Configuration topic
  return topic.description;
}

// ============================================
// Options Extraction
// ============================================

/**
 * Option with trade-offs for exploration.
 */
export interface TopicOption {
  label: string;
  description: string;
  tradeoffs?: string;
  isRecommended?: boolean;
  complexity?: string;
}

/**
 * Extract options from a feature topic.
 */
function extractFeatureOptions(topic: ExplorationTopic): TopicOption[] {
  const finding = topic.findings?.[0];
  if (!finding) return [];

  const options: TopicOption[] = [];

  // Main option
  options.push({
    label: finding.name,
    description: finding.description,
    isRecommended: finding.category === 'recommended' || finding.category === 'essential',
    complexity: finding.complexity,
  });

  // Alternatives
  if (finding.alternatives) {
    for (const alt of finding.alternatives) {
      options.push({
        label: alt.name,
        description: alt.description,
        tradeoffs: alt.tradeoffs,
        isRecommended: false,
      });
    }
  }

  return options;
}

/**
 * Extract options from a package topic.
 */
function extractPackageOptions(topic: ExplorationTopic): TopicOption[] {
  if (!topic.packages || topic.packages.length === 0) return [];

  return topic.packages.map((pkg) => ({
    label: `${pkg.name} (${pkg.source})`,
    description: pkg.description || `${pkg.name} package`,
    isRecommended: pkg.isDefault,
    tradeoffs: pkg.qualityIndicators?.official
      ? undefined
      : 'Community-maintained package',
  }));
}

/**
 * Extract options from a configuration topic.
 */
function extractConfigOptions(topic: ExplorationTopic): TopicOption[] {
  // Standard configuration topics have pre-defined options
  switch (topic.id) {
    case 'platforms':
      return [
        { label: 'Generic', description: 'Platform-agnostic role', isRecommended: true },
        { label: 'Ubuntu', description: 'Ubuntu 20.04/22.04 LTS' },
        { label: 'Debian', description: 'Debian 11/12' },
        { label: 'RHEL', description: 'RHEL/CentOS/Rocky 8/9' },
        { label: 'Windows', description: 'Windows Server 2019/2022' },
      ];

    case 'privilege-escalation':
      return [
        { label: 'Yes', description: 'Always requires elevated privileges', isRecommended: true },
        { label: 'No', description: 'Runs as regular user' },
        { label: 'Sometimes', description: 'Only certain tasks need elevation' },
      ];

    case 'molecule-testing':
      return [
        { label: 'Basic', description: 'Docker-based testing with sensible defaults', isRecommended: true },
        { label: 'Advanced', description: 'Full control over driver, images, test sequence' },
        { label: 'None', description: 'Skip automated testing' },
      ];

    case 'tags-strategy':
      return [
        { label: 'Grouped', description: 'Logical tag groups (install, config, service)', isRecommended: true },
        { label: 'Per-task', description: 'Unique tag per task' },
        { label: 'None', description: 'No tags on tasks' },
      ];

    case 'variable-naming':
      return [
        { label: 'Prefixed', description: 'Prefix with role name (nginx_port)', isRecommended: true, tradeoffs: 'Prevents variable conflicts in playbooks' },
        { label: 'Flat', description: 'No prefix (port)', tradeoffs: 'Risk of variable name conflicts' },
      ];

    default:
      return [];
  }
}

/**
 * Extract options for a topic.
 */
export function extractTopicOptions(topic: ExplorationTopic): TopicOption[] {
  switch (topic.type) {
    case 'feature':
      return extractFeatureOptions(topic);
    case 'configuration':
      if (topic.packages && topic.packages.length > 0) {
        return extractPackageOptions(topic);
      }
      return extractConfigOptions(topic);
    case 'testing':
      return extractConfigOptions(topic);
    case 'structure':
      return extractConfigOptions(topic);
    default:
      return [];
  }
}

// ============================================
// Follow-up Questions
// ============================================

/**
 * Generate contextual follow-up questions for a topic.
 */
export function generateContextualQuestions(
  topic: ExplorationTopic,
  selectedOption?: string,
): string[] {
  const questions: string[] = [];

  // Feature-specific follow-ups
  if (topic.type === 'feature') {
    const finding = topic.findings?.[0];
    if (finding) {
      if (finding.complexity === 'complex') {
        questions.push(`Would you like the full implementation or a simplified version?`);
      }
      if (finding.alternatives && finding.alternatives.length > 0) {
        questions.push(`Which approach fits your use case best?`);
      }
    }
  }

  // Topic-specific follow-ups
  switch (topic.id) {
    case 'package-selection':
      if (selectedOption) {
        questions.push(`Do you need a specific version of ${selectedOption}?`);
      }
      break;

    case 'platforms':
      questions.push(`Do you need to support multiple platforms simultaneously?`);
      break;

    case 'molecule-testing':
      if (selectedOption === 'Advanced') {
        questions.push(`Which test driver: Docker, Podman, Vagrant, or Delegated?`);
        questions.push(`Do you need to test with systemd (privileged containers)?`);
      }
      break;

    case 'privilege-escalation':
      if (selectedOption === 'Sometimes') {
        questions.push(`Which tasks require elevated privileges?`);
      }
      break;
  }

  // Generic follow-up
  if (questions.length === 0) {
    questions.push(`Anything else to explore, or continue to summary?`);
  }

  return questions;
}

// ============================================
// Related Practices
// ============================================

/**
 * Find practices related to a topic.
 */
export function findRelatedPractices(
  topic: ExplorationTopic,
  practices: Practice[],
): string[] {
  const related: string[] = [];

  // Feature name keywords
  const keywords = topic.name.toLowerCase().split(/\s+/);

  for (const practice of practices) {
    const practiceText = practice.practice.toLowerCase();
    const matchesKeyword = keywords.some((kw) => practiceText.includes(kw));

    if (matchesKeyword) {
      related.push(`${practice.practice} (${practice.priority})`);
    }
  }

  // Limit to 3 most relevant
  return related.slice(0, 3);
}

// ============================================
// Topic Context Building
// ============================================

/**
 * Build complete context for exploring a topic.
 */
export function buildTopicContext(
  topic: ExplorationTopic,
  practices?: Practice[],
): TopicContext {
  const summary = formatTopicSummary(topic);
  const options = extractTopicOptions(topic);
  const followUpQuestions = generateContextualQuestions(topic);
  const relatedPractices = practices
    ? findRelatedPractices(topic, practices)
    : (topic.bestPractices?.map((p) => p.practice) || []);

  return {
    topic,
    summary,
    options: options.map((opt) => ({
      label: opt.label,
      description: opt.description,
      tradeoffs: opt.tradeoffs,
    })),
    followUpQuestions,
    relatedPractices,
  };
}

/**
 * Format topic context for display.
 */
export function formatTopicContextForDisplay(context: TopicContext): string {
  const lines: string[] = [];

  // Summary
  lines.push(`\n${context.summary}`);
  lines.push('');

  // Options
  if (context.options.length > 0) {
    lines.push('Options:');
    for (const option of context.options) {
      lines.push(`  - ${option.label}: ${option.description}`);
      if (option.tradeoffs) {
        lines.push(`    Trade-off: ${option.tradeoffs}`);
      }
    }
    lines.push('');
  }

  // Related practices
  if (context.relatedPractices.length > 0) {
    lines.push('Related best practices:');
    for (const practice of context.relatedPractices) {
      lines.push(`  • ${practice}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format options for AskUserQuestion in skill.
 */
export function formatOptionsForSkill(
  options: TopicOption[],
): Array<{ label: string; description: string }> {
  return options.map((opt) => ({
    label: opt.isRecommended ? `${opt.label} (Recommended)` : opt.label,
    description: opt.tradeoffs ? `${opt.description}. ${opt.tradeoffs}` : opt.description,
  }));
}
