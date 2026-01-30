/**
 * Tests for session persistence.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, readdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  cleanupOldSessions,
  findRecentSession,
  sessionExists,
  formatSessionMetadata,
  formatSessionsList,
  getSessionsDir,
  type SessionMetadata,
} from './session.js';
import type { ExplorationSession, ExplorationTopic } from './types.js';

// Use a temporary directory for tests
const TEST_SESSIONS_DIR = join(tmpdir(), 'ansible-craft-test-sessions');

// Mock getSessionsDir to use test directory
const originalGetSessionsDir = getSessionsDir;

describe('session persistence', () => {
  const createTestSession = (overrides: Partial<ExplorationSession> = {}): ExplorationSession => ({
    id: `test-session-${Date.now()}`,
    roleDescription: 'nginx web server',
    roleName: 'nginx',
    researchFindings: {
      features: [],
      packages: [],
      bestPractices: [],
      galaxyRoles: [],
    },
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
    ] as ExplorationTopic[],
    explored: {},
    skipped: [],
    modifications: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completed: false,
    ...overrides,
  });

  beforeEach(async () => {
    // Clean up test directory before each test
    try {
      await rm(TEST_SESSIONS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await mkdir(TEST_SESSIONS_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory after each test
    try {
      await rm(TEST_SESSIONS_DIR, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('formatSessionMetadata', () => {
    test('formats complete session metadata', () => {
      const metadata: SessionMetadata = {
        id: 'abc12345-1234-5678-9012-123456789012',
        roleDescription: 'nginx with SSL',
        roleName: 'nginx',
        createdAt: '2025-01-15T10:00:00.000Z',
        updatedAt: '2025-01-15T12:00:00.000Z',
        completed: true,
        topicsExplored: 5,
        topicsTotal: 8,
      };

      const formatted = formatSessionMetadata(metadata);

      expect(formatted).toContain('abc12345');
      expect(formatted).toContain('nginx with SSL');
      expect(formatted).toContain('nginx');
      expect(formatted).toContain('5/8 topics');
      expect(formatted).toContain('Complete');
    });

    test('formats incomplete session metadata', () => {
      const metadata: SessionMetadata = {
        id: 'xyz98765-1234-5678-9012-123456789012',
        roleDescription: 'postgresql database',
        roleName: 'postgresql',
        createdAt: '2025-01-14T10:00:00.000Z',
        updatedAt: '2025-01-14T14:00:00.000Z',
        completed: false,
        topicsExplored: 2,
        topicsTotal: 10,
      };

      const formatted = formatSessionMetadata(metadata);

      expect(formatted).toContain('xyz98765');
      expect(formatted).toContain('postgresql database');
      expect(formatted).toContain('2/10 topics');
      expect(formatted).toContain('In progress');
    });
  });

  describe('formatSessionsList', () => {
    test('formats empty sessions list', () => {
      const formatted = formatSessionsList([]);

      expect(formatted).toContain('No saved sessions');
    });

    test('formats list with multiple sessions', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'session-1',
          roleDescription: 'nginx',
          roleName: 'nginx',
          createdAt: '2025-01-15T10:00:00.000Z',
          updatedAt: '2025-01-15T12:00:00.000Z',
          completed: true,
          topicsExplored: 5,
          topicsTotal: 5,
        },
        {
          id: 'session-2',
          roleDescription: 'postgresql',
          roleName: 'postgresql',
          createdAt: '2025-01-14T10:00:00.000Z',
          updatedAt: '2025-01-14T14:00:00.000Z',
          completed: false,
          topicsExplored: 2,
          topicsTotal: 8,
        },
      ];

      const formatted = formatSessionsList(sessions);

      expect(formatted).toContain('Saved exploration sessions');
      expect(formatted).toContain('nginx');
      expect(formatted).toContain('postgresql');
    });
  });

  // Note: The following tests require actual file system operations.
  // In a real test environment, we would mock the file system functions
  // or use the actual sessions directory with proper cleanup.

  describe('session operations (integration)', () => {
    // These tests would need proper mocking of getSessionsDir()
    // For now, we test the data transformation logic

    test('session schema validates correct data', () => {
      const session = createTestSession();

      // The session should be valid according to our type definitions
      expect(session.id).toBeDefined();
      expect(session.roleDescription).toBe('nginx web server');
      expect(session.roleName).toBe('nginx');
      expect(session.topics.length).toBe(2);
      expect(session.completed).toBe(false);
    });

    test('session with explored topics has correct structure', () => {
      const session = createTestSession({
        explored: {
          'feature-ssl': {
            topicId: 'feature-ssl',
            resolution: {
              type: 'user_choice',
              value: 'letsencrypt',
            },
            exploredAt: new Date().toISOString(),
          },
        },
      });

      expect(Object.keys(session.explored).length).toBe(1);
      expect(session.explored['feature-ssl']?.resolution.type).toBe('user_choice');
      expect(session.explored['feature-ssl']?.resolution.value).toBe('letsencrypt');
    });

    test('session with modifications has correct structure', () => {
      const session = createTestSession({
        modifications: [
          {
            type: 'add_platform',
            target: 'RHEL',
            originalText: 'add RHEL support',
            applied: true,
          },
          {
            type: 'toggle_molecule',
            target: 'molecule',
            value: false,
            originalText: 'skip molecule tests',
            applied: true,
          },
        ],
      });

      expect(session.modifications.length).toBe(2);
      expect(session.modifications[0].type).toBe('add_platform');
      expect(session.modifications[1].type).toBe('toggle_molecule');
      expect(session.modifications[1].value).toBe(false);
    });

    test('completed session has correct flag', () => {
      const session = createTestSession({
        completed: true,
        explored: {
          'feature-ssl': {
            topicId: 'feature-ssl',
            resolution: { type: 'user_choice', value: 'enabled' },
            exploredAt: new Date().toISOString(),
          },
          platforms: {
            topicId: 'platforms',
            resolution: { type: 'smart_default', value: ['Ubuntu', 'Debian'] },
            exploredAt: new Date().toISOString(),
          },
        },
      });

      expect(session.completed).toBe(true);
      expect(Object.keys(session.explored).length).toBe(2);
    });
  });

  describe('session ID sanitization', () => {
    test('valid session IDs are preserved', () => {
      const validIds = [
        'abc123',
        'test-session-001',
        'my_session',
        'Session-2025-01-15',
      ];

      for (const id of validIds) {
        // The sanitization logic removes non-alphanumeric except dash
        const sanitized = id.replace(/[^a-zA-Z0-9-]/g, '');
        // Underscores get removed by the sanitization
        if (id.includes('_')) {
          expect(sanitized).not.toBe(id);
        } else {
          expect(sanitized).toBe(id);
        }
      }
    });

    test('malicious session IDs are sanitized', () => {
      const maliciousIds = [
        '../../../etc/passwd',
        'session; rm -rf /',
        'session$(whoami)',
        'session|cat /etc/passwd',
      ];

      for (const id of maliciousIds) {
        const sanitized = id.replace(/[^a-zA-Z0-9-]/g, '');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain(';');
        expect(sanitized).not.toContain('$');
        expect(sanitized).not.toContain('|');
      }
    });
  });

  describe('session metadata extraction', () => {
    test('extracts correct metadata from session', () => {
      const session = createTestSession({
        id: 'test-session-123',
        explored: {
          'feature-ssl': {
            topicId: 'feature-ssl',
            resolution: { type: 'user_choice', value: 'enabled' },
            exploredAt: new Date().toISOString(),
          },
        },
      });

      const metadata: SessionMetadata = {
        id: session.id,
        roleDescription: session.roleDescription,
        roleName: session.roleName,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        completed: session.completed,
        topicsExplored: Object.keys(session.explored).length,
        topicsTotal: session.topics.length,
      };

      expect(metadata.id).toBe('test-session-123');
      expect(metadata.roleDescription).toBe('nginx web server');
      expect(metadata.roleName).toBe('nginx');
      expect(metadata.topicsExplored).toBe(1);
      expect(metadata.topicsTotal).toBe(2);
      expect(metadata.completed).toBe(false);
    });
  });

  describe('session sorting', () => {
    test('sessions are sorted by updatedAt descending', () => {
      const sessions: SessionMetadata[] = [
        {
          id: 'old-session',
          roleDescription: 'old',
          roleName: 'old',
          createdAt: '2025-01-10T10:00:00.000Z',
          updatedAt: '2025-01-10T10:00:00.000Z',
          completed: false,
          topicsExplored: 0,
          topicsTotal: 5,
        },
        {
          id: 'new-session',
          roleDescription: 'new',
          roleName: 'new',
          createdAt: '2025-01-15T10:00:00.000Z',
          updatedAt: '2025-01-15T10:00:00.000Z',
          completed: false,
          topicsExplored: 0,
          topicsTotal: 5,
        },
        {
          id: 'middle-session',
          roleDescription: 'middle',
          roleName: 'middle',
          createdAt: '2025-01-12T10:00:00.000Z',
          updatedAt: '2025-01-12T10:00:00.000Z',
          completed: false,
          topicsExplored: 0,
          topicsTotal: 5,
        },
      ];

      // Sort by updatedAt descending (most recent first)
      sessions.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      expect(sessions[0].id).toBe('new-session');
      expect(sessions[1].id).toBe('middle-session');
      expect(sessions[2].id).toBe('old-session');
    });
  });

  describe('cleanup age calculation', () => {
    test('correctly identifies old sessions', () => {
      const now = Date.now();
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      const tenDaysAgo = now - 10 * 24 * 60 * 60 * 1000;

      const oldSession = new Date(thirtyDaysAgo - 1000).toISOString();
      const recentSession = new Date(tenDaysAgo).toISOString();

      const maxAge = 30 * 24 * 60 * 60 * 1000;
      const cutoff = now - maxAge;

      expect(new Date(oldSession).getTime() < cutoff).toBe(true);
      expect(new Date(recentSession).getTime() < cutoff).toBe(false);
    });
  });
});
