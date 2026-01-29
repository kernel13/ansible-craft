/**
 * Research summary schema.
 *
 * Aggregates findings from multiple researchers and tracks
 * user selections for integration into role generation.
 */

import { z } from 'zod';
import { type ResearchFindings, researchFindingsSchema } from './findings.js';

// ============================================
// Research Summary
// ============================================

/**
 * Aggregated research summary with user selections.
 *
 * Combines findings from documentation, implementation, and optional
 * deep dive researchers, along with user's feature/package selections.
 */
export const researchSummarySchema = z.object({
  /** Findings from documentation researcher */
  documentationFindings: researchFindingsSchema,
  /** Findings from implementation researcher */
  implementationFindings: researchFindingsSchema,
  /** Optional findings from deep dive researcher */
  deepdiveFindings: researchFindingsSchema.optional(),
  /** Features selected by user from research */
  selectedFeatures: z.array(z.string()),
  /** Packages selected by user from research */
  selectedPackages: z.array(z.string()),
  /** Best practices selected by user from research */
  selectedBestPractices: z.array(z.string()),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Create a research summary from multiple findings.
 */
export function createResearchSummary(
  documentationFindings: ResearchFindings,
  implementationFindings: ResearchFindings,
  options?: {
    deepdiveFindings?: ResearchFindings;
    selectedFeatures?: string[];
    selectedPackages?: string[];
    selectedBestPractices?: string[];
  },
): ResearchSummaryData {
  return {
    documentationFindings,
    implementationFindings,
    deepdiveFindings: options?.deepdiveFindings,
    selectedFeatures: options?.selectedFeatures ?? [],
    selectedPackages: options?.selectedPackages ?? [],
    selectedBestPractices: options?.selectedBestPractices ?? [],
  };
}

/**
 * Get all features from a research summary (merged from all sources).
 */
export function getAllFeatures(summary: ResearchSummaryData) {
  const features = [
    ...summary.documentationFindings.features,
    ...summary.implementationFindings.features,
  ];

  if (summary.deepdiveFindings) {
    features.push(...summary.deepdiveFindings.features);
  }

  return features;
}

/**
 * Get all packages from a research summary (merged from all sources).
 */
export function getAllPackages(summary: ResearchSummaryData) {
  const packages = [
    ...summary.documentationFindings.packages,
    ...summary.implementationFindings.packages,
  ];

  if (summary.deepdiveFindings) {
    packages.push(...summary.deepdiveFindings.packages);
  }

  return packages;
}

/**
 * Get all best practices from a research summary (merged from all sources).
 */
export function getAllBestPractices(summary: ResearchSummaryData) {
  const practices = [
    ...summary.documentationFindings.bestPractices,
    ...summary.implementationFindings.bestPractices,
  ];

  if (summary.deepdiveFindings) {
    practices.push(...summary.deepdiveFindings.bestPractices);
  }

  return practices;
}

/**
 * Get all Galaxy roles from a research summary (merged from all sources).
 */
export function getAllGalaxyRoles(summary: ResearchSummaryData) {
  const roles = [
    ...summary.documentationFindings.galaxyRoles,
    ...summary.implementationFindings.galaxyRoles,
  ];

  if (summary.deepdiveFindings) {
    roles.push(...summary.deepdiveFindings.galaxyRoles);
  }

  return roles;
}

// Export the type with a different name to avoid conflicts
export type ResearchSummaryData = z.infer<typeof researchSummarySchema>;

// Export a class wrapper for convenience
export class ResearchSummary {
  documentationFindings: ResearchFindings;
  implementationFindings: ResearchFindings;
  deepdiveFindings?: ResearchFindings;
  selectedFeatures: string[];
  selectedPackages: string[];
  selectedBestPractices: string[];

  constructor(
    documentationFindings: ResearchFindings,
    implementationFindings: ResearchFindings,
    deepdiveFindings?: ResearchFindings,
    selectedFeatures?: string[],
    selectedPackages?: string[],
    selectedBestPractices?: string[],
  ) {
    this.documentationFindings = documentationFindings;
    this.implementationFindings = implementationFindings;
    this.deepdiveFindings = deepdiveFindings;
    this.selectedFeatures = selectedFeatures ?? [];
    this.selectedPackages = selectedPackages ?? [];
    this.selectedBestPractices = selectedBestPractices ?? [];
  }

  getAllFeatures() {
    const features = [
      ...this.documentationFindings.features,
      ...this.implementationFindings.features,
    ];

    if (this.deepdiveFindings) {
      features.push(...this.deepdiveFindings.features);
    }

    // Deduplicate by name
    const uniqueFeatures = new Map();
    for (const feature of features) {
      if (!uniqueFeatures.has(feature.name)) {
        uniqueFeatures.set(feature.name, feature);
      }
    }

    return Array.from(uniqueFeatures.values());
  }

  getAllPackages() {
    const packages = [
      ...this.documentationFindings.packages,
      ...this.implementationFindings.packages,
    ];

    if (this.deepdiveFindings) {
      packages.push(...this.deepdiveFindings.packages);
    }

    // Deduplicate by name+source
    const uniquePackages = new Map();
    for (const pkg of packages) {
      const key = `${pkg.name}:${pkg.source}`;
      if (!uniquePackages.has(key)) {
        uniquePackages.set(key, pkg);
      }
    }

    return Array.from(uniquePackages.values());
  }

  getAllBestPractices() {
    const practices = [
      ...this.documentationFindings.bestPractices,
      ...this.implementationFindings.bestPractices,
    ];

    if (this.deepdiveFindings) {
      practices.push(...this.deepdiveFindings.bestPractices);
    }

    // Deduplicate by practice text
    const uniquePractices = new Map();
    for (const practice of practices) {
      if (!uniquePractices.has(practice.practice)) {
        uniquePractices.set(practice.practice, practice);
      }
    }

    return Array.from(uniquePractices.values());
  }

  getAllGalaxyRoles() {
    const roles = [
      ...this.documentationFindings.galaxyRoles,
      ...this.implementationFindings.galaxyRoles,
    ];

    if (this.deepdiveFindings) {
      roles.push(...this.deepdiveFindings.galaxyRoles);
    }

    // Deduplicate by namespace+name
    const uniqueRoles = new Map();
    for (const role of roles) {
      const key = `${role.namespace}:${role.name}`;
      if (!uniqueRoles.has(key)) {
        uniqueRoles.set(key, role);
      }
    }

    return Array.from(uniqueRoles.values());
  }
}
