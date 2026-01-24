import { describe, expect, test } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CONFIG_DIR, CONFIG_PATH, getConfigDir, getConfigPath } from './paths.js';

describe('getConfigDir', () => {
  test('should return path under home directory', () => {
    const result = getConfigDir();
    expect(result).toBe(join(homedir(), '.ansible-craft'));
  });

  test('should return consistent results', () => {
    expect(getConfigDir()).toBe(getConfigDir());
  });
});

describe('getConfigPath', () => {
  test('should return config.toml path under config dir', () => {
    const result = getConfigPath();
    expect(result).toBe(join(homedir(), '.ansible-craft', 'config.toml'));
  });

  test('should be child of config dir', () => {
    expect(getConfigPath().startsWith(getConfigDir())).toBe(true);
  });
});

describe('exported constants', () => {
  test('CONFIG_DIR should match getConfigDir()', () => {
    expect(CONFIG_DIR).toBe(getConfigDir());
  });

  test('CONFIG_PATH should match getConfigPath()', () => {
    expect(CONFIG_PATH).toBe(getConfigPath());
  });
});
