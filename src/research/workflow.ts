/**
 * Research workflow orchestration.
 *
 * Coordinates parallel research agents to gather findings before
 * role generation begins.
 */

import type { AgentContext } from '../core/types.js';
import { createOrchestrator } from '../core/orchestrator.js';
import { DocsResearcherAgent } from './agents/docs-researcher.js';
import { ImplResearcherAgent } from './agents/impl-researcher.js';
import { DeepDiveResearcherAgent } from './agents/deepdive-researcher.js';
import type { ResearchFindings } from './schemas/findings.js';
import { mergeFindings, createEmptyFindings } from './schemas/findings.js';

// ============================================
// Research Workflow Functions
// ============================================

/**
 * Run initial parallel research (documentation + implementation).
 *
 * @param description - Role description
 * @param roleName - Sanitized role name
 * @param context - Agent context
 * @returns Merged research findings from both agents
 *
 * @example
 * ```typescript
 * const findings = await runInitialResearch('nginx with SSL', 'nginx', context);
 * // Returns merged findings from docs and impl researchers
 * ```
 */
export async function runInitialResearch(
  description: string,
  roleName: string,
  context: AgentContext,
): Promise<ResearchFindings> {
  const orchestrator = createOrchestrator(context);

  // Register researcher agents
  const docsAgent = new DocsResearcherAgent();
  const implAgent = new ImplResearcherAgent();
  orchestrator.register(docsAgent);
  orchestrator.register(implAgent);

  // Execute in parallel
  const parallelResult = await orchestrator.parallel(
    [
      {
        name: docsAgent.name,
        input: {
          description,
          roleName,
          researchDepth: 'standard' as const,
        },
      },
      {
        name: implAgent.name,
        input: {
          description,
          roleName,
          researchDepth: 'standard' as const,
        },
      },
    ],
    { maxConcurrency: 2 },
  );

  // Extract findings from results
  const findings: ResearchFindings[] = [];

  for (const result of parallelResult.results) {
    if (result.success && result.data) {
      findings.push((result.data as { findings: ResearchFindings }).findings);
    }
  }

  // Merge findings from both researchers
  if (findings.length === 0) {
    return createEmptyFindings();
  }

  return mergeFindings(...findings);
}

/**
 * Run deep dive research on selected features.
 *
 * @param description - Role description
 * @param roleName - Sanitized role name
 * @param selectedFeatures - Features selected by user
 * @param context - Agent context
 * @returns Deep dive research findings
 *
 * @example
 * ```typescript
 * const findings = await runDeepDive(
 *   'nginx with SSL',
 *   'nginx',
 *   ['SSL/TLS support', 'Virtual hosts'],
 *   context
 * );
 * ```
 */
export async function runDeepDive(
  description: string,
  roleName: string,
  selectedFeatures: string[],
  context: AgentContext,
): Promise<ResearchFindings> {
  const orchestrator = createOrchestrator(context);

  // Register deep dive agent
  const deepDiveAgent = new DeepDiveResearcherAgent();
  orchestrator.register(deepDiveAgent);

  // Execute deep dive
  const result = await orchestrator.execute(deepDiveAgent.name, {
    description,
    roleName,
    selectedFeatures,
    researchDepth: 'deep' as const,
  });

  if (result.success && result.data) {
    return (result.data as { findings: ResearchFindings }).findings;
  }

  return createEmptyFindings();
}

/**
 * Run complete research workflow with optional deep dive.
 *
 * @param description - Role description
 * @param roleName - Sanitized role name
 * @param context - Agent context
 * @param options - Workflow options
 * @returns Complete research findings
 *
 * @example
 * ```typescript
 * const findings = await runCompleteResearch(
 *   'nginx with SSL',
 *   'nginx',
 *   context,
 *   { enableDeepDive: true, selectedFeatures: ['SSL/TLS support'] }
 * );
 * ```
 */
export async function runCompleteResearch(
  description: string,
  roleName: string,
  context: AgentContext,
  options?: {
    enableDeepDive?: boolean;
    selectedFeatures?: string[];
  },
): Promise<ResearchFindings> {
  // Step 1: Initial parallel research
  const initialFindings = await runInitialResearch(description, roleName, context);

  // Step 2: Optional deep dive
  if (options?.enableDeepDive && options.selectedFeatures && options.selectedFeatures.length > 0) {
    const deepDiveFindings = await runDeepDive(
      description,
      roleName,
      options.selectedFeatures,
      context,
    );
    return mergeFindings(initialFindings, deepDiveFindings);
  }

  return initialFindings;
}
