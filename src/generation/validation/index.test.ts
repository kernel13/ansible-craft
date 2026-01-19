import { describe, test, expect } from "bun:test";
import {
  validateGeneratedFiles,
  type ValidationReport,
} from "./index.js";
import { loadFixture } from "../../__test-utils__/index.js";
import type { GeneratedFile } from "../role/parser.js";

describe("validateGeneratedFiles", () => {
  describe("valid files", () => {
    test("should return valid report for compliant files", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/valid-tasks-fqcn.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    test("should allow warnings on valid files", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/non-fqcn.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true); // Warnings don't invalidate
      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("invalid files", () => {
    test("should return invalid report for syntax errors", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: loadFixture("yaml/invalid-syntax.yaml"),
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    test("should skip further checks on files with syntax errors", () => {
      const files: GeneratedFile[] = [
        {
          path: "tasks/main.yml",
          content: "invalid: [yaml",
        },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      // Should not have FQCN/idempotency warnings since YAML is invalid
      expect(report.warnings.filter(w => w.type === "fqcn")).toHaveLength(0);
    });
  });

  describe("multiple files", () => {
    test("should validate all files in array", () => {
      const files: GeneratedFile[] = [
        { path: "tasks/main.yml", content: "---\n- name: Task" },
        { path: "defaults/main.yml", content: "nginx_port: 80" },
        { path: "handlers/main.yml", content: "---\n- name: Handler" },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(true);
    });

    test("should collect errors from multiple files", () => {
      const files: GeneratedFile[] = [
        { path: "tasks/main.yml", content: "invalid: [yaml" },
        { path: "handlers/main.yml", content: "also: [broken" },
      ];

      const report = validateGeneratedFiles(files);
      expect(report.valid).toBe(false);
      expect(report.errors.length).toBe(2);
    });
  });

  describe("empty input", () => {
    test("should handle empty file array", () => {
      const report = validateGeneratedFiles([]);
      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });
  });
});
