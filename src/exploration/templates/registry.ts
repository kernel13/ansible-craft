/**
 * Starter template registry.
 *
 * Provides pre-defined exploration templates for common tools/services.
 * Templates define known topics that research can enrich.
 */

import type { ResearchFindings } from '../../research/schemas/findings.js';
import type { ExplorationTopic, StarterTemplate, StarterTopic } from '../types.js';
import { nginxTemplate } from './nginx.js';
import { postgresqlTemplate } from './postgresql.js';
import { dockerTemplate } from './docker.js';

// ============================================
// Template Registry
// ============================================

/**
 * All registered starter templates.
 */
const TEMPLATES: StarterTemplate[] = [
  nginxTemplate,
  postgresqlTemplate,
  dockerTemplate,
];

/**
 * Get a starter template for a tool/service.
 *
 * @param toolName - The tool or service name
 * @returns The matching template or undefined
 */
export function getTemplateForTool(toolName: string): StarterTemplate | undefined {
  const normalized = toolName.toLowerCase().replace(/[^a-z0-9]/g, '');

  return TEMPLATES.find(
    (t) =>
      t.tool.toLowerCase() === normalized ||
      t.aliases.some((a) => a.toLowerCase() === normalized),
  );
}

/**
 * List all available templates.
 */
export function listTemplates(): Array<{ tool: string; aliases: string[] }> {
  return TEMPLATES.map((t) => ({
    tool: t.tool,
    aliases: t.aliases,
  }));
}

// ============================================
// Template Merging
// ============================================

/**
 * Convert a StarterTopic to an ExplorationTopic.
 */
function starterToExplorationTopic(
  starter: StarterTopic,
  researchFeature?: ResearchFindings['features'][0],
): ExplorationTopic {
  return {
    id: starter.id,
    name: starter.name,
    type: starter.type,
    description: starter.description,
    isInteresting: starter.typicallyInteresting,
    interestReason: starter.typicallyInteresting ? 'Common configuration decision' : undefined,
    findings: researchFeature
      ? [
          {
            ...researchFeature,
            confidence: researchFeature.confidence || 'medium',
          },
        ]
      : undefined,
    defaultResolution: {
      type: 'smart_default',
      value: starter.defaultValue as string | string[] | Record<string, unknown>,
      rationale: 'Template default',
    },
  };
}

/**
 * Merge a starter template with research findings.
 *
 * Template topics are enriched with research findings where available.
 * Research findings not covered by template are added as additional topics.
 */
export function mergeTemplateWithFindings(
  template: StarterTemplate,
  findings: ResearchFindings,
): ExplorationTopic[] {
  const topics: ExplorationTopic[] = [];
  const coveredFeatures = new Set<string>();

  // Convert template topics, enriching with research
  for (const starterTopic of template.topics) {
    // Try to find matching research feature
    const matchingFeature = findings.features.find(
      (f) =>
        f.name.toLowerCase().includes(starterTopic.name.toLowerCase()) ||
        starterTopic.name.toLowerCase().includes(f.name.toLowerCase()),
    );

    if (matchingFeature) {
      coveredFeatures.add(matchingFeature.name);
    }

    topics.push(starterToExplorationTopic(starterTopic, matchingFeature));
  }

  // Add research features not covered by template
  for (const feature of findings.features) {
    if (!coveredFeatures.has(feature.name)) {
      topics.push({
        id: `research-${feature.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name: feature.name,
        type: 'feature',
        description: feature.description,
        isInteresting:
          feature.category !== 'optional' ||
          feature.complexity === 'complex' ||
          !!feature.exploreHint,
        interestReason: feature.exploreHint,
        findings: [
          {
            ...feature,
            confidence: feature.confidence || 'medium',
          },
        ],
        defaultResolution:
          feature.category === 'essential'
            ? {
                type: 'smart_default',
                value: 'enabled',
                rationale: 'Essential feature',
              }
            : undefined,
      });
    }
  }

  // Add standard configuration topics
  topics.push(
    {
      id: 'package-selection',
      name: 'Package',
      type: 'configuration',
      description: 'Package to use for installation',
      isInteresting: findings.packages.length > 1,
      packages: findings.packages.map((p) => ({
        ...p,
        confidence: p.confidence || 'medium',
      })),
      defaultResolution: {
        type: 'smart_default',
        value: findings.packages.find((p) => p.isDefault)?.name || findings.packages[0]?.name || 'auto',
        rationale: 'Recommended package',
      },
    },
    {
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
    },
    {
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
    },
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
  );

  // Add template best practices to findings
  for (const practice of template.bestPractices) {
    if (!findings.bestPractices.some((p) => p.practice === practice.practice)) {
      findings.bestPractices.push(practice);
    }
  }

  return topics;
}

/**
 * Check if a tool has a starter template.
 */
export function hasTemplate(toolName: string): boolean {
  return getTemplateForTool(toolName) !== undefined;
}
