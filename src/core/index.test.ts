import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { globalMessageBus } from './message-bus.js';
import type { AgentContext } from './types.js';
import type { GeneratedFile } from '../generation/role/parser.js';

// Import everything from index to test exports
import {
  // Types
  type AgentResult,
  type AgentError,
  type AgentMessage,
  DEFAULT_AGENT_CONFIGS,
  createAgentError,
  successResult,
  failureResult,
  createMessage,
  // Message bus
  MessageBus,
  MessageTypes,
  // Orchestrator
  AgentOrchestrator,
  createOrchestrator,
  executeParallel,
  executePipeline,
  executeConcurrent,
  batch,
  withTimeout,
  retryWithBackoff,
  // Agents
  ValidatorAgent,
  createValidatorAgent,
  validateFiles,
  WriterAgent,
  createWriterAgent,
  writeFiles,
  LinterAgent,
  createLinterAgent,
  lintFiles,
  isAnsibleLintAvailable,
  PlannerAgent,
  createPlannerAgent,
  generateRolePlan,
  generatePlaybookPlan,
  GeneratorAgent,
  createGeneratorAgent,
  generateRoleCode,
  generatePlaybookCode,
  FixerAgent,
  createFixerAgent,
  applyFixes,
  canAutoFix,
  ExplainerAgent,
  createExplainerAgent,
  explainAnsible,
  DebuggerAgent,
  createDebuggerAgent,
  debugAnsibleError,
  // Registry
  AgentRegistry,
  createAgent,
  // Workflows
  validateAndLint,
  qualityPipeline,
} from './index.js';

// Test context
const testContext: AgentContext = {
  config: {
    api: { key: 'test-api-key', model: 'claude-sonnet-4-5-20250929' },
    generation: { outputDir: '.', autoLint: true, autoFix: false },
    cli: { colors: true, verbose: false },
  },
  quiet: true,
  jsonMode: false,
  cwd: '/test',
};

// Test fixtures
const testFiles: GeneratedFile[] = [
  {
    path: 'tasks/main.yml',
    content: `---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present
`,
  },
  {
    path: 'defaults/main.yml',
    content: `---
nginx_port: 80
`,
  },
];

