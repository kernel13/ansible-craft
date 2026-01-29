/**
 * Documentation researcher agent.
 *
 * Searches for documentation, best practices, and reference Galaxy roles
 * to discover common features and patterns for role generation.
 */

import type { Agent, AgentContext, AgentResult } from '../../core/types.js';
import { successResult, failureResult, createAgentError } from '../../core/types.js';
import type { ResearcherInput, ResearcherOutput } from '../../core/types.js';
import { createEmptyFindings } from '../schemas/findings.js';
import { searchGalaxyRoles, getPopularFeatures } from '../external/galaxy-client.js';

/**
 * Documentation researcher agent.
 *
 * Focuses on:
 * - Documentation and best practices
 * - Galaxy roles (popular implementations)
 * - Common patterns and features
 */
export class DocsResearcherAgent implements Agent<ResearcherInput, ResearcherOutput> {
  readonly name = 'ansible-researcher-docs';
  readonly description = 'Research documentation and best practices from Galaxy roles';

  async execute(
    input: ResearcherInput,
    _context: AgentContext,
  ): Promise<AgentResult<ResearcherOutput>> {
    const startTime = Date.now();

    try {
      const findings = createEmptyFindings();
      const sourcesUsed: ResearcherOutput['sourcesUsed'] = [];

      // Extract search query from description and role name
      const searchQuery = extractSearchQuery(input.description, input.roleName);

      // 1. Search Galaxy for reference roles
      const galaxyRoles = await searchGalaxyRoles(searchQuery);
      if (galaxyRoles.length > 0) {
        findings.galaxyRoles = galaxyRoles;
        sourcesUsed.push('galaxy_api');
      }

      // 2. Get popular features from Galaxy roles
      const popularFeatures = await getPopularFeatures(searchQuery);
      if (popularFeatures.length > 0) {
        findings.features = popularFeatures.map((name, index) => ({
          name,
          description: `Feature commonly found in ${searchQuery} roles`,
          category:
            index < 2
              ? ('essential' as const)
              : index < 5
                ? ('recommended' as const)
                : ('optional' as const),
          complexity: 'moderate' as const,
        }));
      }

      // 3. Add common best practices based on role type
      findings.bestPractices = getCommonBestPractices(input.description);

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
            `Documentation research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
 * Extract search query from description and role name.
 */
function extractSearchQuery(description: string, roleName: string): string {
  // Common software/service keywords
  const keywords = [
    'nginx',
    'apache',
    'mysql',
    'postgresql',
    'redis',
    'docker',
    'kubernetes',
    'jenkins',
    'gitlab',
    'prometheus',
    'grafana',
    'elasticsearch',
    'mongodb',
    'tomcat',
    'nodejs',
    'python',
    'java',
    'php',
  ];

  const lowerDesc = description.toLowerCase();
  const lowerRole = roleName.toLowerCase();

  // Check if any keyword is in description or role name
  for (const keyword of keywords) {
    if (lowerDesc.includes(keyword) || lowerRole.includes(keyword)) {
      return keyword;
    }
  }

  // Fall back to role name or first word of description
  const firstWord = description.split(/\s+/)[0].toLowerCase();
  return roleName || firstWord;
}

/**
 * Get common best practices based on role description.
 */
function getCommonBestPractices(
  description: string,
): ResearcherOutput['findings']['bestPractices'] {
  const practices: ResearcherOutput['findings']['bestPractices'] = [
    {
      practice: 'Use fully qualified collection names (FQCN) for all modules',
      rationale: 'Ensures compatibility and avoids module name conflicts',
      priority: 'critical',
    },
    {
      practice: 'Implement idempotency checks with changed_when and failed_when',
      rationale: 'Enables safe re-runs and proper change tracking',
      priority: 'critical',
    },
    {
      practice: 'Use variables in defaults/ for user-configurable values',
      rationale: 'Allows role customization without modifying code',
      priority: 'recommended',
    },
    {
      practice: 'Add handlers for service management (restart, reload)',
      rationale: 'Enables proper service lifecycle management',
      priority: 'recommended',
    },
  ];

  // Add service-specific practices
  const lowerDesc = description.toLowerCase();

  if (
    lowerDesc.includes('web') ||
    lowerDesc.includes('http') ||
    lowerDesc.includes('nginx') ||
    lowerDesc.includes('apache')
  ) {
    practices.push({
      practice: "Configure SSL/TLS with Let's Encrypt or custom certificates",
      rationale: 'Ensures secure HTTPS connections',
      priority: 'recommended',
    });
  }

  if (
    lowerDesc.includes('database') ||
    lowerDesc.includes('mysql') ||
    lowerDesc.includes('postgres')
  ) {
    practices.push({
      practice: 'Secure database with strong passwords and restricted access',
      rationale: 'Prevents unauthorized data access',
      priority: 'critical',
    });
  }

  if (lowerDesc.includes('container') || lowerDesc.includes('docker')) {
    practices.push({
      practice: 'Use specific image tags instead of latest',
      rationale: 'Ensures reproducible deployments',
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
  const hasGalaxyRoles = findings.galaxyRoles.length > 0;
  const hasFeatures = findings.features.length > 0;
  const hasPractices = findings.bestPractices.length > 0;
  const sourceCount = sourcesUsed.length;

  if (hasGalaxyRoles && hasFeatures && hasPractices && sourceCount > 0) {
    return 'high';
  }

  if (hasPractices || hasFeatures) {
    return 'medium';
  }

  return 'low';
}
