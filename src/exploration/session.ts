/**
 * Session persistence for exploration workflow.
 *
 * Allows users to save and resume exploration sessions.
 */

import { readFile, writeFile, readdir, unlink, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import type { ExplorationSession } from './types.js';
import { explorationSessionSchema } from './types.js';

// ============================================
// Configuration
// ============================================

/**
 * Get the sessions directory path.
 */
export function getSessionsDir(): string {
  return join(homedir(), '.config', 'ansible-craft', 'sessions');
}

/**
 * Get the path for a specific session file.
 */
function getSessionPath(sessionId: string): string {
  // Sanitize session ID to prevent path traversal
  const sanitized = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  return join(getSessionsDir(), `${sanitized}.json`);
}

// ============================================
// Session Operations
// ============================================

/**
 * Ensure the sessions directory exists.
 */
async function ensureSessionsDir(): Promise<void> {
  const dir = getSessionsDir();
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    // Directory may already exist
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * Save an exploration session to disk.
 *
 * @param session - The session to save
 * @returns The session ID
 */
export async function saveSession(session: ExplorationSession): Promise<string> {
  await ensureSessionsDir();

  const path = getSessionPath(session.id);
  const data = JSON.stringify(session, null, 2);

  await writeFile(path, data, 'utf-8');

  return session.id;
}

/**
 * Load an exploration session from disk.
 *
 * @param sessionId - The session ID to load
 * @returns The session or null if not found
 */
export async function loadSession(sessionId: string): Promise<ExplorationSession | null> {
  const path = getSessionPath(sessionId);

  try {
    const data = await readFile(path, 'utf-8');
    const parsed = JSON.parse(data);

    // Validate with Zod schema
    const result = explorationSessionSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }

    console.warn(`Session ${sessionId} failed validation:`, result.error.message);
    return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Session metadata for listing.
 */
export interface SessionMetadata {
  id: string;
  roleDescription: string;
  roleName: string;
  createdAt: string;
  updatedAt: string;
  completed: boolean;
  topicsExplored: number;
  topicsTotal: number;
}

/**
 * List all saved sessions.
 *
 * @returns Array of session metadata
 */
export async function listSessions(): Promise<SessionMetadata[]> {
  const dir = getSessionsDir();

  try {
    const files = await readdir(dir);
    const sessions: SessionMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const sessionId = file.replace('.json', '');
      const session = await loadSession(sessionId);

      if (session) {
        sessions.push({
          id: session.id,
          roleDescription: session.roleDescription,
          roleName: session.roleName,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          completed: session.completed,
          topicsExplored: Object.keys(session.explored).length,
          topicsTotal: session.topics.length,
        });
      }
    }

    // Sort by updatedAt descending (most recent first)
    sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return sessions;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Delete a saved session.
 *
 * @param sessionId - The session ID to delete
 * @returns true if deleted, false if not found
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  const path = getSessionPath(sessionId);

  try {
    await unlink(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Clean up old sessions (older than maxAge days).
 *
 * @param maxAgeDays - Maximum age in days (default 30)
 * @returns Number of sessions deleted
 */
export async function cleanupOldSessions(maxAgeDays: number = 30): Promise<number> {
  const sessions = await listSessions();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
  const cutoff = Date.now() - maxAge;

  let deleted = 0;

  for (const session of sessions) {
    const updatedAt = new Date(session.updatedAt).getTime();
    if (updatedAt < cutoff) {
      const success = await deleteSession(session.id);
      if (success) deleted++;
    }
  }

  return deleted;
}

/**
 * Find the most recent incomplete session for a role name.
 *
 * @param roleName - The role name to search for
 * @returns The session ID or null
 */
export async function findRecentSession(roleName: string): Promise<string | null> {
  const sessions = await listSessions();

  // Find most recent incomplete session for this role
  const matching = sessions.find(
    (s) => s.roleName === roleName && !s.completed,
  );

  return matching?.id || null;
}

/**
 * Check if a session exists.
 *
 * @param sessionId - The session ID to check
 * @returns true if exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  const path = getSessionPath(sessionId);

  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Session Formatting
// ============================================

/**
 * Format session metadata for display.
 */
export function formatSessionMetadata(session: SessionMetadata): string {
  const progress = `${session.topicsExplored}/${session.topicsTotal} topics`;
  const status = session.completed ? '✓ Complete' : '○ In progress';
  const date = new Date(session.updatedAt).toLocaleDateString();

  return `[${session.id.slice(0, 8)}] ${session.roleDescription} (${session.roleName}) - ${progress} - ${status} - ${date}`;
}

/**
 * Format all sessions for listing.
 */
export function formatSessionsList(sessions: SessionMetadata[]): string {
  if (sessions.length === 0) {
    return 'No saved sessions found.';
  }

  const lines = ['Saved exploration sessions:', ''];

  for (const session of sessions) {
    lines.push(`  ${formatSessionMetadata(session)}`);
  }

  return lines.join('\n');
}