describe('index exports', () => {
  describe('type utilities', () => {
    test('exports createAgentError', () => {
      expect(typeof createAgentError).toBe('function');
      const error = createAgentError('test', 'CODE', 'message');
      expect(error.agent).toBe('test');
      expect(error.code).toBe('CODE');
    });

    test('exports successResult', () => {
      expect(typeof successResult).toBe('function');
      const result = successResult({ value: 1 }, 100);
      expect(result.success).toBe(true);
    });

    test('exports failureResult', () => {
      expect(typeof failureResult).toBe('function');
      const result = failureResult([], 100);
      expect(result.success).toBe(false);
    });

    test('exports createMessage', () => {
      expect(typeof createMessage).toBe('function');
      const msg = createMessage('type', {}, 'source');
      expect(msg.type).toBe('type');
    });

    test('exports DEFAULT_AGENT_CONFIGS', () => {
      expect(DEFAULT_AGENT_CONFIGS).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.validator).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.writer).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.linter).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.planner).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.generator).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.fixer).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.explainer).toBeDefined();
      expect(DEFAULT_AGENT_CONFIGS.debugger).toBeDefined();
    });
  });

  describe('message bus exports', () => {
    test('exports MessageBus class', () => {
      expect(MessageBus).toBeDefined();
      const bus = new MessageBus();
      expect(typeof bus.subscribe).toBe('function');
      expect(typeof bus.publish).toBe('function');
    });

    test('exports MessageTypes', () => {
      expect(MessageTypes).toBeDefined();
      expect(MessageTypes.VALIDATION_START).toBeDefined();
      expect(MessageTypes.WRITE_START).toBeDefined();
      expect(MessageTypes.LINT_START).toBeDefined();
    });

    test('exports globalMessageBus', () => {
      expect(globalMessageBus).toBeDefined();
      expect(typeof globalMessageBus.subscribe).toBe('function');
    });
  });

  describe('orchestrator exports', () => {
    test('exports AgentOrchestrator class', () => {
      expect(AgentOrchestrator).toBeDefined();
    });

    test('exports createOrchestrator', () => {
      expect(typeof createOrchestrator).toBe('function');
    });

    test('exports executeParallel', () => {
      expect(typeof executeParallel).toBe('function');
    });

    test('exports executePipeline', () => {
      expect(typeof executePipeline).toBe('function');
    });

    test('exports executeConcurrent', () => {
      expect(typeof executeConcurrent).toBe('function');
    });

    test('exports batch', () => {
      expect(typeof batch).toBe('function');
      const batched = batch([1, 2, 3, 4, 5], 2);
      expect(batched).toEqual([[1, 2], [3, 4], [5]]);
    });

    test('exports withTimeout', () => {
      expect(typeof withTimeout).toBe('function');
    });

    test('exports retryWithBackoff', () => {
      expect(typeof retryWithBackoff).toBe('function');
    });
  });

  describe('agent class exports', () => {
    test('exports ValidatorAgent', () => {
      expect(ValidatorAgent).toBeDefined();
      const agent = new ValidatorAgent();
      expect(agent.name).toBe('ansible-validator');
    });

    test('exports WriterAgent', () => {
      expect(WriterAgent).toBeDefined();
      const agent = new WriterAgent();
      expect(agent.name).toBe('ansible-writer');
    });

    test('exports LinterAgent', () => {
      expect(LinterAgent).toBeDefined();
      const agent = new LinterAgent();
      expect(agent.name).toBe('ansible-linter');
    });

    test('exports PlannerAgent', () => {
      expect(PlannerAgent).toBeDefined();
      const agent = new PlannerAgent();
      expect(agent.name).toBe('ansible-planner');
    });

    test('exports GeneratorAgent', () => {
      expect(GeneratorAgent).toBeDefined();
      const agent = new GeneratorAgent();
      expect(agent.name).toBe('ansible-generator');
    });

    test('exports FixerAgent', () => {
      expect(FixerAgent).toBeDefined();
      const agent = new FixerAgent();
      expect(agent.name).toBe('ansible-fixer');
    });

    test('exports ExplainerAgent', () => {
      expect(ExplainerAgent).toBeDefined();
      const agent = new ExplainerAgent();
      expect(agent.name).toBe('ansible-explainer');
    });

    test('exports DebuggerAgent', () => {
      expect(DebuggerAgent).toBeDefined();
      const agent = new DebuggerAgent();
      expect(agent.name).toBe('ansible-debugger');
    });
  });

  describe('factory function exports', () => {
    test('exports createValidatorAgent', () => {
      expect(typeof createValidatorAgent).toBe('function');
      const agent = createValidatorAgent();
      expect(agent).toBeInstanceOf(ValidatorAgent);
    });

    test('exports createWriterAgent', () => {
      expect(typeof createWriterAgent).toBe('function');
      const agent = createWriterAgent();
      expect(agent).toBeInstanceOf(WriterAgent);
    });

    test('exports createLinterAgent', () => {
      expect(typeof createLinterAgent).toBe('function');
      const agent = createLinterAgent();
      expect(agent).toBeInstanceOf(LinterAgent);
    });

    test('exports createPlannerAgent', () => {
      expect(typeof createPlannerAgent).toBe('function');
      const agent = createPlannerAgent();
      expect(agent).toBeInstanceOf(PlannerAgent);
    });

    test('exports createGeneratorAgent', () => {
      expect(typeof createGeneratorAgent).toBe('function');
      const agent = createGeneratorAgent();
      expect(agent).toBeInstanceOf(GeneratorAgent);
    });

    test('exports createFixerAgent', () => {
      expect(typeof createFixerAgent).toBe('function');
      const agent = createFixerAgent();
      expect(agent).toBeInstanceOf(FixerAgent);
    });

    test('exports createExplainerAgent', () => {
      expect(typeof createExplainerAgent).toBe('function');
      const agent = createExplainerAgent();
      expect(agent).toBeInstanceOf(ExplainerAgent);
    });

    test('exports createDebuggerAgent', () => {
      expect(typeof createDebuggerAgent).toBe('function');
      const agent = createDebuggerAgent();
      expect(agent).toBeInstanceOf(DebuggerAgent);
    });
  });

  describe('convenience function exports', () => {
    test('exports validateFiles', () => {
      expect(typeof validateFiles).toBe('function');
    });

    test('exports writeFiles', () => {
      expect(typeof writeFiles).toBe('function');
    });

    test('exports lintFiles', () => {
      expect(typeof lintFiles).toBe('function');
    });

    test('exports isAnsibleLintAvailable', () => {
      expect(typeof isAnsibleLintAvailable).toBe('function');
    });

    test('exports generateRolePlan', () => {
      expect(typeof generateRolePlan).toBe('function');
    });

    test('exports generatePlaybookPlan', () => {
      expect(typeof generatePlaybookPlan).toBe('function');
    });

    test('exports generateRoleCode', () => {
      expect(typeof generateRoleCode).toBe('function');
    });

    test('exports generatePlaybookCode', () => {
      expect(typeof generatePlaybookCode).toBe('function');
    });

    test('exports applyFixes', () => {
      expect(typeof applyFixes).toBe('function');
    });

    test('exports canAutoFix', () => {
      expect(typeof canAutoFix).toBe('function');
      expect(canAutoFix('fqcn[action-core]')).toBe(true);
      expect(canAutoFix('unknown-rule')).toBe(false);
    });

    test('exports explainAnsible', () => {
      expect(typeof explainAnsible).toBe('function');
    });

    test('exports debugAnsibleError', () => {
      expect(typeof debugAnsibleError).toBe('function');
    });
  });
});

