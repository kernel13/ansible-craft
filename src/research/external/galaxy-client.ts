/**
 * Ansible Galaxy API client.
 *
 * Searches Galaxy collections and roles to discover popular
 * implementations, patterns, and features.
 */

import type { GalaxyRole } from '../schemas/findings.js';

// ============================================
// Types
// ============================================

/**
 * Galaxy API search result for a collection/role.
 */
interface GalaxySearchResult {
  namespace: { name: string };
  name: string;
  download_count: number;
  community_score: number;
  description?: string;
}

/**
 * Galaxy API response structure.
 */
interface GalaxyApiResponse {
  data: GalaxySearchResult[];
  meta: {
    count: number;
  };
}

// ============================================
// Configuration
// ============================================

const GALAXY_API_BASE = 'https://galaxy.ansible.com/api/v3';
const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RESULTS = 10; // Top 10 roles

// ============================================
// Main Functions
// ============================================

/**
 * Search Galaxy for roles matching a query.
 *
 * @param query - Search query (e.g., "nginx", "mysql")
 * @returns Array of Galaxy roles with metrics
 *
 * @example
 * ```typescript
 * const roles = await searchGalaxyRoles('nginx');
 * // Returns top nginx roles with stars, downloads, etc.
 * ```
 */
export async function searchGalaxyRoles(query: string): Promise<GalaxyRole[]> {
  try {
    // Search for collections matching the query
    const searchUrl = new URL(`${GALAXY_API_BASE}/plugin/ansible/search/collection-versions/`);
    searchUrl.searchParams.set('keywords', query);
    searchUrl.searchParams.set('order_by', '-download_count');
    searchUrl.searchParams.set('limit', String(MAX_RESULTS));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const response = await fetch(searchUrl.toString(), {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Galaxy API returned ${response.status}: ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as GalaxyApiResponse;

    // Transform to our GalaxyRole format and enforce max results
    return data.data.slice(0, MAX_RESULTS).map((result) => ({
      namespace: result.namespace.name,
      name: result.name,
      stars: Math.round(result.community_score * 100), // Convert score to star-like metric
      downloads: result.download_count,
      keyFeatures: extractKeyFeatures(result.description || ''),
    }));
  } catch (error) {
    // Non-fatal: return empty array if Galaxy is unavailable
    console.warn(
      `Galaxy API search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return [];
  }
}

/**
 * Extract key features from role description.
 *
 * Uses simple heuristics to identify important features
 * mentioned in the description.
 *
 * @param description - Role description text
 * @returns Array of identified features
 */
export function extractKeyFeatures(description: string): string[] {
  const features: string[] = [];

  // Common feature keywords to look for
  const featurePatterns = [
    { pattern: /ssl|tls|https/i, feature: 'SSL/TLS support' },
    { pattern: /virtual\s+host|vhost/i, feature: 'Virtual hosts' },
    { pattern: /load\s+balanc/i, feature: 'Load balancing' },
    { pattern: /cache|caching/i, feature: 'Caching' },
    { pattern: /auth|authentication/i, feature: 'Authentication' },
    { pattern: /firewall|iptables/i, feature: 'Firewall configuration' },
    { pattern: /systemd|service/i, feature: 'Service management' },
    { pattern: /docker|container/i, feature: 'Container support' },
    { pattern: /cluster|ha|high.availability/i, feature: 'High availability' },
    { pattern: /backup/i, feature: 'Backup support' },
    { pattern: /monitor/i, feature: 'Monitoring' },
    { pattern: /log/i, feature: 'Logging' },
  ];

  for (const { pattern, feature } of featurePatterns) {
    if (pattern.test(description)) {
      features.push(feature);
    }
  }

  return features.slice(0, 5); // Limit to top 5 features
}

/**
 * Get popular features from top Galaxy roles.
 *
 * Analyzes top roles to identify commonly implemented features
 * that could be relevant for the user's role.
 *
 * @param query - Search query
 * @returns Array of popular feature names
 *
 * @example
 * ```typescript
 * const features = await getPopularFeatures('nginx');
 * // Returns: ['SSL/TLS support', 'Virtual hosts', ...]
 * ```
 */
export async function getPopularFeatures(query: string): Promise<string[]> {
  const roles = await searchGalaxyRoles(query);

  // Aggregate features from all roles
  const featureCount = new Map<string, number>();

  for (const role of roles) {
    for (const feature of role.keyFeatures) {
      featureCount.set(feature, (featureCount.get(feature) || 0) + 1);
    }
  }

  // Sort by frequency and return top features
  return Array.from(featureCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([feature]) => feature)
    .slice(0, 10); // Top 10 features
}

/**
 * Check if Galaxy API is available.
 *
 * @returns true if Galaxy API responds, false otherwise
 */
export async function isGalaxyAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${GALAXY_API_BASE}/`, {
      signal: controller.signal,
      method: 'HEAD',
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}
