import { describe, test, expect } from "bun:test";
import { sanitizeRoleName, inferRoleName, validateRoleName } from "./sanitize.js";

describe("sanitizeRoleName", () => {
  describe("basic sanitization", () => {
    test("should lowercase input", () => {
      expect(sanitizeRoleName("MyRole")).toBe("myrole");
    });

    test("should replace spaces with hyphens", () => {
      expect(sanitizeRoleName("my role")).toBe("my-role");
    });

    test("should replace underscores with hyphens", () => {
      expect(sanitizeRoleName("my_role")).toBe("my-role");
    });

    test("should remove special characters", () => {
      expect(sanitizeRoleName("my@role!")).toBe("myrole");
    });

    test("should collapse multiple hyphens", () => {
      expect(sanitizeRoleName("my--role")).toBe("my-role");
    });

    test("should remove leading/trailing hyphens", () => {
      expect(sanitizeRoleName("-my-role-")).toBe("my-role");
    });
  });

  describe("length limits", () => {
    test("should truncate to 50 characters", () => {
      const longName = "a".repeat(60);
      const result = sanitizeRoleName(longName);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    test("should not leave trailing hyphen after truncation", () => {
      const name = "a".repeat(49) + "-b";
      const result = sanitizeRoleName(name);
      expect(result.endsWith("-")).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should handle empty string", () => {
      expect(sanitizeRoleName("")).toBe("");
    });

    test("should handle string with only special chars", () => {
      expect(sanitizeRoleName("@#$%")).toBe("");
    });
  });
});

describe("inferRoleName", () => {
  describe("action word stripping", () => {
    test("should strip 'install' prefix", () => {
      expect(inferRoleName("install nginx")).toBe("nginx");
    });

    test("should strip 'configure' prefix", () => {
      expect(inferRoleName("configure apache")).toBe("apache");
    });

    test("should strip 'setup' prefix", () => {
      expect(inferRoleName("setup docker")).toBe("docker");
    });

    test("should strip 'set up' prefix", () => {
      expect(inferRoleName("set up kubernetes")).toBe("kubernetes");
    });
  });

  describe("filler word removal", () => {
    test("should remove articles", () => {
      expect(inferRoleName("install a nginx server")).toBe("nginx-server");
    });

    test("should remove prepositions", () => {
      expect(inferRoleName("nginx with ssl")).toBe("nginx-ssl");
    });
  });

  describe("word limiting", () => {
    test("should take first 3 meaningful words", () => {
      const result = inferRoleName("nginx server with ssl and monitoring");
      const words = result.split("-");
      expect(words.length).toBeLessThanOrEqual(3);
    });
  });

  describe("edge cases", () => {
    test("should return 'role' for empty description", () => {
      expect(inferRoleName("")).toBe("role");
    });

    test("should return 'role' for only filler words", () => {
      expect(inferRoleName("a the an")).toBe("role");
    });
  });
});

describe("validateRoleName", () => {
  describe("valid names", () => {
    test("should accept simple lowercase name", () => {
      expect(validateRoleName("nginx")).toBeUndefined();
    });

    test("should accept name with hyphens", () => {
      expect(validateRoleName("my-nginx-role")).toBeUndefined();
    });

    test("should accept name with numbers", () => {
      expect(validateRoleName("nginx2")).toBeUndefined();
    });

    test("should accept single character name", () => {
      expect(validateRoleName("a")).toBeUndefined();
    });
  });

  describe("invalid names", () => {
    test("should reject empty name", () => {
      expect(validateRoleName("")).toBeDefined();
    });

    test("should reject name starting with number", () => {
      expect(validateRoleName("2nginx")).toBeDefined();
    });

    test("should reject name starting with hyphen", () => {
      expect(validateRoleName("-nginx")).toBeDefined();
    });

    test("should reject name ending with hyphen", () => {
      expect(validateRoleName("nginx-")).toBeDefined();
    });

    test("should reject name with consecutive hyphens", () => {
      expect(validateRoleName("my--role")).toBeDefined();
    });

    test("should reject name over 50 characters", () => {
      expect(validateRoleName("a".repeat(51))).toBeDefined();
    });

    test("should reject uppercase letters", () => {
      expect(validateRoleName("MyRole")).toBeDefined();
    });
  });
});
