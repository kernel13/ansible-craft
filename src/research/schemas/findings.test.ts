import { describe, test, expect } from 'bun:test';
import {
  featureSchema,
  packageSchema,
  practiceSchema,
  galaxyRoleSchema,
  researchFindingsSchema,
  type Feature,
  type Package,
  type Practice,
  type GalaxyRole,
  type ResearchFindings,
} from './findings';

describe('research schemas', () => {
  describe('featureSchema', () => {
    test('should validate correct feature', () => {
      const feature: Feature = {
        name: 'SSL/TLS support',
        description: 'Configure secure connections',
        category: 'recommended',
        complexity: 'moderate',
      };

      const result = featureSchema.safeParse(feature);
      expect(result.success).toBe(true);
    });

    test('should reject invalid category', () => {
      const feature = {
        name: 'Test',
        description: 'Test feature',
        category: 'invalid',
        complexity: 'simple',
      };

      const result = featureSchema.safeParse(feature);
      expect(result.success).toBe(false);
    });

    test('should reject invalid complexity', () => {
      const feature = {
        name: 'Test',
        description: 'Test feature',
        category: 'essential',
        complexity: 'invalid',
      };

      const result = featureSchema.safeParse(feature);
      expect(result.success).toBe(false);
    });

    test('should require all fields', () => {
      const feature = {
        name: 'Test',
        description: 'Test feature',
      };

      const result = featureSchema.safeParse(feature);
      expect(result.success).toBe(false);
    });
  });

  describe('packageSchema', () => {
    test('should validate correct package', () => {
      const pkg: Package = {
        name: 'nginx',
        source: 'apt',
        version: '1.24.0',
        description: 'High-performance web server',
        isDefault: true,
      };

      const result = packageSchema.safeParse(pkg);
      expect(result.success).toBe(true);
    });

    test('should allow missing optional fields', () => {
      const pkg: Package = {
        name: 'nginx',
        source: 'apt',
        isDefault: false,
      };

      const result = packageSchema.safeParse(pkg);
      expect(result.success).toBe(true);
    });

    test('should reject invalid source', () => {
      const pkg = {
        name: 'nginx',
        source: 'invalid',
        isDefault: true,
      };

      const result = packageSchema.safeParse(pkg);
      expect(result.success).toBe(false);
    });

    test('should validate all package sources', () => {
      const sources = ['apt', 'yum', 'dnf', 'choco', 'pip', 'npm', 'gem'];

      for (const source of sources) {
        const pkg = {
          name: 'test-package',
          source,
          isDefault: false,
        };

        const result = packageSchema.safeParse(pkg);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('practiceSchema', () => {
    test('should validate correct practice', () => {
      const practice: Practice = {
        practice: 'Use FQCN for all modules',
        rationale: 'Ensures compatibility',
        priority: 'critical',
      };

      const result = practiceSchema.safeParse(practice);
      expect(result.success).toBe(true);
    });

    test('should reject invalid priority', () => {
      const practice = {
        practice: 'Test practice',
        rationale: 'Test rationale',
        priority: 'invalid',
      };

      const result = practiceSchema.safeParse(practice);
      expect(result.success).toBe(false);
    });

    test('should validate all priority levels', () => {
      const priorities = ['critical', 'recommended', 'optional'];

      for (const priority of priorities) {
        const practice = {
          practice: 'Test practice',
          rationale: 'Test rationale',
          priority,
        };

        const result = practiceSchema.safeParse(practice);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('galaxyRoleSchema', () => {
    test('should validate correct Galaxy role', () => {
      const role: GalaxyRole = {
        namespace: 'geerlingguy',
        name: 'nginx',
        stars: 320,
        downloads: 1500000,
        keyFeatures: ['SSL/TLS support', 'Virtual hosts'],
      };

      const result = galaxyRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    });

    test('should allow empty key features', () => {
      const role: GalaxyRole = {
        namespace: 'test',
        name: 'role',
        stars: 0,
        downloads: 0,
        keyFeatures: [],
      };

      const result = galaxyRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    });

    test('should require non-negative numbers', () => {
      const role = {
        namespace: 'test',
        name: 'role',
        stars: -1,
        downloads: 100,
        keyFeatures: [],
      };

      const result = galaxyRoleSchema.safeParse(role);
      expect(result.success).toBe(false);
    });
  });

  describe('researchFindingsSchema', () => {
    test('should validate complete research findings', () => {
      const findings: ResearchFindings = {
        features: [
          {
            name: 'SSL/TLS support',
            description: 'Configure secure connections',
            category: 'recommended',
            complexity: 'moderate',
          },
        ],
        packages: [
          {
            name: 'nginx',
            source: 'apt',
            isDefault: true,
          },
        ],
        bestPractices: [
          {
            practice: 'Use FQCN',
            rationale: 'Compatibility',
            priority: 'critical',
          },
        ],
        galaxyRoles: [
          {
            namespace: 'geerlingguy',
            name: 'nginx',
            stars: 320,
            downloads: 1500000,
            keyFeatures: [],
          },
        ],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(true);
    });

    test('should allow empty arrays', () => {
      const findings: ResearchFindings = {
        features: [],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(true);
    });

    test('should validate nested items', () => {
      const findings = {
        features: [
          {
            name: 'Test',
            description: 'Test',
            category: 'invalid', // Invalid category
            complexity: 'simple',
          },
        ],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(false);
    });

    test('should require all top-level arrays', () => {
      const findings = {
        features: [],
        packages: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(false);
    });
  });

  describe('data integrity', () => {
    test('should handle large feature lists', () => {
      const features = Array.from({ length: 100 }, (_, i) => ({
        name: `Feature ${i}`,
        description: `Description ${i}`,
        category: 'optional' as const,
        complexity: 'simple' as const,
      }));

      const findings: ResearchFindings = {
        features,
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(true);
    });

    test('should handle unicode in strings', () => {
      const findings: ResearchFindings = {
        features: [
          {
            name: 'SSL/TLS 支持',
            description: 'Configure secure connections with 中文',
            category: 'recommended',
            complexity: 'moderate',
          },
        ],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(true);
    });

    test('should handle special characters in package names', () => {
      const findings: ResearchFindings = {
        features: [],
        packages: [
          {
            name: 'nginx-full_1.24',
            source: 'apt',
            isDefault: true,
          },
        ],
        bestPractices: [],
        galaxyRoles: [],
      };

      const result = researchFindingsSchema.safeParse(findings);
      expect(result.success).toBe(true);
    });
  });
});
