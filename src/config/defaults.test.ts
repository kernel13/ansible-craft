import { describe, expect, test } from 'bun:test';
import { DEFAULT_CONFIG } from './defaults.js';
import type { Config } from './schema.js';

describe('DEFAULT_CONFIG', () => {
  test('should have undefined api key', () => {
    expect(DEFAULT_CONFIG.api.key).toBeUndefined();
  });

  test('should have sonnet as default model', () => {
    expect(DEFAULT_CONFIG.defaults.model).toBe('sonnet');
  });

  test('should have complex mode disabled', () => {
    expect(DEFAULT_CONFIG.defaults.complex).toBe(false);
  });

  test('should have plain output format', () => {
    expect(DEFAULT_CONFIG.output.format).toBe('plain');
  });

  test('should have verbose disabled', () => {
    expect(DEFAULT_CONFIG.output.verbose).toBe(false);
  });

  test('should have dry_run disabled', () => {
    expect(DEFAULT_CONFIG.output.dry_run).toBe(false);
  });

  test('should be a complete Config object', () => {
    const config: Config = DEFAULT_CONFIG;
    expect(config).toBeDefined();
    expect(config.api).toBeDefined();
    expect(config.defaults).toBeDefined();
    expect(config.output).toBeDefined();
  });
});
