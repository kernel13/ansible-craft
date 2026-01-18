/**
 * Configuration file path resolution for ansible-craft
 */

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Get the config directory path
 * @returns Path to ~/.ansible-craft
 */
export function getConfigDir(): string {
  return join(homedir(), '.ansible-craft');
}

/**
 * Get the config file path
 * @returns Path to ~/.ansible-craft/config.toml
 */
export function getConfigPath(): string {
  return join(getConfigDir(), 'config.toml');
}

/** Config directory path: ~/.ansible-craft */
export const CONFIG_DIR = getConfigDir();

/** Config file path: ~/.ansible-craft/config.toml */
export const CONFIG_PATH = getConfigPath();
