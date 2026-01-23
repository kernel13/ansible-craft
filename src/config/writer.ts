/**
 * Configuration file writer for ansible-craft.
 *
 * Generates TOML config files with comments and handles
 * merging with existing configuration.
 */

import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import chalk from 'chalk';
import { parse } from 'smol-toml';
import { DEFAULT_CONFIG } from './defaults.ts';
import { CONFIG_DIR, CONFIG_PATH } from './paths.ts';
import type { Config } from './schema.ts';

/**
 * Generate TOML configuration string with explanatory comments.
 *
 * @param config - The configuration object to serialize
 * @returns TOML string with comments
 */
export function generateConfigToml(config: Config): string {
  const lines: string[] = [
    '# ansible-craft configuration',
    '# Location: ~/.ansible-craft/config.toml',
    '',
    '[api]',
    '# Your Anthropic API key (get one at https://console.anthropic.com/)',
    '# Can also be set via ANTHROPIC_API_KEY environment variable',
  ];

  if (config.api.key) {
    lines.push(`key = ${JSON.stringify(config.api.key)}`);
  } else {
    lines.push('# key = "sk-ant-..."');
  }

  lines.push(
    '',
    '[defaults]',
    '# Default model for generation (sonnet = faster, opus = more capable)',
    `model = ${JSON.stringify(config.defaults.model)}`,
    '# Use complex mode by default (more detailed output)',
    `complex = ${config.defaults.complex}`,
    '',
    '[output]',
    '# Default output format (plain, json)',
    `format = ${JSON.stringify(config.output.format)}`,
    '# Show verbose output by default',
    `verbose = ${config.output.verbose}`,
    '# Default to dry-run mode (preview without writing files)',
    `dry_run = ${config.output.dry_run}`,
    '',
  );

  // Add wizard defaults sections if they exist
  if (config.defaults.wizard) {
    const wizard = config.defaults.wizard;
    lines.push(
      '[defaults.wizard]',
      '# Wizard defaults schema version',
      `defaults_version = ${wizard.defaults_version}`,
      '',
    );

    // Role defaults section
    if (wizard.role) {
      lines.push(
        '[defaults.wizard.role]',
        `# Saved: ${new Date().toISOString().split('T')[0]}`,
        `structure = ${JSON.stringify(wizard.role.structure)}`,
        `platforms = ${JSON.stringify(wizard.role.platforms)}`,
        `handlers = ${JSON.stringify(wizard.role.handlers)}`,
        '',
      );
    }

    // Playbook defaults section
    if (wizard.playbook) {
      lines.push(
        '[defaults.wizard.playbook]',
        `# Saved: ${new Date().toISOString().split('T')[0]}`,
        `hosts = ${JSON.stringify(wizard.playbook.hosts)}`,
        `become = ${wizard.playbook.become}`,
        `include_handlers = ${wizard.playbook.includeHandlers}`,
        '',
      );
    }
  }

  return lines.join('\n');
}

/**
 * Deep merge two config objects.
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
      // Deep merge wizard if both exist
      wizard: overlay.defaults?.wizard ?? base.defaults.wizard,
    },
    output: {
      ...base.output,
      ...overlay.output,
    },
  };
}

/**
 * Save configuration to file, merging with existing config if present.
 *
 * - Creates config directory if it doesn't exist
 * - Loads existing config and merges updates
 * - Writes config file with 0o600 permissions
 *
 * @param updates - Partial config to merge and save
 */
export async function saveConfig(updates: Partial<Config>): Promise<void> {
  // Ensure config directory exists
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
    console.log(chalk.dim(`Created config directory: ${CONFIG_DIR}`));
  }

  // Load existing config if file exists
  let existingConfig = { ...DEFAULT_CONFIG };
  if (existsSync(CONFIG_PATH)) {
    try {
      const content = await readFile(CONFIG_PATH, 'utf-8');
      const fileConfig = parse(content) as Partial<Config>;
      existingConfig = mergeConfig(existingConfig, fileConfig);
    } catch {
      // If existing file can't be parsed, start fresh with defaults
    }
  }

  // Merge updates into existing config
  const finalConfig = mergeConfig(existingConfig, updates);

  // Generate TOML and write to file
  const toml = generateConfigToml(finalConfig);
  await writeFile(CONFIG_PATH, toml, { mode: 0o600 });

  // Explicitly set permissions (some systems ignore writeFile mode)
  await chmod(CONFIG_PATH, 0o600);
}
