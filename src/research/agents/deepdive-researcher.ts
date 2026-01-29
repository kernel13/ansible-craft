/**
 * Deep dive researcher agent.
 *
 * Performs detailed research on user-selected features to provide
 * specific implementation guidance and advanced patterns.
 */

import type { Agent, AgentContext, AgentResult } from '../../core/types.js';
import { successResult, failureResult, createAgentError } from '../../core/types.js';
import type { ResearcherInput, ResearcherOutput } from '../../core/types.js';
import { createEmptyFindings } from '../schemas/findings.js';

/**
 * Deep dive researcher agent.
 *
 * Focuses on:
 * - Detailed implementation guidance for selected features
 * - Advanced configuration patterns
 * - Feature-specific best practices
 */
export class DeepDiveResearcherAgent implements Agent<ResearcherInput, ResearcherOutput> {
  readonly name = 'ansible-researcher-deepdive';
  readonly description = 'Deep dive research on selected features';

  async execute(
    input: ResearcherInput,
    _context: AgentContext,
  ): Promise<AgentResult<ResearcherOutput>> {
    const startTime = Date.now();

    try {
      const findings = createEmptyFindings();
      const sourcesUsed: ResearcherOutput['sourcesUsed'] = [];

      // Require selected features for deep dive
      if (!input.selectedFeatures || input.selectedFeatures.length === 0) {
        return failureResult(
          [
            createAgentError(
              this.name,
              'NO_FEATURES',
              'Deep dive research requires selected features',
              { recoverable: true },
            ),
          ],
          Date.now() - startTime,
        );
      }

      // Perform deep dive on each selected feature
      for (const feature of input.selectedFeatures) {
        const featureDetails = analyzeFeature(feature, input.description);
        findings.features.push(...featureDetails.features);
        findings.bestPractices.push(...featureDetails.bestPractices);
      }

      // Determine confidence based on findings
      const confidence =
        findings.features.length > 0 && findings.bestPractices.length > 0 ? 'high' : 'medium';

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
            `Deep dive research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
 * Analyze a feature in depth and return detailed findings.
 */
function analyzeFeature(
  feature: string,
  description: string,
): {
  features: ResearcherOutput['findings']['features'];
  bestPractices: ResearcherOutput['findings']['bestPractices'];
} {
  const features: ResearcherOutput['findings']['features'] = [];
  const bestPractices: ResearcherOutput['findings']['bestPractices'] = [];

  const lowerFeature = feature.toLowerCase();

  // SSL/TLS deep dive
  if (lowerFeature.includes('ssl') || lowerFeature.includes('tls')) {
    features.push(
      {
        name: 'Self-signed certificates',
        description: 'Generate self-signed SSL certificates for testing',
        category: 'optional',
        complexity: 'simple',
      },
      {
        name: "Let's Encrypt integration",
        description: 'Automatically provision certificates with certbot',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'Custom certificate deployment',
        description: 'Deploy custom SSL certificates from vault or files',
        category: 'recommended',
        complexity: 'moderate',
      },
    );

    bestPractices.push(
      {
        practice: 'Use strong cipher suites and disable weak protocols (TLS 1.0/1.1)',
        rationale: 'Prevents security vulnerabilities',
        priority: 'critical',
      },
      {
        practice: 'Implement automatic certificate renewal',
        rationale: 'Prevents service disruption from expired certificates',
        priority: 'recommended',
      },
      {
        practice: 'Store certificates securely with proper permissions (600)',
        rationale: 'Protects private keys from unauthorized access',
        priority: 'critical',
      },
    );
  }

  // Virtual hosts/vhosts deep dive
  if (lowerFeature.includes('virtual') || lowerFeature.includes('vhost')) {
    features.push(
      {
        name: 'Multiple domain support',
        description: 'Configure multiple domains on a single server',
        category: 'essential',
        complexity: 'moderate',
      },
      {
        name: 'Name-based virtual hosting',
        description: 'Route requests based on Host header',
        category: 'recommended',
        complexity: 'simple',
      },
      {
        name: 'Per-vhost SSL certificates',
        description: 'Individual SSL certificates for each virtual host',
        category: 'recommended',
        complexity: 'complex',
      },
    );

    bestPractices.push(
      {
        practice: 'Use separate configuration files for each virtual host',
        rationale: 'Improves maintainability and enables/disables per-site',
        priority: 'recommended',
      },
      {
        practice: 'Define default catch-all virtual host',
        rationale: 'Handles requests to unknown domains gracefully',
        priority: 'recommended',
      },
    );
  }

  // Caching deep dive
  if (lowerFeature.includes('cache') || lowerFeature.includes('caching')) {
    features.push(
      {
        name: 'Static file caching',
        description: 'Cache static assets (images, CSS, JS) in memory or disk',
        category: 'recommended',
        complexity: 'simple',
      },
      {
        name: 'Proxy caching',
        description: 'Cache upstream responses to reduce backend load',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'Cache purging API',
        description: 'Programmatically invalidate cached content',
        category: 'optional',
        complexity: 'complex',
      },
    );

    bestPractices.push(
      {
        practice: 'Set appropriate cache TTLs based on content type',
        rationale: 'Balances performance with freshness requirements',
        priority: 'recommended',
      },
      {
        practice: 'Use cache keys that include relevant request parameters',
        rationale: 'Prevents serving incorrect cached responses',
        priority: 'critical',
      },
    );
  }

  // Rate limiting deep dive
  if (lowerFeature.includes('rate') || lowerFeature.includes('limit')) {
    features.push(
      {
        name: 'IP-based rate limiting',
        description: 'Limit requests per IP address',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'User/token-based rate limiting',
        description: 'Limit requests per authenticated user or API token',
        category: 'optional',
        complexity: 'complex',
      },
      {
        name: 'Burst handling',
        description: 'Allow temporary burst of requests above the limit',
        category: 'optional',
        complexity: 'moderate',
      },
    );

    bestPractices.push(
      {
        practice: 'Use sliding window algorithm for accurate rate limiting',
        rationale: 'Prevents circumventing limits by timing requests',
        priority: 'recommended',
      },
      {
        practice: 'Return appropriate HTTP 429 responses with Retry-After header',
        rationale: 'Helps clients implement proper backoff',
        priority: 'recommended',
      },
    );
  }

  // Service management deep dive
  if (lowerFeature.includes('service')) {
    features.push(
      {
        name: 'Systemd unit configuration',
        description: 'Configure systemd service with dependencies and limits',
        category: 'essential',
        complexity: 'moderate',
      },
      {
        name: 'Service health checks',
        description: 'Monitor service health and auto-restart on failure',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'Graceful shutdown',
        description: 'Ensure clean shutdown with connection draining',
        category: 'recommended',
        complexity: 'moderate',
      },
    );

    bestPractices.push(
      {
        practice: 'Use systemd dependencies (After, Requires) to ensure correct startup order',
        rationale: 'Prevents service failures from missing dependencies',
        priority: 'critical',
      },
      {
        practice: 'Configure resource limits (memory, file descriptors) in systemd unit',
        rationale: 'Prevents resource exhaustion affecting the system',
        priority: 'recommended',
      },
    );
  }

  return { features, bestPractices };
}
