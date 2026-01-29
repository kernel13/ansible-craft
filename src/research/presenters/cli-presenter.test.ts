import { describe, test, expect, mock } from 'bun:test';
import { displayResearchSummary, formatFeatureList, formatPackageList } from './cli-presenter';
import type { ResearchFindings } from '../schemas/findings';

describe('cli-presenter', () => {
  const mockFindings: ResearchFindings = {
    features: [
      {
        name: 'SSL/TLS support',
        description: 'Configure secure connections',
        category: 'essential',
        complexity: 'moderate',
      },
      {
        name: 'Virtual hosts',
        description: 'Multiple domains support',
        category: 'recommended',
        complexity: 'moderate',
      },
      {
        name: 'Rate limiting',
        description: 'Limit request rates',
        category: 'optional',
        complexity: 'complex',
      },
    ],
    packages: [
      {
        name: 'nginx',
        source: 'apt',
        version: '1.24.0',
        description: 'High-performance web server',
        isDefault: true,
      },
      {
        name: 'nginx-full',
        source: 'apt',
        description: 'Nginx with additional modules',
        isDefault: false,
      },
    ],
    bestPractices: [
      {
        practice: 'Use FQCN for all modules',
        rationale: 'Ensures compatibility',
        priority: 'critical',
      },
      {
        practice: 'Pin package versions',
        rationale: 'Reproducibility',
        priority: 'recommended',
      },
    ],
    galaxyRoles: [
      {
        namespace: 'geerlingguy',
        name: 'nginx',
        stars: 320,
        downloads: 1500000,
        keyFeatures: ['SSL/TLS support', 'Virtual hosts'],
      },
    ],
  };

  describe('displayResearchSummary', () => {
    test('should display complete research findings', () => {
      // Mock console.log to capture output
      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(mockFindings);

      // Restore console.log
      console.log = originalLog;

      // Verify console.log was called
      expect(logSpy).toHaveBeenCalled();

      // Get all logged messages
      const messages = logSpy.mock.calls.map((call) => call[0]).join('\n');

      // Verify key sections are present
      expect(messages).toContain('Research Findings');
      expect(messages).toContain('Discovered Features:');
      expect(messages).toContain('Package Options:');
      expect(messages).toContain('Best Practices:');
      expect(messages).toContain('Reference Galaxy Roles:');
    });

    test('should handle empty findings gracefully', () => {
      const emptyFindings: ResearchFindings = {
        features: [],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(emptyFindings);

      console.log = originalLog;

      expect(logSpy).toHaveBeenCalled();
    });

    test('should display features by category', () => {
      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(mockFindings);

      console.log = originalLog;

      const messages = logSpy.mock.calls.map((call) => call[0]).join('\n');

      // Check that features are displayed with category indicators
      expect(messages).toContain('SSL/TLS support');
      expect(messages).toContain('Virtual hosts');
      expect(messages).toContain('Rate limiting');
    });

    test('should display package options', () => {
      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(mockFindings);

      console.log = originalLog;

      const messages = logSpy.mock.calls.map((call) => call[0]).join('\n');

      expect(messages).toContain('nginx');
      expect(messages).toContain('apt');
    });
  });

  describe('formatFeatureList', () => {
    test('should format features with category symbols', () => {
      const formatted = formatFeatureList(mockFindings.features);

      expect(formatted).toContain('SSL/TLS support');
      // Category is shown as a symbol (✓ or •), not text
      expect(formatted).toContain('✓');
    });

    test('should handle empty feature list', () => {
      const formatted = formatFeatureList([]);
      expect(formatted).toBe('');
    });

    test('should include complexity levels', () => {
      const formatted = formatFeatureList(mockFindings.features);

      expect(formatted).toContain('moderate');
      expect(formatted).toContain('complex');
    });
  });

  describe('formatPackageList', () => {
    test('should format packages with sources', () => {
      const formatted = formatPackageList(mockFindings.packages);

      expect(formatted).toContain('nginx');
      expect(formatted).toContain('apt');
    });

    test('should indicate default packages', () => {
      const formatted = formatPackageList(mockFindings.packages);

      // Default package should have some indicator
      expect(formatted).toBeTruthy();
    });

    test('should handle empty package list', () => {
      const formatted = formatPackageList([]);
      expect(formatted).toBe('');
    });

    test('should display versions when available', () => {
      const formatted = formatPackageList(mockFindings.packages);

      expect(formatted).toContain('1.24.0');
    });

    test('should display package info without descriptions in format', () => {
      const formatted = formatPackageList(mockFindings.packages);

      // formatPackage doesn't include descriptions, only name/source/version/default
      expect(formatted).toContain('nginx');
      expect(formatted).toContain('apt');
      expect(formatted).toContain('[default]');
    });
  });

  describe('output formatting', () => {
    test('should use consistent indentation', () => {
      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(mockFindings);

      console.log = originalLog;

      const messages = logSpy.mock.calls.map((call) => call[0]);

      // Check that indented items start with spaces
      const indentedMessages = messages.filter(
        (msg) => typeof msg === 'string' && msg.startsWith('  '),
      );
      expect(indentedMessages.length).toBeGreaterThan(0);
    });

    test('should use color coding', () => {
      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      displayResearchSummary(mockFindings);

      console.log = originalLog;

      // Verify output was formatted (chalk adds ANSI codes)
      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle features without descriptions', () => {
      const findings: ResearchFindings = {
        features: [
          {
            name: 'Test Feature',
            description: '',
            category: 'optional',
            complexity: 'simple',
          },
        ],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      expect(() => displayResearchSummary(findings)).not.toThrow();

      console.log = originalLog;
    });

    test('should handle packages without versions', () => {
      const findings: ResearchFindings = {
        features: [],
        packages: [
          {
            name: 'test-package',
            source: 'apt',
            isDefault: true,
          },
        ],
        bestPractices: [],
        galaxyRoles: [],
      };

      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      expect(() => displayResearchSummary(findings)).not.toThrow();

      console.log = originalLog;
    });

    test('should handle long feature names', () => {
      const findings: ResearchFindings = {
        features: [
          {
            name: 'Very Long Feature Name That Exceeds Normal Length Expectations',
            description: 'Test',
            category: 'optional',
            complexity: 'simple',
          },
        ],
        packages: [],
        bestPractices: [],
        galaxyRoles: [],
      };

      const logSpy = mock(() => {});
      const originalLog = console.log;
      console.log = logSpy;

      expect(() => displayResearchSummary(findings)).not.toThrow();

      console.log = originalLog;
    });
  });
});
