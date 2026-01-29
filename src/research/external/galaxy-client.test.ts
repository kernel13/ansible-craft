import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { searchGalaxyRoles, extractKeyFeatures } from './galaxy-client';
import type { GalaxyRole } from '../schemas/findings';

// Mock fetch globally
const originalFetch = global.fetch;

describe('galaxy-client', () => {
  describe('searchGalaxyRoles', () => {
    beforeEach(() => {
      // Reset fetch mock
      global.fetch = originalFetch;
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    test('should search Galaxy API and return roles', async () => {
      const mockResponse = {
        data: [
          {
            namespace: { name: 'geerlingguy' },
            name: 'nginx',
            download_count: 1500000,
            community_score: 3.2,
            description: 'Installs and configures Nginx with SSL/TLS support',
          },
          {
            namespace: { name: 'jdauphant' },
            name: 'nginx',
            download_count: 500000,
            community_score: 2.8,
            description: 'Nginx with virtual host configuration',
          },
        ],
        meta: { count: 2 },
      };

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response),
      );

      const roles = await searchGalaxyRoles('nginx');

      expect(roles).toHaveLength(2);
      expect(roles[0]).toMatchObject({
        namespace: 'geerlingguy',
        name: 'nginx',
        stars: 320,
        downloads: 1500000,
      });
      expect(roles[0].keyFeatures).toContain('SSL/TLS support');
    });

    test('should handle API errors gracefully', async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response),
      );

      const roles = await searchGalaxyRoles('nginx');
      expect(roles).toEqual([]);
    });

    test('should handle network errors', async () => {
      global.fetch = mock(() => Promise.reject(new Error('Network error')));

      const roles = await searchGalaxyRoles('nginx');
      expect(roles).toEqual([]);
    });

    test('should handle timeout', async () => {
      global.fetch = mock(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ data: [], meta: { count: 0 } }),
              } as Response);
            }, 15000); // Longer than timeout
          }),
      );

      const roles = await searchGalaxyRoles('nginx');
      expect(roles).toEqual([]);
    });

    test('should limit results to max', async () => {
      const mockData = Array.from({ length: 20 }, (_, i) => ({
        namespace: { name: `user${i}` },
        name: 'nginx',
        download_count: 1000 - i,
        community_score: 3.0,
        description: 'Nginx role',
      }));

      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: mockData, meta: { count: 20 } }),
        } as Response),
      );

      const roles = await searchGalaxyRoles('nginx');
      expect(roles.length).toBeLessThanOrEqual(10);
    });
  });

  describe('extractKeyFeatures', () => {
    test('should extract SSL/TLS features', () => {
      const description = 'Nginx with SSL and TLS support for HTTPS';
      const features = extractKeyFeatures(description);
      expect(features).toContain('SSL/TLS support');
    });

    test('should extract virtual host features', () => {
      const description = 'Configure nginx with virtual hosts';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Virtual hosts');
    });

    test('should extract load balancing features', () => {
      const description = 'Nginx load balancer configuration';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Load balancing');
    });

    test('should extract caching features', () => {
      const description = 'Nginx with proxy caching enabled';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Caching');
    });

    test('should extract authentication features', () => {
      const description = 'Nginx with basic authentication';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Authentication');
    });

    test('should extract firewall features', () => {
      const description = 'Nginx with firewall rules';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Firewall configuration');
    });

    test('should extract service management features', () => {
      const description = 'Nginx with systemd service configuration';
      const features = extractKeyFeatures(description);
      expect(features).toContain('Service management');
    });

    test('should extract multiple features', () => {
      const description = 'Nginx with SSL support, virtual hosts, and load balancing capabilities';
      const features = extractKeyFeatures(description);
      expect(features).toContain('SSL/TLS support');
      expect(features).toContain('Virtual hosts');
      expect(features).toContain('Load balancing');
      expect(features.length).toBeGreaterThanOrEqual(3);
    });

    test('should return empty array for no features', () => {
      const description = 'Basic nginx installation';
      const features = extractKeyFeatures(description);
      expect(features).toEqual([]);
    });

    test('should not duplicate features', () => {
      const description = 'Nginx with SSL, TLS, and HTTPS support';
      const features = extractKeyFeatures(description);
      const sslFeatures = features.filter((f) => f === 'SSL/TLS support');
      expect(sslFeatures).toHaveLength(1);
    });
  });
});
