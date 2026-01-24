import { mock } from 'bun:test';
import type Anthropic from '@anthropic-ai/sdk';
import type { PlanPreview } from '../../generation/schemas/plan-preview.js';
import type { PlaybookPlanPreview } from '../../generation/schemas/playbook-plan.js';

export type MockErrorType = 'rate_limit' | 'auth' | 'server' | 'overloaded';

export interface MockClientOptions {
  responseText?: string;
  shouldFail?: boolean;
  errorType?: MockErrorType;
  stopReason?: Anthropic.Message['stop_reason'];
  /** For beta API structured outputs */
  structuredResponse?: unknown;
}

/**
 * Create a mock Anthropic API error.
 */
export function createMockApiError(type: MockErrorType): Anthropic.APIError {
  const errorConfigs: Record<MockErrorType, { status: number; message: string }> = {
    rate_limit: { status: 429, message: 'Rate limited' },
    auth: { status: 401, message: 'Invalid API key' },
    server: { status: 500, message: 'Internal server error' },
    overloaded: { status: 529, message: 'API overloaded' },
  };

  const config = errorConfigs[type];
  const error = new Error(config.message) as Anthropic.APIError;
  (error as any).status = config.status;
  (error as any).headers = type === 'rate_limit' ? { 'retry-after': '5' } : {};
  return error;
}

/**
 * Create a mock Anthropic message response.
 */
export function createMockMessage(
  text: string,
  stopReason: Anthropic.Message['stop_reason'] = 'end_turn',
): Anthropic.Message {
  return {
    id: 'msg_mock_123',
    type: 'message',
    role: 'assistant',
    model: 'claude-sonnet-4-5-20250929',
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
  };
}

/**
 * Create a mock async iterator for streaming responses.
 */
export function createMockStream(content: string) {
  return {
    async *[Symbol.asyncIterator]() {
      yield {
        type: 'content_block_start',
        index: 0,
        content_block: { type: 'text', text: '' },
      };
      yield {
        type: 'content_block_delta',
        index: 0,
        delta: { type: 'text_delta', text: content },
      };
      yield { type: 'content_block_stop', index: 0 };
      yield { type: 'message_stop' };
    },
    on: mock((event: string, callback: (data: any) => void) => {
      if (event === 'text') {
        callback(content);
      }
    }),
    finalMessage: mock(async () => createMockMessage(content)),
  };
}

/**
 * Create a mock Anthropic client for testing.
 */
export function createMockAnthropicClient(options: MockClientOptions = {}) {
  const {
    responseText = 'Mock response',
    shouldFail = false,
    errorType,
    structuredResponse,
  } = options;

  const mockCreate = mock(async () => {
    if (shouldFail && errorType) {
      throw createMockApiError(errorType);
    }
    return createMockMessage(responseText, options.stopReason);
  });

  const mockStream = mock(() => {
    if (shouldFail && errorType) {
      throw createMockApiError(errorType);
    }
    return createMockStream(responseText);
  });

  // Beta API for structured outputs
  const mockBetaCreate = mock(async () => {
    if (shouldFail && errorType) {
      throw createMockApiError(errorType);
    }
    // For structured outputs, return the JSON as text
    const text = structuredResponse ? JSON.stringify(structuredResponse) : responseText;
    return createMockMessage(text, options.stopReason);
  });

  return {
    messages: {
      create: mockCreate,
      stream: mockStream,
    },
    beta: {
      messages: {
        create: mockBetaCreate,
      },
    },
  };
}

// ============================================================
// Plan Object Factories
// ============================================================

/**
 * Create a mock PlanPreview for role generation.
 */
export function createMockPlanPreview(overrides?: Partial<PlanPreview>): PlanPreview {
  return {
    role_name: 'nginx',
    description: 'Ansible role for nginx web server',
    tasks: [
      {
        name: 'Install nginx',
        purpose: 'Install nginx package',
        module: 'ansible.builtin.package',
      },
      {
        name: 'Configure nginx',
        purpose: 'Template nginx configuration',
        module: 'ansible.builtin.template',
      },
      {
        name: 'Start nginx service',
        purpose: 'Ensure nginx service is running',
        module: 'ansible.builtin.service',
      },
    ],
    handlers: ['restart nginx'],
    templates: ['nginx.conf.j2'],
    variables: [
      { name: 'nginx_port', default: '80', description: 'Nginx listening port' },
      { name: 'nginx_user', default: 'www-data', description: 'Nginx process user' },
    ],
    platforms: ['Ubuntu', 'Debian', 'RHEL'],
    ...overrides,
  };
}

/**
 * Create a mock PlaybookPlanPreview for playbook generation.
 */
export function createMockPlaybookPlanPreview(
  overrides?: Partial<PlaybookPlanPreview>,
): PlaybookPlanPreview {
  return {
    playbook_name: 'deploy-webserver',
    description: 'Playbook to deploy a web server',
    plays: [
      {
        name: 'Deploy web server',
        hosts: 'webservers',
        purpose: 'Install and configure web server',
        tasks: [
          {
            name: 'Install nginx',
            module: 'ansible.builtin.package',
            purpose: 'Install nginx package',
          },
          {
            name: 'Start service',
            module: 'ansible.builtin.service',
            purpose: 'Start nginx service',
          },
        ],
        handlers: ['restart nginx'],
        has_pre_tasks: false,
        has_post_tasks: false,
      },
    ],
    group_vars: [
      {
        group: 'webservers',
        variables: [{ name: 'nginx_port', default: '80', description: 'Nginx listening port' }],
      },
    ],
    inventory_groups: ['webservers', 'databases'],
    ...overrides,
  };
}

// ============================================================
// Generated File Factories
// ============================================================

/**
 * Create mock streamed YAML output for role generation.
 *
 * Format matches parser expectation:
 * === PATH: <path> ===
 * <content>
 * === END ===
 */
export function createMockStreamedRoleYaml(
  files?: Array<{ path: string; content: string }>,
): string {
  const defaultFiles = [
    {
      path: 'tasks/main.yml',
      content: `---
- name: Install nginx
  ansible.builtin.package:
    name: nginx
    state: present

- name: Start nginx service
  ansible.builtin.service:
    name: nginx
    state: started
    enabled: true`,
    },
    {
      path: 'defaults/main.yml',
      content: `---
nginx_port: 80
nginx_user: www-data`,
    },
    {
      path: 'handlers/main.yml',
      content: `---
- name: restart nginx
  ansible.builtin.service:
    name: nginx
    state: restarted`,
    },
  ];

  const filesToUse = files ?? defaultFiles;
  return filesToUse
    .map(
      (f) => `=== PATH: ${f.path} ===
${f.content}
=== END ===`,
    )
    .join('\n\n');
}

/**
 * Create mock streamed YAML output for playbook generation.
 *
 * Format matches parser expectation:
 * === PATH: <path> ===
 * <content>
 * === END ===
 */
export function createMockStreamedPlaybookYaml(
  files?: Array<{ path: string; content: string }>,
): string {
  const defaultFiles = [
    {
      path: 'playbook.yml',
      content: `---
- name: Deploy web server
  hosts: webservers
  become: true
  tasks:
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present`,
    },
    {
      path: 'inventory.ini',
      content: `[webservers]
web01 ansible_host=192.168.1.10`,
    },
    {
      path: 'group_vars/webservers.yml',
      content: `---
nginx_port: 80`,
    },
  ];

  const filesToUse = files ?? defaultFiles;
  return filesToUse
    .map(
      (f) => `=== PATH: ${f.path} ===
${f.content}
=== END ===`,
    )
    .join('\n\n');
}
