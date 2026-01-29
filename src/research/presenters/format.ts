/**
 * Research formatting utilities.
 *
 * Provides formatting helpers for displaying research findings.
 */

import type { Feature, Package, Practice, GalaxyRole } from '../schemas/findings.js';

/**
 * Format a feature with category and complexity indicators.
 */
export function formatFeature(feature: Feature): string {
  const category = getCategorySymbol(feature.category);
  const complexity = feature.complexity === 'simple' ? '' : ` [${feature.complexity}]`;
  return `${category} ${feature.name}${complexity}`;
}

/**
 * Format a package with source indicator.
 */
export function formatPackage(pkg: Package): string {
  const defaultTag = pkg.isDefault ? ' [default]' : '';
  const version = pkg.version ? ` (${pkg.version})` : '';
  return `${pkg.name} (${pkg.source})${version}${defaultTag}`;
}

/**
 * Format a best practice with priority indicator.
 */
export function formatPractice(practice: Practice): string {
  const priority = getPrioritySymbol(practice.priority);
  return `${priority} ${practice.practice}`;
}

/**
 * Format a Galaxy role with metrics.
 */
export function formatGalaxyRole(role: GalaxyRole, index: number): string {
  const stars = formatNumber(role.stars);
  const downloads = formatNumber(role.downloads);
  return `${index + 1}. ${role.namespace}.${role.name} (⭐ ${stars}, ${downloads} downloads)`;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get symbol for feature category.
 */
function getCategorySymbol(category: Feature['category']): string {
  switch (category) {
    case 'essential':
      return '✓';
    case 'recommended':
      return '✓';
    case 'optional':
      return '•';
  }
}

/**
 * Get symbol for practice priority.
 */
function getPrioritySymbol(priority: Practice['priority']): string {
  switch (priority) {
    case 'critical':
      return '✓';
    case 'recommended':
      return '✓';
    case 'optional':
      return '•';
  }
}

/**
 * Format number with K/M suffix.
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}k`;
  }
  return num.toString();
}
