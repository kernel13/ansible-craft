import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createPlaybookStructure,
  playbookExists,
  PLAYBOOK_DIRECTORIES,
  REQUIRED_PLAYBOOK_FILES,
} from "./structure.js";

describe("createPlaybookStructure", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "ansible-craft-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("directory creation", () => {
    test("should create playbook root directory", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      expect(result.playbookDir).toBe(join(tempDir, "test-playbook"));
      expect(result.createdDirs).toContain(result.playbookDir);
    });

    test("should create group_vars directory", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      const dirs = await readdir(result.playbookDir);
      expect(dirs).toContain("group_vars");
    });

    test("should report all created directories", async () => {
      const result = await createPlaybookStructure({
        playbookName: "test-playbook",
        outputDir: tempDir,
      });

      // Root + group_vars = 2 directories
      expect(result.createdDirs.length).toBe(2);
    });
  });

  describe("dry run mode", () => {
    test("should not create directories in dry run", async () => {
      const result = await createPlaybookStructure({
        playbookName: "dry-run-playbook",
        outputDir: tempDir,
        dryRun: true,
      });

      const dirExists = await readdir(result.playbookDir).then(
        () => true,
        () => false
      );

      expect(dirExists).toBe(false);
    });

    test("should still report what would be created", async () => {
      const result = await createPlaybookStructure({
        playbookName: "dry-run-playbook",
        outputDir: tempDir,
        dryRun: true,
      });

      // Should report root + group_vars even though not created
      expect(result.createdDirs.length).toBe(2);
      expect(result.playbookDir).toBe(join(tempDir, "dry-run-playbook"));
    });
  });
});
