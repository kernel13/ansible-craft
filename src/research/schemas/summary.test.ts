import { describe, test, expect } from 'bun:test';
import { ResearchSummary } from './summary';
import type { ResearchFindings } from './findings';

describe('ResearchSummary', () => {
  const mockDocFindings: ResearchFindings = {
    features: [
      {
        name: 'SSL/TLS support',
        description: 'Configure secure connections',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'Virtual hosts',
        description: 'Multiple domains support',
        category: 'recommended',
        complexity: 'moderate',
      },
    ],
    packages: [],
    bestPractices: [
      {
        practice: 'Use FQCN for modules',
        rationale: 'Ensures compatibility',
        priority: 'critical',
      },
    ],
    galaxyRoles: [
      {
        namespace: 'geerlingguy',
        name: 'nginx',
        stars: 320,
        downloads: 1500000,
        keyFeatures: ['SSL/TLS support'],
      },
    ],
  };

  const mockImplFindings: ResearchFindings = {
    features: [
      {
        name: 'Package installation',
        description: 'Install via package manager',
        category: 'essential',
        complexity: 'simple',
      },
    ],
    packages: [
      {
        name: 'nginx',
        source: 'apt',
        version: '1.24.0',
        isDefault: true,
      },
      {
        name: 'nginx-full',
        source: 'apt',
        isDefault: false,
      },
    ],
    bestPractices: [
      {
        practice: 'Pin package versions',
        rationale: 'Reproducibility',
        priority: 'recommended',
      },
    ],
    galaxyRoles: [],
  };

  const mockDeepDiveFindings: ResearchFindings = {
    features: [
      {
        name: 'Self-signed certificates',
        description: 'Generate self-signed certs',
        category: 'optional',
        complexity: 'simple',
      },
      {
        name: "Let's Encrypt",
        description: 'Auto-provision certificates',
        category: 'recommended',
        complexity: 'moderate',
      },
    ],
    packages: [],
    bestPractices: [
      {
        practice: 'Use strong cipher suites',
        rationale: 'Security',
        priority: 'critical',
      },
    ],
    galaxyRoles: [],
  };

  describe('constructor', () => {
    test('should create summary without deep dive', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings);

      expect(summary.documentationFindings).toEqual(mockDocFindings);
      expect(summary.implementationFindings).toEqual(mockImplFindings);
      expect(summary.deepdiveFindings).toBeUndefined();
      expect(summary.selectedFeatures).toEqual([]);
    });

    test('should create summary with deep dive', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, mockDeepDiveFindings, [
        'SSL/TLS support',
      ]);

      expect(summary.deepdiveFindings).toEqual(mockDeepDiveFindings);
      expect(summary.selectedFeatures).toEqual(['SSL/TLS support']);
    });
  });

  describe('getAllFeatures', () => {
    test('should merge features from all sources', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, mockDeepDiveFindings);

      const features = summary.getAllFeatures();

      // Should have features from all three sources
      expect(features.length).toBe(5); // 2 + 1 + 2
      expect(features.some((f) => f.name === 'SSL/TLS support')).toBe(true);
      expect(features.some((f) => f.name === 'Package installation')).toBe(true);
      expect(features.some((f) => f.name === 'Self-signed certificates')).toBe(true);
    });

    test('should deduplicate features by name', () => {
      const duplicateDocFindings: ResearchFindings = {
        ...mockDocFindings,
        features: [
          ...mockDocFindings.features,
          {
            name: 'SSL/TLS support', // Duplicate
            description: 'Different description',
            category: 'essential',
            complexity: 'complex',
          },
        ],
      };

      const summary = new ResearchSummary(duplicateDocFindings, mockImplFindings);
      const features = summary.getAllFeatures();

      const sslFeatures = features.filter((f) => f.name === 'SSL/TLS support');
      expect(sslFeatures).toHaveLength(1);
    });

    test('should work without deep dive findings', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings);
      const features = summary.getAllFeatures();

      expect(features.length).toBe(3); // 2 + 1
    });
  });

  describe('getAllPackages', () => {
    test('should merge packages from all sources', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings);
      const packages = summary.getAllPackages();

      expect(packages.length).toBe(2);
      expect(packages.some((p) => p.name === 'nginx')).toBe(true);
      expect(packages.some((p) => p.name === 'nginx-full')).toBe(true);
    });

    test('should deduplicate packages by name and source', () => {
      const duplicateImplFindings: ResearchFindings = {
        ...mockImplFindings,
        packages: [
          ...mockImplFindings.packages,
          {
            name: 'nginx', // Duplicate name+source
            source: 'apt',
            version: '1.25.0',
            isDefault: false,
          },
        ],
      };

      const summary = new ResearchSummary(mockDocFindings, duplicateImplFindings);
      const packages = summary.getAllPackages();

      const nginxAptPackages = packages.filter((p) => p.name === 'nginx' && p.source === 'apt');
      expect(nginxAptPackages).toHaveLength(1);
    });

    test('should allow same name with different sources', () => {
      const multiSourceFindings: ResearchFindings = {
        ...mockImplFindings,
        packages: [
          ...mockImplFindings.packages,
          {
            name: 'nginx',
            source: 'yum',
            isDefault: true,
          },
        ],
      };

      const summary = new ResearchSummary(mockDocFindings, multiSourceFindings);
      const packages = summary.getAllPackages();

      const nginxPackages = packages.filter((p) => p.name === 'nginx');
      expect(nginxPackages.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAllBestPractices', () => {
    test('should merge best practices from all sources', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, mockDeepDiveFindings);

      const practices = summary.getAllBestPractices();

      expect(practices.length).toBe(3); // 1 + 1 + 1
      expect(practices.some((p) => p.practice === 'Use FQCN for modules')).toBe(true);
      expect(practices.some((p) => p.practice === 'Pin package versions')).toBe(true);
      expect(practices.some((p) => p.practice === 'Use strong cipher suites')).toBe(true);
    });

    test('should deduplicate practices by practice text', () => {
      const duplicateDocFindings: ResearchFindings = {
        ...mockDocFindings,
        bestPractices: [
          ...mockDocFindings.bestPractices,
          {
            practice: 'Use FQCN for modules', // Duplicate
            rationale: 'Different rationale',
            priority: 'recommended',
          },
        ],
      };

      const summary = new ResearchSummary(duplicateDocFindings, mockImplFindings);
      const practices = summary.getAllBestPractices();

      const fqcnPractices = practices.filter((p) => p.practice === 'Use FQCN for modules');
      expect(fqcnPractices).toHaveLength(1);
    });

    test('should prioritize critical practices', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, mockDeepDiveFindings);

      const practices = summary.getAllBestPractices();

      // Critical practices should appear first
      const criticalPractices = practices.filter((p) => p.priority === 'critical');
      const firstPractice = practices[0];

      if (criticalPractices.length > 0) {
        expect(firstPractice.priority).toBe('critical');
      }
    });
  });

  describe('getAllGalaxyRoles', () => {
    test('should return Galaxy roles from documentation findings', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings);
      const roles = summary.getAllGalaxyRoles();

      expect(roles.length).toBe(1);
      expect(roles[0].namespace).toBe('geerlingguy');
      expect(roles[0].name).toBe('nginx');
    });

    test('should deduplicate roles by namespace and name', () => {
      const duplicateDocFindings: ResearchFindings = {
        ...mockDocFindings,
        galaxyRoles: [
          ...mockDocFindings.galaxyRoles,
          {
            namespace: 'geerlingguy',
            name: 'nginx',
            stars: 325,
            downloads: 1600000,
            keyFeatures: [],
          },
        ],
      };

      const summary = new ResearchSummary(duplicateDocFindings, mockImplFindings);
      const roles = summary.getAllGalaxyRoles();

      const nginxRoles = roles.filter((r) => r.namespace === 'geerlingguy' && r.name === 'nginx');
      expect(nginxRoles).toHaveLength(1);
    });
  });

  describe('edge cases', () => {
    test('should handle empty findings', () => {
      const emptyFindings: ResearchFindings = {
        features: [],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const summary = new ResearchSummary(emptyFindings, emptyFindings);

      expect(summary.getAllFeatures()).toEqual([]);
      expect(summary.getAllPackages()).toEqual([]);
      expect(summary.getAllBestPractices()).toEqual([]);
      expect(summary.getAllGalaxyRoles()).toEqual([]);
    });

    test('should handle undefined deep dive findings', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, undefined);

      expect(summary.deepdiveFindings).toBeUndefined();
      expect(() => summary.getAllFeatures()).not.toThrow();
    });

    test('should handle empty selected features', () => {
      const summary = new ResearchSummary(mockDocFindings, mockImplFindings, undefined, []);

      expect(summary.selectedFeatures).toEqual([]);
    });
  });
});
