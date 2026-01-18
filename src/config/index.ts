/**
 * Public configuration API for ansible-craft
 */

export { configExists, loadConfig } from './loader.ts';
export { DEFAULT_CONFIG } from './defaults.ts';
export { CONFIG_DIR, CONFIG_PATH } from './paths.ts';
export type { ApiConfig, Config, DefaultsConfig, OutputConfig } from './schema.ts';

// Config error utilities
export { displayMissingApiKeyError, maskApiKey } from './errors.ts';

// API validation
export { validateApiKey } from '../api/validate-key.ts';
export type { ValidationResult } from '../api/validate-key.ts';

// Config writer
export { generateConfigToml, saveConfig } from './writer.ts';

// Setup wizard
export { runSetupWizard } from './wizard.ts';

import { displayMissingApiKeyError } from './errors.ts';
import { loadConfig } from './loader.ts';
import type { Config } from './schema.ts';

/**
 * Load config and require API key to be present.
 *
 * If API key is missing, displays a user-friendly error message
 * and returns null. Otherwise returns the loaded config.
 *
 * Used by commands that need API key (e.g., generate).
 *
 * @returns Config if API key present, null if missing (after displaying error)
 */
export async function requireApiKey(): Promise<Config | null> {
  const config = await loadConfig();

  if (!config.api.key) {
    displayMissingApiKeyError();
    return null;
  }

  return config;
}
