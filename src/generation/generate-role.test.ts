import { beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createMockAnthropicClient,
  createMockPlanPreview,
  createMockStreamedRoleYaml,
} from '../__test-utils__/mocks/anthropic.js';
import { generateRoleCode, generateRolePlan } from './generate-role.js';
import type { PlanPreview } from './schemas/plan-preview.js';

describe('generateRolePlan', () => {
  const validPlanResponse: PlanPreview = {
    role_name: 'nginx',
    description: 'Ansible role to install and configure nginx web server',
    tasks: [
      {
        name: 'Install nginx',
        module: 'ansible.builtin.package',
        purpose: 'Install nginx package',
      },
      { name: 'Start nginx', module: 'ansible.builtin.service', purpose: 'Start nginx service' },
    ],
    variables: [{ name: 'nginx_port', default: '80', description: 'Nginx listening port' }],
    handlers: ['restart nginx'],
    templates: ['nginx.conf.j2'],
    platforms: ['Ubuntu', 'Debian'],
  };

  test('returns plan preview from API response', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const result = await generateRolePlan(
      mockClient as any,
      'Install and configure nginx web server',
      undefined,
      { quiet: true },
    );

    expect(result.role_name).toBe('nginx');
    expect(result.description).toContain('nginx');
    expect(result.tasks).toBeInstanceOf(Array);
    expect(result.tasks.length).toBeGreaterThan(0);
  });

  test('passes clarifications to prompt', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const clarifications = {
      platform: 'Ubuntu 22.04',
      ssl: "Yes, with Let's Encrypt",
    };

    const result = await generateRolePlan(mockClient as any, 'nginx web server', clarifications, {
      quiet: true,
    });

    // Verify the API was called (the prompt would include clarifications)
    expect(mockClient.beta.messages.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  test('handles API rate limit error', async () => {
    const mockClient = createMockAnthropicClient({
      shouldFail: true,
      errorType: 'rate_limit',
    });

    await expect(
      generateRolePlan(mockClient as any, 'nginx web server', undefined, {
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
      generateRolePlan(mockClient as any, 'nginx web server', undefined, {
        quiet: true,
        noRetry: true,
      }),
    ).rejects.toThrow();
  });

  test('handles API server error', async () => {
    const mockClient = createMockAnthropicClient({
      shouldFail: true,
      errorType: 'server',
    });

    await expect(
      generateRolePlan(mockClient as any, 'nginx web server', undefined, {
        quiet: true,
        noRetry: true,
      }),
    ).rejects.toThrow();
  });

  test('parses response with all required fields', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    const result = await generateRolePlan(mockClient as any, 'nginx', undefined, { quiet: true });

    expect(result.role_name).toBeDefined();
    expect(result.description).toBeDefined();
    expect(result.tasks).toBeDefined();
    expect(result.variables).toBeDefined();
    expect(result.handlers).toBeDefined();
    expect(result.templates).toBeDefined();
    expect(result.platforms).toBeDefined();
  });

  test('quiet option suppresses spinner', async () => {
    const mockClient = createMockAnthropicClient({
      structuredResponse: validPlanResponse,
    });

    // No error should be thrown and result should be valid
    const result = await generateRolePlan(mockClient as any, 'nginx', undefined, { quiet: true });

    expect(result).toBeDefined();
  });
});

describe('generateRoleCode', () => {
  test('returns parsed files from streamed output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('path');
    expect(result[0]).toHaveProperty('content');
  });

  test('includes tasks/main.yml in output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    const tasksFile = result.find((f) => f.path === 'tasks/main.yml');
    expect(tasksFile).toBeDefined();
    expect(tasksFile?.content).toContain('name:');
  });

  test('includes defaults/main.yml in output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    const defaultsFile = result.find((f) => f.path === 'defaults/main.yml');
    expect(defaultsFile).toBeDefined();
  });

  test('includes handlers/main.yml when plan has handlers', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview({ handlers: ['restart nginx'] });

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    const handlersFile = result.find((f) => f.path === 'handlers/main.yml');
    expect(handlersFile).toBeDefined();
  });

  test('handles empty output gracefully', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: '',
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(0);
  });

  test('handles malformed output gracefully', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: 'This is not a valid file marker format',
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
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
    const plan = createMockPlanPreview();

    await expect(
      generateRoleCode(mockClient as any, plan, 'nginx web server', { quiet: true, noRetry: true }),
    ).rejects.toThrow();
  });

  test('quiet option suppresses output', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    // Should not throw and should return valid files
    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    expect(result.length).toBeGreaterThan(0);
  });

  test('generates files with YAML content', async () => {
    const mockClient = createMockAnthropicClient({
      responseText: createMockStreamedRoleYaml(),
    });
    const plan = createMockPlanPreview();

    const result = await generateRoleCode(mockClient as any, plan, 'nginx web server', {
      quiet: true,
    });

    // Check that YAML content is present
    const tasksFile = result.find((f) => f.path === 'tasks/main.yml');
    expect(tasksFile?.content).toMatch(/^---/);
  });
});
