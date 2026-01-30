/**
 * Tests for overview presenter.
 */

import { describe, test, expect } from 'bun:test';
import {
  groupTopicsByInterest,
  formatOverview,
  createTopicsFromFindings,
} from './overview.js';
import type { ResearchFindings } from '../research/schemas/findings.js';

describe('groupTopicsByInterest', () => {
  const createTestFindings = (): ResearchFindings => ({
    features: [
      {
        name: 'SSL/TLS support',
        description: 'Configure secure connections',
        category: 'recommended',
        complexity: 'moderate',
        exploreHint: '3 approaches found',
        alternatives: [
          { name: "Let's Encrypt", description: 'Auto-renewing certs' },
          { name: 'Self-signed', description: 'Quick setup' },
        ],
      },
      {
        name: 'Virtual hosts',
        description: 'Multi-domain support',
        category: 'recommended',
        complexity: 'moderate',
        exploreHint: 'Multiple patterns',
      },
      {
        name: 'Package installation',
        description: 'Install via package manager',
        category: 'essential',
        complexity: 'simple',
      },
      {
        name: 'Service management',
        description: 'Start/stop/restart service',
        category: 'essential',
        complexity: 'simple',
      },
      {
        name: 'Rate limiting',
        description: 'Limit request rates',
        category: 'optional',
        complexity: 'complex',
      },
    ],
    packages: [
      { name: 'nginx', source: 'apt', isDefault: true, description: 'High-performance server' },
      { name: 'nginx-full', source: 'apt', isDefault: false },
    ],
    bestPractices: [
      { practice: 'Use FQCN', rationale: 'Compatibility', priority: 'critical' },
    ],
    galaxyRoles: [
      { namespace: 'geerlingguy', name: 'nginx', stars: 300, downloads: 1500000, keyFeatures: ['SSL'] },
    ],
  });

  test('separates interesting features from standard', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings);

    // SSL/TLS and Virtual hosts should be interesting (have alternatives/hints)
    expect(grouped.interesting.some((t) => t.name === 'SSL/TLS support')).toBe(true);
    expect(grouped.interesting.some((t) => t.name === 'Virtual hosts')).toBe(true);

    // Essential simple features should be standard
    expect(grouped.standard.some((t) => t.name === 'Package installation')).toBe(true);
    expect(grouped.standard.some((t) => t.name === 'Service management')).toBe(true);
  });

  test('respects maxInteresting limit', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings, 1);

    expect(grouped.interesting.length).toBeLessThanOrEqual(1);
    // Overflow should go to standard
    expect(grouped.standard.length).toBeGreaterThan(0);
  });

  test('adds package selection topic when packages exist', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings);

    const packageTopic = [...grouped.interesting, ...grouped.standard].find(
      (t) => t.id === 'package-selection',
    );
    expect(packageTopic).toBeDefined();
  });

  test('marks package topic as interesting when multiple packages', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings);

    // Multiple packages should make it interesting
    const packageTopic = grouped.interesting.find((t) => t.id === 'package-selection');
    expect(packageTopic).toBeDefined();
  });

  test('adds standard configuration topics', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings);

    const allTopics = [...grouped.interesting, ...grouped.standard, ...grouped.optional];

    expect(allTopics.some((t) => t.id === 'platforms')).toBe(true);
    expect(allTopics.some((t) => t.id === 'privilege-escalation')).toBe(true);
  });

  test('adds optional topics', () => {
    const findings = createTestFindings();
    const grouped = groupTopicsByInterest(findings);

    expect(grouped.optional.some((t) => t.id === 'molecule-testing')).toBe(true);
    expect(grouped.optional.some((t) => t.id === 'tags-strategy')).toBe(true);
    expect(grouped.optional.some((t) => t.id === 'variable-naming')).toBe(true);
  });
});

describe('createTopicsFromFindings', () => {
  test('creates topics for all features', () => {
    const findings: ResearchFindings = {
      features: [
        { name: 'Feature 1', description: 'Test', category: 'essential', complexity: 'simple' },
        { name: 'Feature 2', description: 'Test', category: 'recommended', complexity: 'moderate' },
      ],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const topics = createTopicsFromFindings(findings);

    expect(topics.some((t) => t.name === 'Feature 1')).toBe(true);
    expect(topics.some((t) => t.name === 'Feature 2')).toBe(true);
  });

  test('includes standard configuration topics', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const topics = createTopicsFromFindings(findings);

    expect(topics.some((t) => t.id === 'platforms')).toBe(true);
    expect(topics.some((t) => t.id === 'molecule-testing')).toBe(true);
  });
});

describe('formatOverview', () => {
  test('includes role description in header', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const output = formatOverview('nginx', 'nginx web server', findings);

    expect(output).toContain('nginx web server');
  });

  test('includes interesting findings section when present', () => {
    const findings: ResearchFindings = {
      features: [
        {
          name: 'SSL/TLS support',
          description: 'Configure SSL',
          category: 'recommended',
          complexity: 'complex',
        },
      ],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const output = formatOverview('nginx', 'nginx', findings);

    expect(output).toContain('Interesting Findings');
    expect(output).toContain('SSL/TLS');
  });

  test('includes best practices when present', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [],
      bestPractices: [
        { practice: 'Use FQCN for all modules', rationale: 'Compatibility', priority: 'critical' },
      ],
      galaxyRoles: [],
    };

    const output = formatOverview('nginx', 'nginx', findings);

    expect(output).toContain('Best Practices');
    expect(output).toContain('FQCN');
  });

  test('includes galaxy roles when present', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [],
      bestPractices: [],
      galaxyRoles: [
        { namespace: 'geerlingguy', name: 'nginx', stars: 300, downloads: 1500000, keyFeatures: [] },
      ],
    };

    const output = formatOverview('nginx', 'nginx', findings);

    expect(output).toContain('Reference Galaxy Roles');
    expect(output).toContain('geerlingguy.nginx');
  });

  test('includes prompt for user interaction', () => {
    const findings: ResearchFindings = {
      features: [],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    };

    const output = formatOverview('nginx', 'nginx', findings);

    expect(output).toContain('explore');
    expect(output).toContain('continue');
  });
});