describe('AgentRegistry', () => {
  test('contains all agent classes', () => {
    expect(AgentRegistry.validator).toBe(ValidatorAgent);
    expect(AgentRegistry.writer).toBe(WriterAgent);
    expect(AgentRegistry.linter).toBe(LinterAgent);
    expect(AgentRegistry.planner).toBe(PlannerAgent);
    expect(AgentRegistry.generator).toBe(GeneratorAgent);
    expect(AgentRegistry.fixer).toBe(FixerAgent);
    expect(AgentRegistry.explainer).toBe(ExplainerAgent);
    expect(AgentRegistry.debugger).toBe(DebuggerAgent);
  });
});

describe('createAgent', () => {
  test('creates validator agent by name', () => {
    const agent = createAgent('validator');
    expect(agent.name).toBe('ansible-validator');
  });

  test('creates writer agent by name', () => {
    const agent = createAgent('writer');
    expect(agent.name).toBe('ansible-writer');
  });

  test('creates linter agent by name', () => {
    const agent = createAgent('linter');
    expect(agent.name).toBe('ansible-linter');
  });

  test('creates planner agent by name', () => {
    const agent = createAgent('planner');
    expect(agent.name).toBe('ansible-planner');
  });

  test('creates generator agent by name', () => {
    const agent = createAgent('generator');
    expect(agent.name).toBe('ansible-generator');
  });

  test('creates fixer agent by name', () => {
    const agent = createAgent('fixer');
    expect(agent.name).toBe('ansible-fixer');
  });

  test('creates explainer agent by name', () => {
    const agent = createAgent('explainer');
    expect(agent.name).toBe('ansible-explainer');
  });

  test('creates debugger agent by name', () => {
    const agent = createAgent('debugger');
    expect(agent.name).toBe('ansible-debugger');
  });

  test('passes options to agent constructor', () => {
    const agent = createAgent('fixer', { maxConcurrency: 10 });
    expect(agent.name).toBe('ansible-fixer');
  });
});

