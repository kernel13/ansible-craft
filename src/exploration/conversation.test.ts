/**
 * Tests for conversation parser.
 */

import { describe, test, expect } from 'bun:test';
import {
  parseModification,
  parseModifications,
  applyModification,
  suggestModifications,
} from './conversation.js';
import type { ExplorationSession, ExplorationTopic } from './types.js';

describe('parseModification', () => {
  describe('add feature patterns', () => {
    test('parses "add SSL feature"', () => {
      const mod = parseModification('add SSL feature');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_feature');
      expect(mod!.target.toLowerCase()).toContain('ssl');
    });

    test('parses "include the backup support"', () => {
      const mod = parseModification('include the backup support');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_feature');
      expect(mod!.target.toLowerCase()).toContain('backup');
    });

    test('parses "enable caching"', () => {
      const mod = parseModification('enable caching');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_feature');
      expect(mod!.target.toLowerCase()).toContain('caching');
    });

    test('parses "add support for SSL"', () => {
      const mod = parseModification('add support for SSL');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_feature');
    });
  });

  describe('remove feature patterns', () => {
    test('parses "remove the SSL feature"', () => {
      const mod = parseModification('remove the SSL feature');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_feature');
    });

    test('parses "disable logging"', () => {
      const mod = parseModification('disable logging');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_feature');
      expect(mod!.target.toLowerCase()).toContain('logging');
    });

    test("parses \"don't include caching\"", () => {
      const mod = parseModification("don't include caching");
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_feature');
    });

    test('parses "skip the backup feature"', () => {
      const mod = parseModification('skip the backup feature');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_feature');
    });
  });

  describe('platform patterns', () => {
    test('parses "add Ubuntu support"', () => {
      const mod = parseModification('add Ubuntu support');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_platform');
      expect(mod!.target).toBe('Ubuntu');
    });

    test('parses "support RHEL"', () => {
      const mod = parseModification('support RHEL');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_platform');
      expect(mod!.target).toBe('RHEL');
    });

    test('parses "add CentOS" and normalizes to RHEL', () => {
      const mod = parseModification('add CentOS');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('add_platform');
      expect(mod!.target).toBe('RHEL');
    });

    test('parses "remove Ubuntu platform"', () => {
      const mod = parseModification('remove Ubuntu platform');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_platform');
    });

    test("parses \"don't support Windows\"", () => {
      const mod = parseModification("don't support Windows");
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('remove_platform');
    });
  });

  describe('molecule patterns', () => {
    test('parses "skip molecule tests"', () => {
      const mod = parseModification('skip molecule tests');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('toggle_molecule');
      expect(mod!.value).toBe(false);
    });

    test('parses "no testing"', () => {
      const mod = parseModification('no testing');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('toggle_molecule');
      expect(mod!.value).toBe(false);
    });

    test('parses "disable molecule testing"', () => {
      const mod = parseModification('disable molecule testing');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('toggle_molecule');
      expect(mod!.value).toBe(false);
    });

    test('parses "enable tests"', () => {
      const mod = parseModification('enable tests');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('toggle_molecule');
      expect(mod!.value).toBe(true);
    });

    test('parses "add molecule testing"', () => {
      const mod = parseModification('add molecule testing');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('toggle_molecule');
      expect(mod!.value).toBe(true);
    });
  });

  describe('setting patterns', () => {
    test('parses "make SSL optional"', () => {
      const mod = parseModification('make SSL optional');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('change_setting');
      expect(mod!.value).toBe('optional');
    });

    test('parses "change driver to podman"', () => {
      const mod = parseModification('change driver to podman');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('change_setting');
      expect(mod!.target).toBe('driver');
      expect(mod!.value).toBe('podman');
    });
  });

  describe('edge cases', () => {
    test('returns null for empty input', () => {
      const mod = parseModification('');
      expect(mod).toBeNull();
    });

    test('returns null for whitespace only', () => {
      const mod = parseModification('   ');
      expect(mod).toBeNull();
    });

    test('returns custom for unrecognized input', () => {
      const mod = parseModification('something completely different');
      expect(mod).not.toBeNull();
      expect(mod!.type).toBe('custom');
      expect(mod!.originalText).toBe('something completely different');
    });
  });
});

