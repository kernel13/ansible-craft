/**
 * Core type definitions for the agent system.
 *
 * Provides interfaces for agent communication, results, and configuration.
 */

import type { Config } from '../config/index.js';
import type { GeneratedFile } from '../generation/role/parser.js';
import type { PlanPreview } from '../generation/schemas/plan-preview.js';
import type { LintViolation } from '../generation/validation/ansible-lint.js';
import type { ValidationReport } from '../generation/validation/index.js';

// ============================================================
// Agent Error Types
// ============================================================

/**
 * Agent-specific error with context information.
 */
export interface AgentError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Agent that produced the error */
  agent: string;
  /** Original error if wrapped */
  cause?: Error;
  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Create an agent error with standard formatting.
 */
export function createAgentError(
  agent: string,
  code: string,
  message: string,
  options?: { cause?: Error; recoverable?: boolean },
): AgentError {
  return {
    code,
    message,
    agent,
    cause: options?.cause,
    recoverable: options?.recoverable ?? false,
  };
}

// ============================================================
// Agent Result Types
// ============================================================

/**
 * Base result type for all agents.
 * Provides consistent success/failure semantics.
 */
export interface AgentResult<T = unknown> {
  /** Whether the operation succeeded */
  success: boolean;
  /** Result data on success */
  data?: T;
  /** Errors encountered during execution */
  errors?: AgentError[];
  /** Non-blocking warnings */
  warnings?: string[];
  /** Execution duration in milliseconds */
  duration: number;
}

/**
 * Create a successful agent result.
 */
export function successResult<T>(data: T, duration: number, warnings?: string[]): AgentResult<T> {
  return {
    success: true,
    data,
    duration,
    warnings,
  };
}

/**
 * Create a failed agent result.
 */
export function failureResult<T = unknown>(
  errors: AgentError[],
  duration: number,
  warnings?: string[],
): AgentResult<T> {
  return {
    success: false,
    errors,
    duration,
    warnings,
  };
}

// ============================================================
// Agent Context
// ============================================================

/**
 * Read-only shared context available to all agents.
 * Provides configuration and environment information.
 */
export interface AgentContext {
  /** Application configuration */
  config: Config;
  /** Suppress output */
  quiet: boolean;
  /** Output in JSON format */
  jsonMode: boolean;
  /** Working directory */
  cwd: string;
}

// ============================================================
// Message Types
// ============================================================

/**
 * Message passed between agents via the message bus.
 */
export interface AgentMessage<T = unknown> {
  /** Message type identifier */
  type: string;
  /** Message payload */
  payload: T;
  /** Source agent name */
  source: string;
  /** Message timestamp */
  timestamp: number;
  /** Optional correlation ID for request/response tracking */
  correlationId?: string;
}

/**
 * Create an agent message with automatic timestamp.
 */
export function createMessage<T>(
  type: string,
  payload: T,
  source: string,
  correlationId?: string,
): AgentMessage<T> {
  return {
    type,
    payload,
    source,
    timestamp: Date.now(),
    correlationId,
  };
}

// ============================================================
// Agent Interface
// ============================================================

/**
 * Base interface for all agents.
 * Defines the contract that all agents must implement.
 */
export interface Agent<TInput, TOutput> {
  /** Agent name for identification and logging */
  readonly name: string;
  /** Agent description */
  readonly description: string;
  /** Execute the agent's primary function */
  execute(input: TInput, context: AgentContext): Promise<AgentResult<TOutput>>;
}

// ============================================================
// Validator Agent Types
// ============================================================

export interface ValidatorInput {
  files: GeneratedFile[];
}

