import { describe, expect, test } from 'bun:test';
import { type GeneratedFile, countFiles, hasFileMarkers, parseGeneratedFiles } from './parser.js';

describe('parseGeneratedFiles', () => {
  describe('valid output parsing', () => {
    test('should parse single file block', () => {
      const output = `
=== PATH: tasks/main.yml ===
---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('tasks/main.yml');
      expect(files[0].content).toContain('Install nginx');
    });

    test('should parse multiple file blocks', () => {
      const output = `
=== PATH: tasks/main.yml ===
- name: Task 1
=== END ===

=== PATH: defaults/main.yml ===
nginx_port: 80
=== END ===

=== PATH: handlers/main.yml ===
- name: Restart nginx
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(3);
      expect(files.map((f) => f.path)).toEqual([
        'tasks/main.yml',
        'defaults/main.yml',
        'handlers/main.yml',
      ]);
    });

    test('should trim whitespace from content', () => {
      const output = `
=== PATH: tasks/main.yml ===

  content here

=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files[0].content).toBe('content here');
    });
  });

  describe('security filtering', () => {
    test('should skip paths with directory traversal', () => {
      const output = `
=== PATH: ../../../etc/passwd ===
malicious content
=== END ===

=== PATH: tasks/main.yml ===
safe content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].path).toBe('tasks/main.yml');
    });

    test('should skip absolute paths', () => {
      const output = `
=== PATH: /etc/passwd ===
malicious content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(0);
    });

    test('should skip empty paths', () => {
      const output = `
=== PATH:  ===
content
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should return empty array for no markers', () => {
      const output = 'Just some text without markers';
      const files = parseGeneratedFiles(output);
      expect(files).toEqual([]);
    });

    test('should return empty array for empty string', () => {
      const files = parseGeneratedFiles('');
      expect(files).toEqual([]);
    });

    test('should handle nested content with special chars', () => {
      const output = `
=== PATH: templates/config.yml.j2 ===
{{ nginx_port }}
{% if ssl_enabled %}
ssl: true
{% endif %}
=== END ===
`;

      const files = parseGeneratedFiles(output);
      expect(files.length).toBe(1);
      expect(files[0].content).toContain('{{ nginx_port }}');
    });
  });
});

describe('hasFileMarkers', () => {
  test('should return true for output with markers', () => {
    expect(hasFileMarkers('=== PATH: tasks/main.yml ===')).toBe(true);
  });

  test('should return false for output without markers', () => {
    expect(hasFileMarkers('Just regular text')).toBe(false);
  });

  test('should return false for empty string', () => {
    expect(hasFileMarkers('')).toBe(false);
  });
});

describe('countFiles', () => {
  test('should count file markers correctly', () => {
    const output = `
=== PATH: file1.yml ===
content
=== END ===
=== PATH: file2.yml ===
content
=== END ===
=== PATH: file3.yml ===
content
=== END ===
`;

    expect(countFiles(output)).toBe(3);
  });

  test('should return 0 for no markers', () => {
    expect(countFiles('no markers here')).toBe(0);
  });
});
