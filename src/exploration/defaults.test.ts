/**
 * Tests for smart defaults engine.
 */

import { describe, test, expect } from 'bun:test';
import { calculateSmartDefaults, buildContextFromSession, getDefaultsSummary } from './defaults.js';
import type { ResearchFindings } from '../research/schemas/findings.js';
import type { ExplorationSession, ExplorationTopic } from './types.js';

describe('calculateSmartDefaults', () => {
  test('returns basic defaults when no options provided', () => {
    const defaults = calculateSmartDefaults();

    expect(defaults.structure).toContain('tasks');
    expect(defaults.structure).toContain('defaults');
    expect(defaults.platforms).toEqual(['Generic']);
    expect(defaults.variableStrategy.naming).toBe('prefixed');
    expect(defaults.privilegeEscalation.required).toBe('yes');
    expect(defaults.molecule.enabled).toBe(true);
  });

  test('applies feature correlations for SSL features', () => {
    const defaults = calculateSmartDefaults({
      selectedFeatures: ['SSL/TLS support', 'HTTPS configuration'],
    });

    expect(defaults.handlers).toContain('reload');
    expect(defaults.structure).toContain('templates');
    expect(defaults.structure).toContain('handlers');
    expect(defaults.tags.groups).toContain('ssl');
  });

  test('applies feature correlations for service features', () => {
    const defaults = calculateSmartDefaults({
      selectedFeatures: ['Service management', 'systemd integration'],
    });

    expect(defaults.handlers).toContain('restart');
    expect(defaults.handlers).toContain('reload');
    expect(defaults.handlers).toContain('enable');
    expect(defaults.structure).toContain('handlers');
  });

  test('applies feature correlations for database features', () => {
    const defaults = calculateSmartDefaults({
      selectedFeatures: ['Database replication', 'Backup support'],
    });

    expect(defaults.handlers).toContain('restart');
    expect(defaults.tags.groups).toContain('database');
    expect(defaults.tags.groups).toContain('backup');
  });

  test('uses conservative mode when enabled', () => {
    const defaults = calculateSmartDefaults({
      conservative: true,
    });

    expect(defaults.molecule.enabled).toBe(false);
  });

  test('uses research findings to determine default package', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [
        { name: 'nginx-light', source: 'apt', isDefault: false },
        { name: 'nginx', source: 'apt', isDefault: true },
        { name: 'nginx-full', source: 'apt', isDefault: false },
      ],
      bestPractices: [],
      galaxyRoles: [],
    };

    const defaults = calculateSmartDefaults({ findings });

    expect(defaults.selectedPackages).toContain('nginx');
  });

  test('uses essential features from research as defaults', () => {
    const findings: ResearchFindings = {
      features: [
        { name: 'Package installation', description: 'Install via apt', category: 'essential', complexity: 'simple' },
        { name: 'Service management', description: 'Start/stop service', category: 'essential', complexity: 'simple' },
        { name: 'SSL support', description: 'Configure TLS', category: 'recommended', complexity: 'moderate', confidence: 'high' },
        { name: 'Rate limiting', description: 'Limit requests', category: 'optional', complexity: 'complex' },
      ],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const defaults = calculateSmartDefaults({ findings });

    expect(defaults.selectedFeatures).toContain('Package installation');
    expect(defaults.selectedFeatures).toContain('Service management');
    expect(defaults.selectedFeatures).toContain('SSL support'); // High confidence recommended
    expect(defaults.selectedFeatures).not.toContain('Rate limiting'); // Optional
  });
});

describe('buildContextFromSession', () => {
  const createTestSession = (): ExplorationSession => ({
    id: 'test-session',
    roleDescription: 'nginx web server',
    roleName: 'nginx',
    researchFindings: {
      features: [],
      packages: [{ name: 'nginx', source: 'apt', isDefault: true }],
      bestPractices: [],
      galaxyRoles: [],
    },
    topics: [
      {
        id: 'platforms',
        name: 'Platforms',
        type: 'configuration',
        description: 'Target platforms',
        isInteresting: false,
      },
      {
        id: 'molecule-testing',
        name: 'Molecule Testing',
        type: 'testing',
        description: 'Testing config',
        isInteresting: false,
      },
    ] as ExplorationTopic[],
    explored: {},
    skipped: [],
    modifications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completed: false,
  });

  test('applies explored topic resolutions', () => {
    const session = createTestSession();
    session.explored['platforms'] = {
      topicId: 'platforms',
      resolution: {
        type: 'user_choice',
        value: ['Ubuntu', 'Debian'],
      },
      exploredAt: new Date().toISOString(),
    };

    const context = buildContextFromSession(session);

    expect(context.platforms).toEqual(['Ubuntu', 'Debian']);
  });

  test('applies molecule testing resolution', () => {
    const session = createTestSession();
    session.explored['molecule-testing'] = {
      topicId: 'molecule-testing',
      resolution: {
        type: 'user_choice',
        value: { enabled: false, level: 'none' },
      },
      exploredAt: new Date().toISOString(),
    };

    const context = buildContextFromSession(session);

    expect(context.molecule.enabled).toBe(false);
  });

  test('applies natural language modifications', () => {
    const session = createTestSession();
    session.modifications = [
      {
        type: 'add_platform',
        target: 'RHEL',
        originalText: 'add RHEL support',
        applied: true,
      },
    ];

    const context = buildContextFromSession(session);

    expect(context.platforms).toContain('RHEL');
  });

  test('applies feature modifications', () => {
    const session = createTestSession();
    session.modifications = [
      {
        type: 'add_feature',
        target: 'SSL support',
        originalText: 'add SSL support',
        applied: true,
      },
    ];

    const context = buildContextFromSession(session);

    expect(context.selectedFeatures).toContain('SSL support');
  });

  test('applies molecule toggle modification', () => {
    const session = createTestSession();
    session.modifications = [
      {
        type: 'toggle_molecule',
        target: 'molecule',
        value: false,
        originalText: 'skip molecule tests',
        applied: true,
      },
    ];

    const context = buildContextFromSession(session);

    expect(context.molecule.enabled).toBe(false);
  });
});

describe('getDefaultsSummary', () => {
  test('correctly separates explored and defaulted topics', () => {
    const session: ExplorationSession = {
      id: 'test',
      roleDescription: 'test',
      roleName: 'test',
      researchFindings: { features: [], packages: [], bestPractices: [], galaxyRoles: [] },
      topics: [
        { id: 'topic-1', name: 'Topic 1', type: 'feature', description: '', isInteresting: true },
        { id: 'topic-2', name: 'Topic 2', type: 'feature', description: '', isInteresting: true },
        { id: 'topic-3', name: 'Topic 3', type: 'feature', description: '', isInteresting: false },
      ] as ExplorationTopic[],
      explored: {
        'topic-1': {
          topicId: 'topic-1',
          resolution: { type: 'user_choice', value: 'selected' },
          exploredAt: new Date().toISOString(),
        },
      },
      skipped: [],
      modifications: [{ type: 'add_feature', target: 'feature', originalText: 'add feature' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: false,
    };

    const context = calculateSmartDefaults();
    const summary = getDefaultsSummary(session, context);

    expect(summary.explored).toContain('topic-1');
    expect(summary.defaulted).toContain('topic-2');
    expect(summary.defaulted).toContain('topic-3');
    expect(summary.modifications).toContain('add feature');
  });
});
