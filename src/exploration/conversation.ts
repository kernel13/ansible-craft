/**
 * Conversation parser for natural language modifications.
 *
 * Interprets user requests like "add CentOS support" or "skip molecule tests"
 * and converts them to structured modifications.
 */

import type { Modification, ExplorationSession, ExplorationTopic } from './types.js';
import type { RolePlatform } from '../wizard/types.js';

// ============================================
// Modification Types
// ============================================

type ModificationType =
  | 'add_feature'
  | 'remove_feature'
  | 'add_platform'
  | 'remove_platform'
  | 'change_setting'
  | 'toggle_molecule'
  | 'custom';

// ============================================
// Pattern Matching Rules
// ============================================

interface PatternRule {
  /** Patterns to match */
  patterns: RegExp[];
  /** Resulting modification type */
  type: ModificationType;
  /** Extract target from match groups */
  extractTarget: (match: RegExpMatchArray) => string;
  /** Extract value from match groups (optional) */
  extractValue?: (match: RegExpMatchArray) => unknown;
}

const PATTERN_RULES: PatternRule[] = [
  // Toggle molecule patterns (must come before generic add/remove patterns)
  {
    patterns: [
      /skip\s+(?:molecule\s+)?test(?:s|ing)?/i,
      /no\s+(?:molecule\s+)?test(?:s|ing)?/i,
      /disable\s+(?:molecule\s+)?test(?:s|ing)?/i,
    ],
    type: 'toggle_molecule',
    extractTarget: () => 'molecule',
    extractValue: () => false,
  },
  {
    patterns: [
      /enable\s+(?:molecule\s+)?test(?:s|ing)?/i,
      /add\s+(?:molecule\s+)?test(?:s|ing)?/i,
      /include\s+(?:molecule\s+)?test(?:s|ing)?/i,
    ],
    type: 'toggle_molecule',
    extractTarget: () => 'molecule',
    extractValue: () => true,
  },

  // Remove platform patterns (must come before add_platform to catch "don't support")
  {
    patterns: [
      /remove\s+(\w+)\s+(?:platform|support)/i,
      /drop\s+(\w+)/i,
      /don'?t\s+support\s+(\w+)/i,
    ],
    type: 'remove_platform',
    extractTarget: (match) => normalizePlatformName(match[1]),
  },

  // Add platform patterns
  {
    patterns: [
      /add\s+(?:support\s+for\s+)?(\w+)\s+(?:platform|support)/i,
      /support\s+(ubuntu|debian|rhel|centos|rocky|windows|linux|generic)/i,
      /include\s+(\w+)\s+(?:platform|support)/i,
      /add\s+(ubuntu|debian|rhel|centos|rocky|windows)/i,
    ],
    type: 'add_platform',
    extractTarget: (match) => normalizePlatformName(match[1]),
  },

  // Add feature patterns
  {
    patterns: [
      /add\s+(?:the\s+)?(.+?)\s+feature/i,
      /add\s+(?:the\s+)?(.+?)\s+support$/i,
      /include\s+(?:the\s+)?(.+?)\s+(?:feature|support)/i,
      /enable\s+(.+)/i,
      /add\s+support\s+for\s+(.+)/i,
    ],
    type: 'add_feature',
    extractTarget: (match) => normalizeFeatureName(match[1]),
  },

  // Remove feature patterns
  {
    patterns: [
      /remove\s+(?:the\s+)?(.+?)\s+feature/i,
      /exclude\s+(?:the\s+)?(.+)/i,
      /disable\s+(.+)/i,
      /don'?t\s+include\s+(.+)/i,
      /skip\s+(?:the\s+)?(.+?)\s+feature/i,
    ],
    type: 'remove_feature',
    extractTarget: (match) => normalizeFeatureName(match[1]),
  },

  // Make optional patterns
  {
    patterns: [/make\s+(.+?)\s+optional/i, /(.+?)\s+should\s+be\s+optional/i],
    type: 'change_setting',
    extractTarget: (match) => normalizeFeatureName(match[1]),
    extractValue: () => 'optional',
  },

  // Change setting patterns
  {
    patterns: [
      /(?:change|set|use)\s+(\w+)\s+(?:to|=)\s+(.+)/i,
      /(\w+)\s+should\s+be\s+(.+)/i,
    ],
    type: 'change_setting',
    extractTarget: (match) => match[1].toLowerCase(),
    extractValue: (match) => match[2].trim(),
  },
];

// ============================================
// Normalization Functions
// ============================================

/**
 * Normalize feature name for matching.
 */
function normalizeFeatureName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\bssl\b/gi, 'SSL/TLS')
    .replace(/\btls\b/gi, 'SSL/TLS')
    .replace(/\bvhost\b/gi, 'virtual hosts')
    .replace(/\bvhosts\b/gi, 'virtual hosts');
}

