/**
 * Package repository search utility.
 *
 * Searches system package managers (apt, yum/dnf, choco) to
 * discover available packages for role installation.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Package, PackageSource } from '../schemas/findings.js';

const execAsync = promisify(exec);

// ============================================
// Configuration
// ============================================

const COMMAND_TIMEOUT = 5000; // 5 seconds
const MAX_RESULTS = 10; // Limit results per package manager

// ============================================
// Types
// ============================================

/**
 * Available package managers on the system.
 */
export interface AvailablePackageManagers {
  apt: boolean;
  yum: boolean;
  dnf: boolean;
  choco: boolean;
}

// ============================================
// Main Functions
// ============================================

/**
 * Detect available package managers on the system.
 *
 * @returns Object indicating which package managers are available
 *
 * @example
 * ```typescript
 * const managers = await detectPackageManagers();
 * if (managers.apt) {
 *   // Search apt repositories
 * }
 * ```
 */
export async function detectPackageManagers(): Promise<AvailablePackageManagers> {
  const managers: AvailablePackageManagers = {
    apt: false,
    yum: false,
    dnf: false,
    choco: false,
  };

  // Check each package manager
  const checks = [
    { name: 'apt' as const, command: 'which apt-cache' },
    { name: 'yum' as const, command: 'which yum' },
    { name: 'dnf' as const, command: 'which dnf' },
    { name: 'choco' as const, command: 'where choco' }, // Windows
  ];

  await Promise.all(
    checks.map(async ({ name, command }) => {
      try {
        await execAsync(command, { timeout: 1000 });
        managers[name] = true;
      } catch {
        // Command failed - package manager not available
      }
    }),
  );

  return managers;
}

/**
 * Search for packages matching a query.
 *
 * Searches all available package managers and returns consolidated results.
 *
 * @param query - Package search query (e.g., "nginx", "postgresql")
 * @returns Array of discovered packages
 *
 * @example
 * ```typescript
 * const packages = await searchPackages('nginx');
 * // Returns packages from apt, yum, etc.
 * ```
 */
export async function searchPackages(query: string): Promise<Package[]> {
  // Sanitize query to prevent command injection
  const sanitized = sanitizeQuery(query);
  if (!sanitized) {
    return [];
  }

  const managers = await detectPackageManagers();
  const results: Package[] = [];

  // Search each available package manager
  const searches = [];

  if (managers.apt) {
    searches.push(searchApt(sanitized));
  }
  if (managers.dnf) {
    searches.push(searchDnf(sanitized));
  } else if (managers.yum) {
    searches.push(searchYum(sanitized));
  }
  if (managers.choco) {
    searches.push(searchChoco(sanitized));
  }

  const allResults = await Promise.all(searches);

  for (const packages of allResults) {
    results.push(...packages);
  }

  // Deduplicate by name and return top results
  return deduplicatePackages(results).slice(0, MAX_RESULTS);
}

// ============================================
// Package Manager Specific Searches
// ============================================

/**
 * Search APT repositories (Debian/Ubuntu).
 */
async function searchApt(query: string): Promise<Package[]> {
  try {
    const { stdout } = await execAsync(`apt-cache search --names-only "^${query}"`, {
      timeout: COMMAND_TIMEOUT,
    });

    return parseAptOutput(stdout);
  } catch (error) {
    console.warn(`APT search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Parse APT search output.
 */
function parseAptOutput(output: string): Package[] {
  const packages: Package[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const match = /^(\S+)\s+-\s+(.+)$/.exec(line);
    if (match) {
      const [, name, description] = match;
      packages.push({
        name,
        source: 'apt',
        description,
        isDefault: packages.length === 0, // First result is default
      });
    }
  }

  return packages.slice(0, 5);
}

/**
 * Search DNF repositories (Fedora/RHEL 8+).
 */
async function searchDnf(query: string): Promise<Package[]> {
  try {
    const { stdout } = await execAsync(`dnf search "${query}" --quiet`, {
      timeout: COMMAND_TIMEOUT,
    });

    return parseDnfYumOutput(stdout, 'dnf');
  } catch (error) {
    console.warn(`DNF search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Search YUM repositories (RHEL/CentOS 7).
 */
async function searchYum(query: string): Promise<Package[]> {
  try {
    const { stdout } = await execAsync(`yum search "${query}" --quiet`, {
      timeout: COMMAND_TIMEOUT,
    });

    return parseDnfYumOutput(stdout, 'yum');
  } catch (error) {
    console.warn(`YUM search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
}

/**
 * Parse DNF/YUM search output.
 */
function parseDnfYumOutput(output: string, source: 'dnf' | 'yum'): Package[] {
  const packages: Package[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const match = /^(\S+)\s*:\s*(.+)$/.exec(line);
    if (match) {
      const [, nameArch, description] = match;
      const name = nameArch.split('.')[0]; // Remove .x86_64 suffix

      packages.push({
        name,
        source,
        description,
        isDefault: packages.length === 0,
      });
    }
  }

  return packages.slice(0, 5);
}

/**
 * Search Chocolatey repositories (Windows).
 */
async function searchChoco(query: string): Promise<Package[]> {
  try {
    const { stdout } = await execAsync(`choco search "${query}" --limit-output`, {
      timeout: COMMAND_TIMEOUT,
    });

    return parseChocoOutput(stdout);
  } catch (error) {
    console.warn(
      `Chocolatey search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return [];
  }
}

/**
 * Parse Chocolatey search output.
 */
function parseChocoOutput(output: string): Package[] {
  const packages: Package[] = [];
  const lines = output.trim().split('\n');

  for (const line of lines) {
    const parts = line.split('|');
    if (parts.length >= 2) {
      const [name, version] = parts;
      packages.push({
        name,
        source: 'choco',
        version,
        isDefault: packages.length === 0,
      });
    }
  }

  return packages.slice(0, 5);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Sanitize search query to prevent command injection.
 *
 * @param query - Raw search query
 * @returns Sanitized query or null if invalid
 */
function sanitizeQuery(query: string): string | null {
  // Allow only alphanumeric, dash, underscore
  if (!/^[a-zA-Z0-9_-]+$/.test(query)) {
    console.warn(`Invalid package query: ${query}`);
    return null;
  }

  return query.toLowerCase();
}

/**
 * Deduplicate packages by name (keep first occurrence).
 */
function deduplicatePackages(packages: Package[]): Package[] {
  const seen = new Set<string>();
  return packages.filter((pkg) => {
    if (seen.has(pkg.name)) return false;
    seen.add(pkg.name);
    return true;
  });
}