export interface FileValidationResult {
  path: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidatorOutput {
  report: ValidationReport;
  perFileResults: Map<string, FileValidationResult>;
}

// ============================================================
// Writer Agent Types
// ============================================================

export interface WriterInput {
  files: GeneratedFile[];
  outputDir: string;
  name: string;
  type: 'role' | 'playbook';
  force: boolean;
  dryRun: boolean;
}

export interface WriterOutput {
  written: string[];
  skipped: string[];
  conflicts: string[];
  targetDir: string;
}

// ============================================================
// Linter Agent Types
// ============================================================

export interface LinterInput {
  files: GeneratedFile[];
  tempDir?: string;
}

export interface LinterOutput {
  violations: LintViolation[];
  available: boolean;
  exitCode: number;
}

// ============================================================
// Planner Agent Types
// ============================================================

export interface PlannerInput {
  description: string;
  type: 'role' | 'playbook';
  clarifications?: Record<string, string>;
  feedback?: string;
}

export interface PlannerOutput {
  plan: PlanPreview;
  suggestedClarifications?: string[];
}

// ============================================================
// Generator Agent Types
// ============================================================

export interface GeneratorInput {
  plan: PlanPreview;
  description: string;
  type: 'role' | 'playbook';
}

export interface GeneratorOutput {
  files: GeneratedFile[];
  tokensUsed: number;
}

// ============================================================
// Fixer Agent Types
// ============================================================

export interface FixerInput {
  files: GeneratedFile[];
  violations: LintViolation[];
  autoFix: boolean;
}

export interface FixerOutput {
  fixed: LintViolation[];
  unfixable: LintViolation[];
  modifiedFiles: GeneratedFile[];
}

// ============================================================
// Explainer Agent Types
// ============================================================

export interface ExplainerInput {
  path: string;
  playbookContext?: string;
  useComplex: boolean;
}

export interface ExplainerOutput {
  explanation: string;
  confidence: 'high' | 'low';
  suggestComplex: boolean;
}

// ============================================================
// Debugger Agent Types
// ============================================================

export interface DebuggerInput {
  errorMessage: string;
  playbookContext?: string;
  useComplex: boolean;
}

export interface DebuggerOutput {
  diagnosis: string;
  suggestedFix?: string;
  targetFile?: string;
  confidence: 'high' | 'low';
}

// ============================================================
// Researcher Agent Types
// ============================================================

export type ResearchDepth = 'quick' | 'standard' | 'deep';

export interface ResearcherInput {
  description: string;
  roleName: string;
  selectedFeatures?: string[];
  researchDepth: ResearchDepth;
}

export interface ResearcherOutput {
  findings: {
    features: Array<{
      name: string;
      description: string;
      category: 'essential' | 'recommended' | 'optional';
      complexity: 'simple' | 'moderate' | 'complex';
    }>;
    packages: Array<{
      name: string;
      source: string;
      version?: string;
      description?: string;
      isDefault: boolean;
    }>;
    bestPractices: Array<{
      practice: string;
      rationale: string;
      priority: 'critical' | 'recommended' | 'optional';
    }>;
    galaxyRoles: Array<{
      namespace: string;
      name: string;
      stars: number;
      downloads: number;
      keyFeatures: string[];
    }>;
  };
  confidence: 'high' | 'medium' | 'low';
  sourcesUsed: Array<'galaxy_api' | 'package_search' | 'web_search' | 'mcp_context'>;
  researchDuration: number;
}

// ============================================================
// Agent Configuration
// ============================================================

/**
 * Configuration for agent execution behavior.
 */
export interface AgentConfig {
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Maximum concurrent operations */
  maxConcurrency: number;
  /** Execution timeout in milliseconds */
  timeout: number;
  /** Number of retries on failure */
  retries: number;
  /** Override default model for AI agents */
  model?: string;
}

/**
 * Default agent configurations.
 */
export const DEFAULT_AGENT_CONFIGS: Record<string, AgentConfig> = {
  validator: {
    name: 'ansible-validator',
    description: 'Validate Ansible code quality',
    maxConcurrency: 5,
    timeout: 30000,
    retries: 0,
  },
  writer: {
    name: 'ansible-writer',
    description: 'Write generated files to disk',
    maxConcurrency: 10,
    timeout: 30000,
    retries: 1,
  },
  linter: {
    name: 'ansible-linter',
    description: 'Run ansible-lint validation',
    maxConcurrency: 1,
    timeout: 60000,
    retries: 0,
  },
  planner: {
    name: 'ansible-planner',
    description: 'Generate role/playbook plans',
    maxConcurrency: 1,
    timeout: 120000,
    retries: 3,
  },
  generator: {
    name: 'ansible-generator',
    description: 'Generate Ansible code from plans',
    maxConcurrency: 1,
    timeout: 180000,
    retries: 3,
  },
  fixer: {
    name: 'ansible-fixer',
    description: 'Auto-fix lint violations',
    maxConcurrency: 5,
    timeout: 30000,
    retries: 0,
  },
  explainer: {
    name: 'ansible-explainer',
    description: 'Explain Ansible code',
    maxConcurrency: 1,
    timeout: 120000,
    retries: 2,
  },
  debugger: {
    name: 'ansible-debugger',
    description: 'Diagnose and fix errors',
    maxConcurrency: 1,
    timeout: 120000,
    retries: 2,
  },
  'researcher-docs': {
    name: 'ansible-researcher-docs',
    description: 'Research documentation and best practices',
    maxConcurrency: 1,
    timeout: 30000,
    retries: 1,
  },
  'researcher-impl': {
    name: 'ansible-researcher-impl',
    description: 'Research implementation details and packages',
    maxConcurrency: 1,
    timeout: 30000,
    retries: 1,
  },
  'researcher-deepdive': {
    name: 'ansible-researcher-deepdive',
    description: 'Deep dive research on selected features',
    maxConcurrency: 1,
    timeout: 45000,
    retries: 1,
  },
};