describe('parseModifications', () => {
  test('parses comma-separated modifications', () => {
    const mods = parseModifications('add SSL, remove logging, skip tests');
    expect(mods.length).toBe(3);
  });

  test('parses newline-separated modifications', () => {
    const mods = parseModifications('add SSL\nremove logging\nskip tests');
    expect(mods.length).toBe(3);
  });

  test('handles empty parts', () => {
    const mods = parseModifications('add SSL,, remove logging');
    expect(mods.length).toBe(2);
  });
});

describe('applyModification', () => {
  const createTestSession = (): ExplorationSession => ({
    id: 'test-session',
    roleDescription: 'test role',
    roleName: 'test',
    researchFindings: { features: [], packages: [], bestPractices: [], galaxyRoles: [] },
    topics: [
      {
        id: 'feature-ssl',
        name: 'SSL/TLS support',
        type: 'feature',
        description: 'SSL config',
        isInteresting: true,
      },
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
        description: 'Testing',
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

  test('applies add_feature modification for matching topic', () => {
    const session = createTestSession();
    const mod = parseModification('add SSL/TLS support')!;

    const { session: updated, applied, message } = applyModification(session, mod);

    expect(applied).toBe(true);
    expect(updated.explored['feature-ssl']).toBeDefined();
    expect(message).toContain('SSL/TLS');
  });

  test('applies remove_feature modification', () => {
    const session = createTestSession();
    session.explored['feature-ssl'] = {
      topicId: 'feature-ssl',
      resolution: { type: 'user_choice', value: 'enabled' },
      exploredAt: new Date().toISOString(),
    };

    const mod = parseModification('remove SSL feature')!;
    const { session: updated, applied } = applyModification(session, mod);

    expect(applied).toBe(true);
    expect(updated.explored['feature-ssl']).toBeUndefined();
    expect(updated.skipped).toContain('feature-ssl');
  });

  test('applies add_platform modification', () => {
    const session = createTestSession();
    const mod = parseModification('add Ubuntu support')!;

    const { session: updated, applied } = applyModification(session, mod);

    expect(applied).toBe(true);
    expect(updated.explored['platforms']).toBeDefined();
    const value = updated.explored['platforms']!.resolution.value as string[];
    expect(value).toContain('Ubuntu');
  });

  test('applies toggle_molecule modification', () => {
    const session = createTestSession();
    const mod = parseModification('skip molecule tests')!;

    const { session: updated, applied } = applyModification(session, mod);

    expect(applied).toBe(true);
    expect(updated.explored['molecule-testing']).toBeDefined();
    const value = updated.explored['molecule-testing']!.resolution.value as Record<string, unknown>;
    expect(value.enabled).toBe(false);
  });

  test('adds modification to session modifications array', () => {
    const session = createTestSession();
    const mod = parseModification('add SSL feature')!;

    const { session: updated } = applyModification(session, mod);

    expect(updated.modifications.length).toBe(1);
    expect(updated.modifications[0].originalText).toBe('add SSL feature');
  });
});

describe('suggestModifications', () => {
  test('suggests adding unexplored interesting topics', () => {
    const session: ExplorationSession = {
      id: 'test',
      roleDescription: 'test',
      roleName: 'test',
      researchFindings: { features: [], packages: [], bestPractices: [], galaxyRoles: [] },
      topics: [
        { id: 'topic-1', name: 'SSL Support', type: 'feature', description: '', isInteresting: true },
        { id: 'topic-2', name: 'Caching', type: 'feature', description: '', isInteresting: true },
      ] as ExplorationTopic[],
      explored: {},
      skipped: [],
      modifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: false,
    };

    const suggestions = suggestModifications(session);

    expect(suggestions.some((s) => s.includes('ssl'))).toBe(true);
    expect(suggestions.some((s) => s.includes('caching'))).toBe(true);
  });

  test('suggests platform additions when Generic', () => {
    const session: ExplorationSession = {
      id: 'test',
      roleDescription: 'test',
      roleName: 'test',
      researchFindings: { features: [], packages: [], bestPractices: [], galaxyRoles: [] },
      topics: [] as ExplorationTopic[],
      explored: {
        platforms: {
          topicId: 'platforms',
          resolution: { type: 'smart_default', value: ['Generic'] },
          exploredAt: new Date().toISOString(),
        },
      },
      skipped: [],
      modifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: false,
    };

    const suggestions = suggestModifications(session);

    expect(suggestions.some((s) => s.toLowerCase().includes('ubuntu'))).toBe(true);
  });
});
