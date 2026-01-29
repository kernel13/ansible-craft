/**
 * CLI research presenter.
 *
 * Displays research findings in a user-friendly format on the CLI.
 */

import chalk from 'chalk';
import type { ResearchFindings } from '../schemas/findings.js';
import { formatFeature, formatPackage, formatPractice, formatGalaxyRole } from './format.js';

/**
 * Display research findings summary to the console.
 *
 * Shows discovered features, packages, best practices, and Galaxy roles
 * in a formatted, readable layout.
 *
 * @param findings - Research findings to display
 *
 * @example
 * ```typescript
 * displayResearchSummary(findings);
 * // Outputs formatted research summary to console
 * ```
 */
export function displayResearchSummary(findings: ResearchFindings): void {
  console.log(chalk.cyan('\n=== Research Findings ===\n'));

  // Display discovered features
  if (findings.features.length > 0) {
    console.log(chalk.bold('Discovered Features:'));
    const essential = findings.features.filter((f) => f.category === 'essential');
    const recommended = findings.features.filter((f) => f.category === 'recommended');
    const optional = findings.features.filter((f) => f.category === 'optional');

    if (essential.length > 0) {
      for (const feature of essential.slice(0, 3)) {
        console.log(`  ${chalk.green(formatFeature(feature))} ${chalk.dim('(essential)')}`);
      }
    }

    if (recommended.length > 0) {
      for (const feature of recommended.slice(0, 3)) {
        console.log(`  ${chalk.yellow(formatFeature(feature))} ${chalk.dim('(recommended)')}`);
      }
    }

    if (optional.length > 0) {
      for (const feature of optional.slice(0, 2)) {
        console.log(`  ${chalk.dim(formatFeature(feature))} ${chalk.dim('(optional)')}`);
      }
    }

    console.log('');
  }

  // Display package options
  if (findings.packages.length > 0) {
    console.log(chalk.bold('Package Options:'));
    for (const pkg of findings.packages.slice(0, 3)) {
      const line = `  • ${formatPackage(pkg)}`;
      console.log(pkg.isDefault ? chalk.green(line) : chalk.dim(line));
      if (pkg.description) {
        console.log(chalk.dim(`    ${pkg.description}`));
      }
    }
    console.log('');
  }

  // Display best practices
  if (findings.bestPractices.length > 0) {
    console.log(chalk.bold('Best Practices:'));
    const critical = findings.bestPractices.filter((p) => p.priority === 'critical');
    const recommended = findings.bestPractices.filter((p) => p.priority === 'recommended');

    if (critical.length > 0) {
      for (const practice of critical.slice(0, 2)) {
        console.log(`  ${chalk.green(formatPractice(practice))}`);
        console.log(chalk.dim(`    ${practice.rationale}`));
      }
    }

    if (recommended.length > 0) {
      for (const practice of recommended.slice(0, 2)) {
        console.log(`  ${chalk.yellow(formatPractice(practice))}`);
        console.log(chalk.dim(`    ${practice.rationale}`));
      }
    }

    console.log('');
  }

  // Display Galaxy roles
  if (findings.galaxyRoles.length > 0) {
    console.log(chalk.bold('Reference Galaxy Roles:'));
    for (let i = 0; i < Math.min(3, findings.galaxyRoles.length); i++) {
      const role = findings.galaxyRoles[i];
      console.log(`  ${chalk.dim(formatGalaxyRole(role, i))}`);
      if (role.keyFeatures.length > 0) {
        console.log(chalk.dim(`    Features: ${role.keyFeatures.join(', ')}`));
      }
    }
    console.log('');
  }

  if (
    findings.features.length === 0 &&
    findings.packages.length === 0 &&
    findings.bestPractices.length === 0 &&
    findings.galaxyRoles.length === 0
  ) {
    console.log(chalk.yellow('No research findings available'));
    console.log('');
  } else {
    console.log(chalk.dim('Proceeding to role configuration...\n'));
  }
}

/**
 * Display combined findings from multiple research sources.
 *
 * Merges and displays findings from documentation and implementation research.
 *
 * @param docsFindings - Findings from documentation researcher
 * @param implFindings - Findings from implementation researcher
 *
 * @example
 * ```typescript
 * displayCombinedFindings(docsFindings, implFindings);
 * ```
 */
export function displayCombinedFindings(
  docsFindings: ResearchFindings,
  implFindings: ResearchFindings,
): void {
  // Merge findings
  const combined: ResearchFindings = {
    features: [...docsFindings.features, ...implFindings.features],
    packages: [...docsFindings.packages, ...implFindings.packages],
    bestPractices: [...docsFindings.bestPractices, ...implFindings.bestPractices],
    galaxyRoles: [...docsFindings.galaxyRoles, ...implFindings.galaxyRoles],
  };

  displayResearchSummary(combined);
}

/**
 * Format a list of features as a string.
 *
 * @param features - Features to format
 * @returns Formatted string
 */
export function formatFeatureList(features: ResearchFindings['features']): string {
  return features.map((f) => formatFeature(f)).join('\n');
}

/**
 * Format a list of packages as a string.
 *
 * @param packages - Packages to format
 * @returns Formatted string
 */
export function formatPackageList(packages: ResearchFindings['packages']): string {
  return packages.map((p) => formatPackage(p)).join('\n');
}
