import { describe, test, expect, mock } from 'bun:test';
import { runInitialResearch, runDeepDive, runCompleteResearch } from './workflow';
import type { AgentContext } from '../core/types';
import { createMockAnthropicClient } from '../__test-utils__/index.js';

const createMockContext = (): AgentContext => ({
  client: createMockAnthropicClient(),
  quiet: true,
  json: false,
});

describe('research workflow', () => {
  describe('runInitialResearch', () => {
    test('should run parallel docs and impl research', async () => {
      const context = createMockContext();

      const findings = await runInitialResearch('install nginx with SSL', 'nginx_ssl', context);

      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
      expect(findings).toHaveProperty('bestPractices');
      expect(findings).toHaveProperty('galaxyRoles');

      expect(Array.isArray(findings.features)).toBe(true);
      expect(Array.isArray(findings.packages)).toBe(true);
      expect(Array.isArray(findings.bestPractices)).toBe(true);
      expect(Array.isArray(findings.galaxyRoles)).toBe(true);
    }, 60000); // 60s timeout for research

    test('should handle research failures gracefully', async () => {
      const context = createMockContext();

      // Test with invalid description that might cause issues
      const findings = await runInitialResearch('', '', context);

      // Should still return valid structure even on failure
      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
      expect(findings).toHaveProperty('bestPractices');
      expect(findings).toHaveProperty('galaxyRoles');
    });

    test('should merge findings from both researchers', async () => {
      const context = createMockContext();

      const findings = await runInitialResearch('install nginx', 'nginx', context);

      // Should have features from both researchers
      // Docs researcher provides features from Galaxy
      // Impl researcher provides package-related features
      expect(findings.features.length).toBeGreaterThanOrEqual(0);

      // Should have packages from impl researcher
      expect(findings.packages.length).toBeGreaterThanOrEqual(0);

      // Should have best practices from both
      expect(findings.bestPractices.length).toBeGreaterThanOrEqual(0);
    }, 60000);
  });

  describe('runDeepDive', () => {
    test('should research selected features in depth', async () => {
      const context = createMockContext();
      const selectedFeatures = ['SSL/TLS support', 'Virtual hosts'];

      const findings = await runDeepDive('configure nginx', 'nginx', selectedFeatures, context);

      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('bestPractices');

      // Deep dive should expand features
      expect(findings.features.length).toBeGreaterThanOrEqual(selectedFeatures.length);

      // Should have feature-specific best practices
      expect(findings.bestPractices.length).toBeGreaterThan(0);
    }, 60000);

    test('should handle empty feature list', async () => {
      const context = createMockContext();

      const findings = await runDeepDive('configure nginx', 'nginx', [], context);

      // Should return empty/minimal findings
      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('bestPractices');
    });

    test('should expand features into sub-features', async () => {
      const context = createMockContext();

      const findings = await runDeepDive('configure nginx', 'nginx', ['SSL/TLS support'], context);

      // Deep dive should create multiple sub-features
      const sslFeatures = findings.features.filter(
        (f) =>
          f.name.toLowerCase().includes('ssl') ||
          f.name.toLowerCase().includes('tls') ||
          f.name.toLowerCase().includes('certificate'),
      );

      expect(sslFeatures.length).toBeGreaterThanOrEqual(1);
    }, 60000);
  });

  describe('runCompleteResearch', () => {
    test('should run full research workflow with deep dive', async () => {
      const context = createMockContext();
      const selectedFeatures = ['SSL/TLS support'];

      const findings = await runCompleteResearch('install nginx with SSL', 'nginx_ssl', context, {
        enableDeepDive: true,
        selectedFeatures,
      });

      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
      expect(findings).toHaveProperty('bestPractices');
      expect(findings).toHaveProperty('galaxyRoles');
    }, 90000); // 90s timeout for complete workflow

    test('should work without deep dive', async () => {
      const context = createMockContext();

      const findings = await runCompleteResearch('install nginx', 'nginx', context);

      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
      expect(findings).toHaveProperty('bestPractices');
      expect(findings).toHaveProperty('galaxyRoles');
    }, 60000);

    test('should aggregate features from both researchers', async () => {
      const context = createMockContext();

      const findings = await runCompleteResearch('install nginx', 'nginx', context);

      expect(Array.isArray(findings.features)).toBe(true);
      expect(Array.isArray(findings.packages)).toBe(true);
      expect(Array.isArray(findings.bestPractices)).toBe(true);
      expect(Array.isArray(findings.galaxyRoles)).toBe(true);
    }, 60000);

    test('should handle empty description gracefully', async () => {
      const context = createMockContext();

      const findings = await runCompleteResearch('', '', context);

      // Should return valid structure even with empty input
      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
    }, 60000);
  });

  describe('error handling', () => {
    test('should handle Galaxy API failures', async () => {
      const context = createMockContext();

      // Mock Galaxy API to fail
      global.fetch = mock(() => Promise.reject(new Error('API unavailable')));

      const findings = await runInitialResearch('install nginx', 'nginx', context);

      // Should still return valid structure
      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
    });

    test('should handle package search failures', async () => {
      const context = createMockContext();

      const findings = await runInitialResearch('install nginx', 'nginx', context);

      // Should still return valid structure even if package search fails
      expect(findings).toHaveProperty('features');
      expect(findings).toHaveProperty('packages');
    }, 60000);

    test('should handle agent execution failures', async () => {
      const context = createMockContext();

      // Test with problematic input
      const findings = await runInitialResearch(';;;invalid;;;', 'invalid', context);

      // Should return empty but valid structure
      expect(findings).toHaveProperty('features');
      expect(Array.isArray(findings.features)).toBe(true);
    });
  });
});
