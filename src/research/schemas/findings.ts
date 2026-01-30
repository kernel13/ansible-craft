/**
 * Research findings schema.
 *
 * Defines types and Zod schemas for research data collected
 * from Galaxy API, package repositories, and other sources.
 */

import { z } from 'zod';

// ============================================
// Feature
// ============================================

/**
 * Feature category classification.
 */
export const featureCategorySchema = z.enum(['essential', 'recommended', 'optional']);
export type FeatureCategory = z.infer<typeof featureCategorySchema>;

/**
 * Feature complexity level.
 */
export const featureComplexitySchema = z.enum(['simple', 'moderate', 'complex']);
export type FeatureComplexity = z.infer<typeof featureComplexitySchema>;

/**
 * Confidence level for research findings.
 */
export const confidenceLevelSchema = z.enum(['high', 'medium', 'low']);
export type ConfidenceLevel = z.infer<typeof confidenceLevelSchema>;

/**
 * Source information for a finding.
 */
export const findingSourceSchema = z.object({
  /** Source type */
  type: z.enum(['galaxy', 'docs', 'web', 'package_manager']),
  /** Source URL or identifier */
  url: z.string().optional(),
  /** Quality score (0-100) */
  quality: z.number().min(0).max(100).optional(),
});
export type FindingSource = z.infer<typeof findingSourceSchema>;

/**
 * Alternative implementation option.
 */
export const alternativeSchema = z.object({
  /** Alternative name */
  name: z.string(),
  /** Description */
  description: z.string(),
  /** Trade-offs compared to main option */
  tradeoffs: z.string().optional(),
});
export type Alternative = z.infer<typeof alternativeSchema>;

/**
 * Discovered feature with metadata.
 */
export const featureSchema = z.object({
  /** Feature name */
  name: z.string(),
  /** Description of what this feature provides */
  description: z.string(),
  /** Category classification */
  category: featureCategorySchema,
  /** Implementation complexity */
  complexity: featureComplexitySchema,
  /** Confidence in this finding */
  confidence: confidenceLevelSchema.optional(),
  /** Hint about why this is worth exploring */
  exploreHint: z.string().optional(),
  /** Sources that support this finding */
  sources: z.array(findingSourceSchema).optional(),
  /** Alternative implementations */
  alternatives: z.array(alternativeSchema).optional(),
});
export type Feature = z.infer<typeof featureSchema>;

// ============================================
// Package
// ============================================

/**
 * Package source (repository type).
 */
export const packageSourceSchema = z.enum(['apt', 'yum', 'dnf', 'choco', 'pip', 'npm', 'gem']);
export type PackageSource = z.infer<typeof packageSourceSchema>;

/**
 * Package quality indicators.
 */
export const packageQualitySchema = z.object({
  /** Whether this is an official package */
  official: z.boolean().optional(),
  /** Whether the package is well-maintained */
  wellMaintained: z.boolean().optional(),
  /** Whether the package has good documentation */
  documentedWell: z.boolean().optional(),
});
export type PackageQuality = z.infer<typeof packageQualitySchema>;

/**
 * Discovered package option.
 */
export const packageSchema = z.object({
  /** Package name */
  name: z.string(),
  /** Package source/repository */
  source: packageSourceSchema,
  /** Version (if available) */
  version: z.string().optional(),
  /** Package description */
  description: z.string().optional(),
  /** Whether this is the default/recommended option */
  isDefault: z.boolean(),
  /** Confidence in this finding */
  confidence: confidenceLevelSchema.optional(),
  /** Quality indicators */
  qualityIndicators: packageQualitySchema.optional(),
});
export type Package = z.infer<typeof packageSchema>;

// ============================================
// Best Practice
// ============================================

/**
 * Best practice priority level.
 */
export const practicePrioritySchema = z.enum(['critical', 'recommended', 'optional']);
export type PracticePriority = z.infer<typeof practicePrioritySchema>;

/**
 * Best practice recommendation.
 */
export const practiceSchema = z.object({
  /** Practice description */
  practice: z.string(),
  /** Rationale for this practice */
  rationale: z.string(),
  /** Priority level */
  priority: practicePrioritySchema,
});
export type Practice = z.infer<typeof practiceSchema>;

// ============================================
// Galaxy Role
// ============================================

/**
 * Reference Galaxy role with metrics.
 */
export const galaxyRoleSchema = z.object({
  /** Role namespace */
  namespace: z.string(),
  /** Role name */
  name: z.string(),
  /** Star count */
  stars: z.number().nonnegative(),
  /** Download count */
  downloads: z.number().nonnegative(),
  /** Key features extracted from role */
  keyFeatures: z.array(z.string()),
});
export type GalaxyRole = z.infer<typeof galaxyRoleSchema>;

// ============================================
// Research Findings
// ============================================

/**
 * Complete research findings from a researcher agent.
 */
export const researchFindingsSchema = z.object({
  /** Discovered features */
  features: z.array(featureSchema),
  /** Package options */
  packages: z.array(packageSchema),
  /** Best practices */
  bestPractices: z.array(practiceSchema),
  /** Reference Galaxy roles */
  galaxyRoles: z.array(galaxyRoleSchema),
});
export type ResearchFindings = z.infer<typeof researchFindingsSchema>;

// ============================================
// Research Source
// ============================================

/**
 * Source of research data.
 */
export const researchSourceSchema = z.enum([
  'galaxy_api',
  'package_search',
  'web_search',
  'mcp_context',
]);
export type ResearchSource = z.infer<typeof researchSourceSchema>;

// ============================================
// Helper Functions
// ============================================

/**
 * Create empty research findings.
 */
export function createEmptyFindings(): ResearchFindings {
  return {
    features: [],
    packages: [],
    bestPractices: [],
    galaxyRoles: [],
  };
}

/**
 * Merge multiple research findings into one.
 */
export function mergeFindings(...findings: ResearchFindings[]): ResearchFindings {
  const merged: ResearchFindings = createEmptyFindings();

  for (const finding of findings) {
    merged.features.push(...finding.features);
    merged.packages.push(...finding.packages);
    merged.bestPractices.push(...finding.bestPractices);
    merged.galaxyRoles.push(...finding.galaxyRoles);
  }

  // Deduplicate by name/namespace
  merged.features = deduplicateBy(merged.features, (f) => f.name);
  merged.packages = deduplicateBy(merged.packages, (p) => `${p.source}:${p.name}`);
  merged.bestPractices = deduplicateBy(merged.bestPractices, (p) => p.practice);
  merged.galaxyRoles = deduplicateBy(merged.galaxyRoles, (r) => `${r.namespace}.${r.name}`);

  return merged;
}

/**
 * Deduplicate array by key function.
 */
function deduplicateBy<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
