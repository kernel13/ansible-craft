/**
 * Configuration type definitions for ansible-craft
 */

export interface ApiConfig {
  key?: string;
}

export interface DefaultsConfig {
  model: 'sonnet' | 'opus';
  complex: boolean;
}

export interface OutputConfig {
  format: 'plain' | 'json';
  verbose: boolean;
  dry_run: boolean;
}

export interface Config {
  api: ApiConfig;
  defaults: DefaultsConfig;
  output: OutputConfig;
}
