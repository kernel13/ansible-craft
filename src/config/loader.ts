/**
 * Configuration loader for ansible-craft
 *
 * Loads config from file and environment variables with conflict detection.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import { CLIError } from '../errors/cli-error.ts';
import { DEFAULT_CONFIG } from './defaults.ts';
import { CONFIG_PATH } from './paths.ts';
import type { Config } from './schema.ts';

/**
 * Project-level config filename.
 */
export const PROJECT_CONFIG_FILENAME = '.ansible-craft.toml';

/**
 * Check if config file exists
 */
export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

/**
 * Deep merge two config objects
 */
function mergeConfig(base: Config, overlay: Partial<Config>): Config {
  return {
    api: {
      ...base.api,
      ...overlay.api,
    },
    defaults: {
      ...base.defaults,
      ...overlay.defaults,
    },
    output: {
      ...base.output,
      ...overlay.output,
    },
  };
}

/**
 * Load configuration from file and environment
 *
 * Precedence:
 * 1. Start with DEFAULT_CONFIG
 * 2. Merge config file if it exists
 * 3. Overlay ANTHROPIC_API_KEY from environment
 *
 * Throws CLIError if:
 * - Config file exists but has invalid TOML syntax
 * - Both env var and config file have different API key values
 */
export async function loadConfig(): Promise<Config> {
  let config = { ...DEFAULT_CONFIG };

  // Read from file if it exists
  if (configExists()) {
    try {
      const content = readFileSync(CONFIG_PATH, 'utf-8');
      const fileConfig = parse(content) as Partial<Config>;
      config = mergeConfig(config, fileConfig);
    } catch (error) {
      if (error instanceof Error && error.message.includes('parse')) {
        throw new CLIError(
          `Invalid config file: ${error.message}`,
          'CONFIG_PARSE_ERROR',
          `Check TOML syntax at ${CONFIG_PATH}`,
        );
      }
      // Re-throw smol-toml errors with proper formatting
      throw new CLIError(
        `Invalid config file: ${String(error)}`,
        'CONFIG_PARSE_ERROR',
        `Check TOML syntax at ${CONFIG_PATH}`,
      );
    }
  }

  // Read API key from environment
  const envApiKey = process.env.ANTHROPIC_API_KEY;

  // Check for conflict: both sources have different non-empty values
  if (envApiKey && config.api.key && envApiKey !== config.api.key) {
    throw new CLIError(
      'API key conflict: ANTHROPIC_API_KEY and config file have different values',
      'CONFIG_CONFLICT',
      'Remove API key from one source, or ensure they match',
    );
  }

  // Environment variable takes precedence if set
  if (envApiKey) {
    config.api.key = envApiKey;
  }

  return config;
}

/**
 * Load configuration with project-level override support.
 *
 * Precedence (highest to lowest):
 * 1. Environment variables (ANTHROPIC_API_KEY)
 * 2. Project-level .ansible-craft.toml (current directory)
 * 3. Global ~/.config/ansible-craft/config.toml
 * 4. DEFAULT_CONFIG
 *
 * @param projectDir - Project directory to check for .ansible-craft.toml (defaults to cwd)
 */
export async function loadConfigWithProjectOverride(
  projectDir: string = process.cwd(),
): Promise<Config> {
  // Start with global config
  let config = await loadConfig();

  // Check for project-level override
  const projectConfigPath = join(projectDir, PROJECT_CONFIG_FILENAME);
  if (existsSync(projectConfigPath)) {
    try {
      const content = readFileSync(projectConfigPath, 'utf-8');
      const projectConfig = parse(content) as Partial<Config>;
      config = mergeConfig(config, projectConfig);
    } catch (error) {
      // Log warning but don't fail - project config is optional
      console.warn(
        `Warning: Could not parse ${projectConfigPath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return config;
}
