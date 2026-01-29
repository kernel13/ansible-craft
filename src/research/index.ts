/**
 * Research module public API.
 *
 * Provides research workflow functions, agents, and utilities for
 * gathering information before role generation.
 */

// Agents
export { DocsResearcherAgent } from './agents/docs-researcher.js';
export { ImplResearcherAgent } from './agents/impl-researcher.js';
export { DeepDiveResearcherAgent } from './agents/deepdive-researcher.js';

// Workflow
export { runInitialResearch, runDeepDive, runCompleteResearch } from './workflow.js';

// Schemas
export type {
  Feature,
  FeatureCategory,
  FeatureComplexity,
  Package,
  PackageSource,
  Practice,
  PracticePriority,
  GalaxyRole,
  ResearchFindings,
  ResearchSource,
} from './schemas/findings.js';
export { createEmptyFindings, mergeFindings } from './schemas/findings.js';

export type { ResearchSummary } from './schemas/summary.js';
export {
  createResearchSummary,
  getAllFeatures,
  getAllPackages,
  getAllBestPractices,
  getAllGalaxyRoles,
} from './schemas/summary.js';

// External integrations
export {
  searchGalaxyRoles,
  getPopularFeatures,
  isGalaxyAvailable,
} from './external/galaxy-client.js';
export {
  searchPackages,
  detectPackageManagers,
  type AvailablePackageManagers,
} from './external/package-search.js';

// Presenters
export { displayResearchSummary, displayCombinedFindings } from './presenters/cli-presenter.js';
export {
  formatFeature,
  formatPackage,
  formatPractice,
  formatGalaxyRole,
} from './presenters/format.js';
