import { describe, expect, test } from 'bun:test';
import {
  createMockAnthropicClient,
  createMockPlaybookPlanPreview,
  createMockStreamedPlaybookYaml,
} from '../__test-utils__/mocks/anthropic.js';
import { generatePlaybookCode, generatePlaybookPlan } from './generate-playbook.js';
import type { PlaybookPlanPreview } from './schemas/playbook-plan.js';

describe('generatePlaybookPlan', () => {
  const validPlanResponse: PlaybookPlanPreview = {
    playbook_name: 'deploy-lamp',
    description: 'Playbook to deploy a LAMP stack',
    plays: [
      {
        name: 'Deploy web servers',
        hosts: 'webservers',
        purpose: 'Install and configure Apache and PHP',
        tasks: [
          {
            name: 'Install Apache',
            module: 'ansible.builtin.package',
            purpose: 'Install Apache web server',
          },
          {
            name: 'Start Apache',
            module: 'ansible.builtin.service',
            purpose: 'Start Apache service',
          },
        ],
        handlers: ['restart apache'],
        has_pre_tasks: false,
        has_post_tasks: false,
      },
    ],
    group_vars: [
      {
        group: 'webservers',
        variables: [{ name: 'apache_port', default: '80', description: 'Apache listening port' }],
      },
    ],
    inventory_groups: ['webservers', 'databases'],
  };

  test('returns playbook plan from API response', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const result = await generatePlaybookPlan(mockClient as any, 'Deploy a LAMP stack', undefined, {
      quiet: true,
    });

    expect(result.playbook_name).toBe('deploy-lamp');
    expect(result.description).toContain('LAMP');
    expect(result.plays).toBeInstanceOf(Array);
    expect(result.plays.length).toBeGreaterThan(0);
  });

  test('passes clarifications to prompt', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const clarifications = {
      database: 'MySQL 8.0',
      environment: 'Production',
    };

    const result = await generatePlaybookPlan(mockClient as any, 'LAMP stack', clarifications, {
      quiet: true,
    });

    // Verify the API was called
    expect(mockClient.beta.messages.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('handles API rate limit error', async () => {
    const mockClient = createMockAnthropicClient({
      shouldFail: true,
      errorType: 'rate_limit',
    });

    await expect(
      generatePlaybookPlan(mockClient as any, 'LAMP stack', undefined, {
        quiet: true,
        noRetry: true,
      }),
    ).rejects.toThrow();
  });

  test('handles API auth error', async () => {
    const mockClient = createMockAnthropicClient({
      shouldFail: true,
      errorType: 'auth',
    });

    await expect(
      generatePlaybookPlan(mockClient as any, 'LAMP stack', undefined, {
        quiet: true,
        noRetry: true,
      }),
    ).rejects.toThrow();
  });

  test('parses response with all required fields', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const result = await generatePlaybookPlan(mockClient as any, 'LAMP stack', undefined, {
      quiet: true,
    });

    expect(result.playbook_name).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.plays).toBeDefined();
    expect(result.group_vars).toBeDefined();
    expect(result.inventory_groups).toBeDefined();
  });

  test('parses play structure correctly', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const result = await generatePlaybookPlan(mockClient as any, 'LAMP stack', undefined, {
      quiet: true,
    });

    const firstPlay = result.plays[0];
    expect(firstPlay.name).toBeDefined();
    expect(firstPlay.hosts).toBeDefined();
    expect(firstPlay.purpose).toBeDefined();
    expect(firstPlay.tasks).toBeInstanceOf(Array);
    expect(firstPlay.handlers).toBeInstanceOf(Array);
  });
});

describe('generatePlaybookCode', () => {
  test('returns parsed files from streamed output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack deployment', {
      quiet: true,
    });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('path');
    expect(result[0]).toHaveProperty('content');
  });

  test('includes playbook.yml in output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    const playbookFile = result.find((f) => f.path === 'playbook.yml');
    expect(playbookFile).toBeDefined();
    expect(playbookFile?.content).toContain('hosts:');
  });

  test('includes inventory file in output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    const inventoryFile = result.find((f) => f.path === 'inventory.ini');
    expect(inventoryFile).toBeDefined();
  });

  test('includes group_vars files in output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    const groupVarsFiles = result.filter((f) => f.path.startsWith('group_vars/'));
    expect(groupVarsFiles.length).toBeGreaterThan(0);
  });

  test('handles empty output gracefully', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: '',
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
  });

  test('handles malformed output gracefully', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'Invalid content without file markers',
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
  });

  test('handles API errors', async () => {
    const mockClient = createMockAnthropicClient({
      shouldFail: true,
      errorType: 'server',
    });
    const plan = createMockPlaybookPlanPreview();

    await expect(
      generatePlaybookCode(mockClient as any, plan, 'LAMP stack', { quiet: true, noRetry: true }),
    ).rejects.toThrow();
  });

  test('generates files with YAML content', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedPlaybookYaml(),
    });
    const plan = createMockPlaybookPlanPreview();

    const result = await generatePlaybookCode(mockClient as any, plan, 'LAMP stack', {
      quiet: true,
    });

    // Check that YAML content is present in playbook file
    const playbookFile = result.find((f) => f.path === 'playbook.yml');
    expect(playbookFile?.content).toMatch(/^---/);
  });
});
