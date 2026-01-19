import { describe, test, expect } from "bun:test";
import { generateConfigToml } from "./writer.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type { Config } from "./schema.js";

describe("generateConfigToml", () => {
  describe("with API key", () => {
    test("should include API key in output", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        api: { key: "sk-ant-test-key" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('key = "sk-ant-test-key"');
    });
  });

  describe("without API key", () => {
    test("should have commented key placeholder", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        api: { key: undefined },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('# key = "sk-ant-');
    });
  });

  describe("defaults section", () => {
    test("should include model setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        defaults: { ...DEFAULT_CONFIG.defaults, model: "opus" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('model = "opus"');
    });

    test("should include complex setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        defaults: { ...DEFAULT_CONFIG.defaults, complex: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("complex = true");
    });
  });

  describe("output section", () => {
    test("should include format setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, format: "json" },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain('format = "json"');
    });

    test("should include verbose setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, verbose: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("verbose = true");
    });

    test("should include dry_run setting", () => {
      const config: Config = {
        ...DEFAULT_CONFIG,
        output: { ...DEFAULT_CONFIG.output, dry_run: true },
      };

      const toml = generateConfigToml(config);
      expect(toml).toContain("dry_run = true");
    });
  });

  describe("comments", () => {
    test("should include header comment", () => {
      const toml = generateConfigToml(DEFAULT_CONFIG);
      expect(toml).toContain("# ansible-craft configuration");
    });

    test("should include section comments", () => {
      const toml = generateConfigToml(DEFAULT_CONFIG);
      expect(toml).toContain("[api]");
      expect(toml).toContain("[defaults]");
      expect(toml).toContain("[output]");
    });
  });
});
