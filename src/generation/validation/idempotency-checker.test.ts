import { describe, test, expect } from "bun:test";
import { checkIdempotencyPatterns, type IdempotencyWarning } from "./idempotency-checker.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("checkIdempotencyPatterns", () => {
  describe("idempotent tasks", () => {
    test("should return empty array for properly idempotent tasks", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/idempotent-tasks.yaml"),
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should accept shell with creates argument", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Run setup
  ansible.builtin.shell: ./setup.sh
  args:
    creates: /var/setup-done`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should accept command with changed_when", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Check version
  ansible.builtin.command: cat /etc/version
  changed_when: false`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("non-idempotent tasks", () => {
    test("should detect shell without creates/removes/changed_when", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Run script
  ansible.builtin.shell: ./setup.sh`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].type).toBe("idempotency");
      expect(warnings[0].module).toBe("ansible.builtin.shell");
    });

    test("should detect apt without state parameter", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: `---
- name: Install nginx
  ansible.builtin.apt:
    name: nginx`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBe(1);
      expect(warnings[0].issue).toContain("without state");
    });

    test("should detect multiple idempotency issues", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: loadFixture("yaml/non-idempotent-tasks.yaml"),
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings.length).toBeGreaterThan(1);
    });
  });

  describe("file filtering", () => {
    test("should only check files in tasks/ directory", () => {
      const file: GeneratedFile = {
        path: "defaults/main.yml",
        content: `---
nginx_package: nginx`,
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should skip non-YAML files", () => {
      const file: GeneratedFile = {
        path: "tasks/README.md",
        content: "shell: run this",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });

  describe("edge cases", () => {
    test("should handle invalid YAML gracefully", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: "invalid: [yaml",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });

    test("should handle empty tasks file", () => {
      const file: GeneratedFile = {
        path: "tasks/main.yml",
        content: "---",
      };

      const warnings = checkIdempotencyPatterns(file);
      expect(warnings).toEqual([]);
    });
  });
});
