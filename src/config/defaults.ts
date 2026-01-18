/**
 * Default configuration values for ansible-craft
 */

import type { Config } from './schema.ts';

/** Default configuration applied when no config file is present */
export const DEFAULT_CONFIG: Config = {
  api: {
    key: undefined,
  },
  defaults: {
    model: 'sonnet',
    complex: false,
  },
  output: {
    format: 'plain',
    verbose: false,
    dry_run: false,
  },
};
