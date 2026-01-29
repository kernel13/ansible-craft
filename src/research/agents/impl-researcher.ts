/**
 * Implementation researcher agent.
 *
 * Searches package repositories to discover installation options
 * and implementation patterns for role generation.
 */

import type { Agent, AgentContext, AgentResult } from '../../core/types.js';
import { successResult, failureResult, createAgentError } from '../../core/types.js';
import type { ResearcherInput, ResearcherOutput } from '../../core/types.js';
import { createEmptyFindings } from '../schemas/findings.js';
import { searchPackages } from '../external/package-search.js';

/**
 * Implementation researcher agent.
 *
 * Focuses on:
 * - Package options from repositories (apt, yum, choco)
 * - Implementation patterns
 * - Installation methods
 */
export class ImplResearcherAgent implements Agent<ResearcherInput, ResearcherOutput> {
  readonly name = 'ansible-researcher-impl';
  readonly description = 'Research implementation details and package options';

  async execute(
    input: ResearcherInput,
    _context: AgentContext,
  ): Promise<AgentResult<ResearcherOutput>> {
    const startTime = Date.now();

    try {
      const findings = createEmptyFindings();
      const sourcesUsed: ResearcherOutput['sourcesUsed'] = [];

      // Extract package name from description and role name
      const packageQuery = extractPackageName(input.description, input.roleName);

      // 1. Search package repositories
      const packages = await searchPackages(packageQuery);
      if (packages.length > 0) {
        findings.packages = packages.map((pkg) => ({
          name: pkg.name,
          source: pkg.source,
          version: pkg.version,
          description: pkg.description,
          isDefault: pkg.isDefault,
        }));
        sourcesUsed.push('package_search');
      }

      // 2. Infer features from package availability
      if (packages.length > 0) {
        findings.features = inferFeaturesFromPackages(packages, input.description);
      }

      // 3. Add implementation-specific best practices
      findings.bestPractices = getImplementationBestPractices(
        input.description,
        packages.length > 0,
      );

      // Determine confidence based on findings
      const confidence = determineConfidence(findings, sourcesUsed);

      const output: ResearcherOutput = {
        findings,
        confidence,
        sourcesUsed,
        researchDuration: Date.now() - startTime,
      };

      return successResult(output, Date.now() - startTime);
    } catch (error) {
      return failureResult(
        [
          createAgentError(
            this.name,
            'RESEARCH_ERROR',
            `Implementation research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { cause: error instanceof Error ? error : undefined, recoverable: true },
          ),
        ],
        Date.now() - startTime,
      );
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Extract package name from description and role name.
 */
function extractPackageName(description: string, roleName: string): string {
  // Common package name patterns
  const packagePatterns = [
    /install\s+(\w+)/i,
    /configure\s+(\w+)/i,
    /setup\s+(\w+)/i,
    /deploy\s+(\w+)/i,
  ];

  for (const pattern of packagePatterns) {
    const match = pattern.exec(description);
    if (match) {
      return match[1].toLowerCase();
    }
  }

  // Common software names
  const softwareNames = [
    'nginx',
    'apache',
    'httpd',
    'mysql',
    'postgresql',
    'postgres',
    'redis',
    'docker',
    'git',
    'nodejs',
    'node',
    'python',
    'php',
    'java',
    'openjdk',
  ];

  const lowerDesc = description.toLowerCase();
  for (const name of softwareNames) {
    if (lowerDesc.includes(name)) {
      return name;
    }
  }

  // Fall back to role name or first word
  const firstWord = description.split(/\s+/)[0].toLowerCase();
  return roleName || firstWord;
}

/**
 * Infer features based on available packages.
 */
function inferFeaturesFromPackages(
  packages: Array<{ name: string; description?: string }>,
  description: string,
): ResearcherOutput['findings']['features'] {
  const features: ResearcherOutput['findings']['features'] = [];

  // Check for SSL/TLS packages
  const hasSslPackage = packages.some(
    (pkg) =>
      pkg.name.includes('ssl') ||
      pkg.name.includes('tls') ||
      pkg.description?.toLowerCase().includes('ssl'),
  );

  if (hasSslPackage || description.toLowerCase().includes('ssl')) {
    features.push({
      name: 'SSL/TLS support',
      description: 'Configure secure connections with SSL/TLS certificates',
      category: 'recommended',
      complexity: 'moderate',
    });
  }

  // Package manager installation
  features.push({
    name: 'Package manager installation',
    description: `Install via system package manager (${packages[0]?.source || 'apt/yum'})`,
    category: 'essential',
    complexity: 'simple',
  });

  // Service management (if it's a daemon/service)
  const lowerDesc = description.toLowerCase();
  if (
    lowerDesc.includes('service') ||
    lowerDesc.includes('server') ||
    lowerDesc.includes('daemon')
  ) {
    features.push({
      name: 'Service management',
      description: 'Manage service lifecycle (start, stop, restart, enable)',
      category: 'essential',
      complexity: 'simple',
    });
  }

  // Configuration management
  features.push({
    name: 'Configuration management',
    description: 'Manage configuration files with templates',
    category: 'recommended',
    complexity: 'moderate',
  });

  return features;
}

/**
 * Get implementation-specific best practices.
 */
function getImplementationBestPractices(
  description: string,
  hasPackages: boolean,
): ResearcherOutput['findings']['bestPractices'] {
  const practices: ResearcherOutput['findings']['bestPractices'] = [];

  if (hasPackages) {
    practices.push({
      practice: 'Use package manager for installation instead of compiling from source',
      rationale: 'Ensures consistent versioning and easier updates',
      priority: 'recommended',
    });

    practices.push({
      practice: 'Pin package versions for reproducible deployments',
      rationale: 'Prevents unexpected updates breaking functionality',
      priority: 'recommended',
    });
  }

  const lowerDesc = description.toLowerCase();

  if (lowerDesc.includes('config') || lowerDesc.includes('configure')) {
    practices.push({
      practice: 'Use Jinja2 templates for configuration files',
      rationale: 'Enables dynamic configuration based on variables',
      priority: 'recommended',
    });

    practices.push({
      practice: 'Validate configuration before applying changes',
      rationale: 'Prevents service failures from invalid configurations',
      priority: 'recommended',
    });
  }

  if (lowerDesc.includes('service') || lowerDesc.includes('daemon')) {
    practices.push({
      practice: 'Use systemd for service management on modern systems',
      rationale: 'Provides reliable service lifecycle control',
      priority: 'recommended',
    });
  }

  return practices;
}

/**
 * Determine confidence level based on research findings.
 */
function determineConfidence(
  findings: ResearcherOutput['findings'],
  sourcesUsed: ResearcherOutput['sourcesUsed'],
): 'high' | 'medium' | 'low' {
  const hasPackages = findings.packages.length > 0;
  const hasFeatures = findings.features.length > 0;
  const hasPractices = findings.bestPractices.length > 0;
  const sourceCount = sourcesUsed.length;

  if (hasPackages && hasFeatures && hasPractices && sourceCount > 0) {
    return 'high';
  }

  if (hasPractices || hasFeatures) {
    return 'medium';
  }

  return 'low';
}