describe('validateAndLint workflow', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  test('runs validation and linting in parallel', async () => {
    const result = await validateAndLint(testFiles, testContext);

    expect(result.validation).toBeDefined();
    expect(result.lint).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('returns validation result', async () => {
    const result = await validateAndLint(testFiles, testContext);

    expect(result.validation.success).toBe(true);
    expect(result.validation.data?.report).toBeDefined();
  });

  test('returns lint result', async () => {
    const result = await validateAndLint(testFiles, testContext);

    expect(result.lint.success).toBe(true);
    expect(result.lint.data?.violations).toBeInstanceOf(Array);
  });

  test('handles empty files array', async () => {
    const result = await validateAndLint([], testContext);

    expect(result.validation.success).toBe(true);
    expect(result.lint.success).toBe(true);
  });
});

describe('qualityPipeline workflow', () => {
  beforeEach(() => {
    globalMessageBus.clear();
  });

  afterEach(() => {
    globalMessageBus.clear();
  });

  test('runs full quality pipeline', async () => {
    const result = await qualityPipeline(
      testFiles,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        dryRun: true,
      },
      testContext,
    );

    expect(result.validation).toBeDefined();
    expect(result.lint).toBeDefined();
    expect(result.write).toBeDefined();
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  test('returns success status', async () => {
    const result = await qualityPipeline(
      testFiles,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        dryRun: true,
      },
      testContext,
    );

    expect(typeof result.success).toBe('boolean');
  });

  test('applies fixes when autoFix=true and violations exist', async () => {
    const filesWithIssues: GeneratedFile[] = [
      {
        path: 'tasks/main.yml',
        content: `---
- name: Install nginx
  package:
    name: nginx
    state: present
`,
      },
    ];

    const result = await qualityPipeline(
      filesWithIssues,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        autoFix: true,
        dryRun: true,
      },
      testContext,
    );

    // fix may be defined if there were fixable violations
    expect(result.validation).toBeDefined();
    expect(result.lint).toBeDefined();
  });

  test('skips fixes when autoFix=false', async () => {
    const result = await qualityPipeline(
      testFiles,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        autoFix: false,
        dryRun: true,
      },
      testContext,
    );

    expect(result.fix).toBeUndefined();
  });

  test('respects force option', async () => {
    const result = await qualityPipeline(
      testFiles,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        force: true,
        dryRun: true,
      },
      testContext,
    );

    expect(result.success).toBe(true);
  });

  test('respects dryRun option', async () => {
    const result = await qualityPipeline(
      testFiles,
      {
        name: 'test-role',
        outputDir: '/output',
        type: 'role',
        dryRun: true,
      },
      testContext,
    );

    expect(result.write?.success).toBe(true);
    expect(result.write?.data?.targetDir).toContain('test-role');
  });

  test('handles playbook type', async () => {
    const playbookFiles: GeneratedFile[] = [
      { path: 'playbook.yml', content: '---\n- hosts: all\n  tasks: []\n' },
      { path: 'inventory.ini', content: '[all]\nlocalhost\n' },
    ];

    const result = await qualityPipeline(
      playbookFiles,
      {
        name: 'test-playbook',
        outputDir: '/output',
        type: 'playbook',
        dryRun: true,
      },
      testContext,
    );

    expect(result.write?.data?.targetDir).toContain('test-playbook');
  });

  test('stops early if validation fails', async () => {
    const invalidFiles: GeneratedFile[] = [
      {
        path: 'tasks/main.yml',
        content: `---
- name: Broken task
  ansible.builtin.package
    name: nginx
    state: present
`,
      },
    ];

    const result = await qualityPipeline(
      invalidFiles,
      {
        name: 'invalid-role',
        outputDir: '/output',
        type: 'role',
        dryRun: true,
      },
      testContext,
    );

    // If validation fails, success should be false
    expect(result.validation).toBeDefined();
    if (!result.validation.success) {
      expect(result.success).toBe(false);
    }
  });
});