/**
 * Normalize platform name to valid RolePlatform.
 */
function normalizePlatformName(input: string): RolePlatform {
  const normalized = input.trim().toLowerCase();

  const platformMap: Record<string, RolePlatform> = {
    ubuntu: 'Ubuntu',
    debian: 'Debian',
    rhel: 'RHEL',
    centos: 'RHEL',
    rocky: 'RHEL',
    redhat: 'RHEL',
    'red hat': 'RHEL',
    windows: 'Windows',
    win: 'Windows',
    generic: 'Generic',
    all: 'Generic',
  };

  return platformMap[normalized] || 'Generic';
}

// ============================================
// Parsing Functions
// ============================================

/**
 * Parse a single natural language input into a modification.
 */
export function parseModification(input: string): Modification | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  for (const rule of PATTERN_RULES) {
    for (const pattern of rule.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          type: rule.type,
          target: rule.extractTarget(match),
          value: rule.extractValue?.(match),
          originalText: trimmed,
          applied: false,
        };
      }
    }
  }

  // No pattern matched - return as custom modification
  return {
    type: 'custom',
    target: trimmed,
    originalText: trimmed,
    applied: false,
  };
}

/**
 * Parse multiple modifications from input (comma or newline separated).
 */
export function parseModifications(input: string): Modification[] {
  const modifications: Modification[] = [];

  // Split by comma or newline
  const parts = input.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const mod = parseModification(part);
    if (mod) {
      modifications.push(mod);
    }
  }

  return modifications;
}

// ============================================
// Modification Application
// ============================================

/**
 * Apply a modification to an exploration session.
 *
 * Returns the modified session and whether the modification was applied.
 */
export function applyModification(
  session: ExplorationSession,
  modification: Modification,
): { session: ExplorationSession; applied: boolean; message: string } {
  const updatedSession = { ...session };
  let applied = false;
  let message = '';

  switch (modification.type) {
    case 'add_feature': {
      // Find matching topic
      const topic = findTopicByName(session.topics, modification.target);
      if (topic) {
        // Mark as explored with user choice
        updatedSession.explored = {
          ...updatedSession.explored,
          [topic.id]: {
            topicId: topic.id,
            resolution: {
              type: 'user_choice',
              value: modification.target,
              rationale: `Added via: "${modification.originalText}"`,
            },
            exploredAt: new Date().toISOString(),
          },
        };
        applied = true;
        message = `Added feature: ${modification.target}`;
      } else {
        // Add to custom field for planner
        message = `Feature "${modification.target}" will be added to requirements`;
        applied = true;
      }
      break;
    }

    case 'remove_feature': {
      const topic = findTopicByName(session.topics, modification.target);
      if (topic && updatedSession.explored[topic.id]) {
        // Remove from explored
        const { [topic.id]: _, ...rest } = updatedSession.explored;
        updatedSession.explored = rest;
        // Add to skipped
        updatedSession.skipped = [...updatedSession.skipped, topic.id];
        applied = true;
        message = `Removed feature: ${modification.target}`;
      } else if (topic) {
        // Add to skipped
        updatedSession.skipped = [...updatedSession.skipped, topic.id];
        applied = true;
        message = `Skipped feature: ${modification.target}`;
      } else {
        message = `Feature "${modification.target}" not found`;
      }
      break;
    }

    case 'add_platform': {
      const platformTopic = session.topics.find((t) => t.id === 'platforms');
      if (platformTopic) {
        const currentPlatforms =
          (updatedSession.explored['platforms']?.resolution.value as string[]) || [];
        const newPlatforms = [...new Set([...currentPlatforms, modification.target as RolePlatform])];

        // Remove Generic if adding specific platform
        const filtered = newPlatforms.filter((p) => p !== 'Generic' || newPlatforms.length === 1);

        updatedSession.explored = {
          ...updatedSession.explored,
          platforms: {
            topicId: 'platforms',
            resolution: {
              type: 'user_choice',
              value: filtered,
              rationale: `Modified via: "${modification.originalText}"`,
            },
            exploredAt: new Date().toISOString(),
          },
        };
        applied = true;
        message = `Added platform: ${modification.target}`;
      }
      break;
    }

    case 'remove_platform': {
      const currentPlatforms =
        (updatedSession.explored['platforms']?.resolution.value as string[]) || [];
      const filtered = currentPlatforms.filter(
        (p) => p.toLowerCase() !== modification.target.toLowerCase(),
      );

      if (filtered.length === 0) {
        filtered.push('Generic');
      }

      if (filtered.length !== currentPlatforms.length) {
        updatedSession.explored = {
          ...updatedSession.explored,
          platforms: {
            topicId: 'platforms',
            resolution: {
              type: 'user_choice',
              value: filtered,
              rationale: `Modified via: "${modification.originalText}"`,
            },
            exploredAt: new Date().toISOString(),
          },
        };
        applied = true;
        message = `Removed platform: ${modification.target}`;
      } else {
        message = `Platform "${modification.target}" not found`;
      }
      break;
    }

    case 'toggle_molecule': {
      const enable = modification.value !== false;
      updatedSession.explored = {
        ...updatedSession.explored,
        'molecule-testing': {
          topicId: 'molecule-testing',
          resolution: {
            type: 'user_choice',
            value: {
              enabled: enable,
              level: enable ? 'basic' : 'none',
              driver: 'docker',
            },
            rationale: `Modified via: "${modification.originalText}"`,
          },
          exploredAt: new Date().toISOString(),
        },
      };
      applied = true;
      message = enable ? 'Enabled molecule testing' : 'Disabled molecule testing';
      break;
    }

    case 'change_setting': {
      // Store in session for later processing
      message = `Setting change noted: ${modification.target} = ${modification.value}`;
      applied = true;
      break;
    }

    case 'custom': {
      message = `Custom modification noted: "${modification.originalText}"`;
      applied = true;
      break;
    }
  }

  // Add to modifications list
  const appliedMod = { ...modification, applied };
  updatedSession.modifications = [...updatedSession.modifications, appliedMod];
  updatedSession.updatedAt = new Date().toISOString();

  return { session: updatedSession, applied, message };
}

