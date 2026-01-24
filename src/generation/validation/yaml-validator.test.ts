import { describe, expect, test } from 'bun:test';
import { loadFixture } from '../../__test-utils__/index.js';
import type { GeneratedFile } from '../role/parser.js';
import { type YamlValidationError, validateYamlSyntax } from './yaml-validator.js';

describe('validateYamlSyntax', () => {
  describe('valid YAML', () => {
    test('should return null for valid YAML syntax', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: loadFixture('yaml/valid-task.yaml'),
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test('should return null for valid multi-task YAML', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: loadFixture('yaml/valid-tasks-fqcn.yaml'),
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });

  describe('invalid YAML', () => {
    test('should return error for malformed syntax', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: loadFixture('yaml/invalid-syntax.yaml'),
      };

      const result = validateYamlSyntax(file);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('yaml-syntax');
      expect(result?.path).toBe('tasks/main.yml');
      expect(result?.message).toBeDefined();
    });

    test('should include line number in error when available', () => {
      const file: GeneratedFile = {
        path: 'tasks/broken.yml',
        content: 'key: [unclosed',
      };

      const result = validateYamlSyntax(file);
      expect(result).not.toBeNull();
      expect(result?.line).toBeDefined();
    });
  });

  describe('non-YAML files', () => {
    test('should skip non-YAML files and return null', () => {
      const file: GeneratedFile = {
        path: 'README.md',
        content: '# This is markdown [with [brackets',
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test('should skip .j2 template files', () => {
      const file: GeneratedFile = {
        path: 'templates/config.conf.j2',
        content: '{{ invalid_jinja',
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('should handle empty YAML file', () => {
      const file: GeneratedFile = {
        path: 'tasks/empty.yml',
        content: '',
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull(); // Empty is valid YAML
    });

    test('should handle YAML with only comments', () => {
      const file: GeneratedFile = {
        path: 'tasks/comments.yml',
        content: '# Just a comment\n# Another comment',
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });

    test('should accept .yaml extension', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yaml',
        content: 'key: value',
      };

      const result = validateYamlSyntax(file);
      expect(result).toBeNull();
    });
  });
});
