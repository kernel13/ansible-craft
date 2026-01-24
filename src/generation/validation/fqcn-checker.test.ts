import { describe, expect, test } from 'bun:test';
import { loadFixture } from '../../__test-utils__/index.js';
import type { GeneratedFile } from '../role/parser.js';
import { type FqcnWarning, checkFqcnCompliance } from './fqcn-checker.js';

describe('checkFqcnCompliance', () => {
  describe('FQCN-compliant files', () => {
    test('should return empty array for files using FQCN', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: loadFixture('yaml/valid-tasks-fqcn.yaml'),
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });

    test('should return empty array for community modules', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: `---
- name: Use community module
  community.general.docker_container:
    name: mycontainer
    state: started`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });

  describe('non-FQCN modules', () => {
    test('should detect short module names', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: loadFixture('yaml/non-fqcn.yaml'),
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0].type).toBe('fqcn');
    });

    test('should provide correct suggestion for apt', () => {
      const file: GeneratedFile = {
        path: 'tasks/install.yml',
        content: `---
- name: Install nginx
  apt:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].module).toBe('apt');
      expect(warnings[0].suggestion).toBe('ansible.builtin.apt');
      expect(warnings[0].line).toBe(3);
    });

    test('should detect multiple non-FQCN modules', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: `---
- name: Install
  apt:
    name: nginx
- name: Start
  service:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings.length).toBe(2);
      expect(warnings[0].module).toBe('apt');
      expect(warnings[1].module).toBe('service');
    });
  });

  describe('non-YAML files', () => {
    test('should skip non-YAML files', () => {
      const file: GeneratedFile = {
        path: 'README.md',
        content: 'apt: this is just text',
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });

  describe('edge cases', () => {
    test('should not flag apt in comments', () => {
      const file: GeneratedFile = {
        path: 'tasks/main.yml',
        content: `---
# Use apt: to install packages
- name: Install nginx
  ansible.builtin.apt:
    name: nginx`,
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });

    test('should handle empty file', () => {
      const file: GeneratedFile = {
        path: 'tasks/empty.yml',
        content: '',
      };

      const warnings = checkFqcnCompliance(file);
      expect(warnings).toEqual([]);
    });
  });
});