/**
 * Find a topic by name (fuzzy matching).
 */
function findTopicByName(topics: ExplorationTopic[], name: string): ExplorationTopic | undefined {
  const normalized = name.toLowerCase().replace(/\//g, '');

  // Normalize topic name for comparison
  const normalizeName = (n: string) => n.toLowerCase().replace(/\//g, '');

  // Exact match
  const exact = topics.find((t) => normalizeName(t.name) === normalized);
  if (exact) return exact;

  // Partial match
  const partial = topics.find((t) => {
    const topicNorm = normalizeName(t.name);
    return topicNorm.includes(normalized) || normalized.includes(topicNorm);
  });
  if (partial) return partial;

  // Check for SSL/TLS specific matching (ssl -> SSL/TLS, tls -> SSL/TLS)
  const sslMatch = /ssl|tls/.test(normalized);
  if (sslMatch) {
    const sslTopic = topics.find(
      (t) => t.name.toLowerCase().includes('ssl') || t.name.toLowerCase().includes('tls'),
    );
    if (sslTopic) return sslTopic;
  }

  // Check findings
  for (const topic of topics) {
    if (topic.findings?.some((f) => normalizeName(f.name).includes(normalized))) {
      return topic;
    }
  }

  return undefined;
}

/**
 * Apply multiple modifications to a session.
 */
export function applyModifications(
  session: ExplorationSession,
  modifications: Modification[],
): { session: ExplorationSession; results: Array<{ modification: Modification; applied: boolean; message: string }> } {
  let currentSession = session;
  const results: Array<{ modification: Modification; applied: boolean; message: string }> = [];

  for (const mod of modifications) {
    const result = applyModification(currentSession, mod);
    currentSession = result.session;
    results.push({
      modification: mod,
      applied: result.applied,
      message: result.message,
    });
  }

  return { session: currentSession, results };
}

/**
 * Format modification results for display.
 */
export function formatModificationResults(
  results: Array<{ modification: Modification; applied: boolean; message: string }>,
): string {
  const lines: string[] = [];

  for (const result of results) {
    const icon = result.applied ? '✓' : '✗';
    lines.push(`${icon} ${result.message}`);
  }

  return lines.join('\n');
}

/**
 * Suggest possible modifications based on context.
 */
export function suggestModifications(session: ExplorationSession): string[] {
  const suggestions: string[] = [];

  // Suggest adding unexplored interesting topics
  for (const topic of session.topics) {
    if (
      topic.isInteresting &&
      !session.explored[topic.id] &&
      !session.skipped.includes(topic.id)
    ) {
      suggestions.push(`add ${topic.name.toLowerCase()}`);
    }
  }

  // Suggest platform additions if Generic
  const platforms = session.explored['platforms']?.resolution.value;
  if (!platforms || (Array.isArray(platforms) && platforms.includes('Generic'))) {
    suggestions.push('add Ubuntu support', 'add RHEL support');
  }

  // Suggest molecule if not configured
  if (!session.explored['molecule-testing']) {
    suggestions.push('skip molecule tests');
  }

  return suggestions.slice(0, 5);
}
