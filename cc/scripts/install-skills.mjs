#!/usr/bin/env node
/**
 * Command installer for Claude Code integration.
 *
 * Copies ansible-craft commands to ~/.claude/commands/ac/.
 *
 * Commands in ~/.claude/commands/ac/ are discovered as /ac:<name>
 * (subdirectory name provides the namespace).
 *
 * Usage:
 *   node cc/scripts/install-skills.mjs [--global|--project]
 *
 * Options:
 *   --global   Install to ~/.claude/ (default)
 *   --project  Install to ./.claude/ (current directory)
 *   --force    Overwrite existing files without prompting
 *   --quiet    Suppress output (for postinstall script)
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the commands source directory (bundled with package).
 * Commands are stored in plugin/commands/ subdirectory.
 */
function getCommandsSourceDir() {
  // Look for plugin/commands/ relative to this script's directory
  // scripts/install-skills.mjs -> ../plugin/commands/
  const fromScript = resolve(__dirname, '..', 'plugin', 'commands');
  if (existsSync(fromScript)) {
    return fromScript;
  }

  // Fallback: look relative to cwd (for development)
  const fromCwd = resolve(process.cwd(), 'cc', 'plugin', 'commands');
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  throw new Error('Could not find commands directory');
}

/**
 * Get the target directory for command installation.
 * Claude Code discovers commands from ~/.claude/commands/<namespace>/.
 * Subdirectory name creates the namespace: ac/ → /ac:<command>.
 */
function getCommandsTargetDir(options) {
  if (options.project) {
    return resolve(process.cwd(), '.claude', 'commands', 'ac');
  }
  return join(homedir(), '.claude', 'commands', 'ac');
}

/**
 * Recursively list markdown files in a directory.
 * Returns relative paths from sourceDir.
 */
function listMarkdownFiles(sourceDir, subDir = '') {
  const files = [];
  const currentDir = subDir ? join(sourceDir, subDir) : sourceDir;

  try {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const entryPath = join(currentDir, entry);
      const relativePath = subDir ? join(subDir, entry) : entry;

      try {
        const stat = statSync(entryPath);

        if (stat.isDirectory()) {
          files.push(...listMarkdownFiles(sourceDir, relativePath));
        } else if (entry.endsWith('.md')) {
          files.push(relativePath);
        }
      } catch {
        // Skip entries we can't stat
      }
    }
  } catch {
    // Return empty array if we can't read the directory
  }

  return files;
}

/**
 * Install files from source to target directory.
 */
function installFiles(sourceDir, targetDir, files, options) {
  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir,
  };

  try {
    // Create target directory if it doesn't exist
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    // Copy each file
    for (const file of files) {
      const sourcePath = join(sourceDir, file);
      const targetPath = join(targetDir, file);

      try {
        // Ensure parent directory exists for nested files
        const parentDir = dirname(targetPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }

        // Check if file already exists
        if (existsSync(targetPath) && !options.force) {
          const sourceContent = readFileSync(sourcePath, 'utf-8');
          const targetContent = readFileSync(targetPath, 'utf-8');

          // Skip if content is identical
          if (sourceContent === targetContent) {
            result.skipped.push(file);
            continue;
          }

          // For postinstall (quiet mode), skip existing files
          if (options.quiet) {
            result.skipped.push(file);
            continue;
          }
        }

        // Copy the file
        const content = readFileSync(sourcePath, 'utf-8');
        writeFileSync(targetPath, content, 'utf-8');
        result.installed.push(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to install ${file}: ${message}`);
      }
    }

    // Mark as failed if there were errors
    if (result.errors.length > 0 && result.installed.length === 0) {
      result.success = false;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    result.success = false;
  }

  return result;
}

/**
 * Remove stale files from previous install approaches.
 * Cleans up ~/.claude/skills/ac/, broken plugin cache entries,
 * and legacy agent files from ~/.claude/agents/.
 */
function cleanupOldInstalls(options) {
  const cleaned = [];

  const dirs = options.project
    ? [resolve(process.cwd(), '.claude', 'skills', 'ac')]
    : [
        join(homedir(), '.claude', 'skills', 'ac'),
        join(homedir(), '.claude', 'plugins', 'cache', 'local', 'ansible-craft'),
        join(homedir(), '.claude', 'plugins', 'cache', 'local', 'ac'),
      ];

  for (const dir of dirs) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        cleaned.push(dir);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // Clean up legacy agent files (ac-*.md) from agents directory
  const agentsDir = options.project
    ? resolve(process.cwd(), '.claude', 'agents')
    : join(homedir(), '.claude', 'agents');

  if (existsSync(agentsDir)) {
    try {
      const entries = readdirSync(agentsDir);
      for (const entry of entries) {
        if (entry.startsWith('ac-') && entry.endsWith('.md')) {
          const agentPath = join(agentsDir, entry);
          try {
            rmSync(agentPath, { force: true });
            cleaned.push(agentPath);
          } catch {
            // Ignore individual file cleanup errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  // Clean up stale plugin registry entries
  cleanupPluginRegistry(options);

  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Remove stale ac@local / ansible-craft@local entries from plugin registry files.
 */
function cleanupPluginRegistry(options) {
  // Clean installed_plugins.json
  const pluginsPath = options.project
    ? resolve(process.cwd(), '.claude', 'plugins', 'installed_plugins.json')
    : join(homedir(), '.claude', 'plugins', 'installed_plugins.json');

  if (existsSync(pluginsPath)) {
    try {
      const data = JSON.parse(readFileSync(pluginsPath, 'utf-8'));
      if (data.plugins) {
        const { 'ac@local': _a, 'ansible-craft@local': _b, ...cleanPlugins } = data.plugins;
        data.plugins = cleanPlugins;
        writeFileSync(pluginsPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Clean settings.json enabledPlugins
  const settingsPath = options.project
    ? resolve(process.cwd(), '.claude', 'settings.json')
    : join(homedir(), '.claude', 'settings.json');

  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      if (settings.enabledPlugins) {
        const {
          'ac@local': _c,
          'ansible-craft@local': _d,
          ...cleanEnabled
        } = settings.enabledPlugins;
        settings.enabledPlugins = cleanEnabled;
        writeFileSync(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf-8');
      }
    } catch {
      // Ignore parse errors
    }
  }
}

/**
 * Install commands to the target directory.
 */
function installCommands(options = {}) {
  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir: '',
  };

  try {
    const sourceDir = getCommandsSourceDir();
    const targetDir = getCommandsTargetDir(options);
    result.targetDir = targetDir;

    const commandFiles = listMarkdownFiles(sourceDir);
    if (commandFiles.length === 0) {
      result.errors.push('No command files found in source directory');
      result.success = false;
      return result;
    }

    return installFiles(sourceDir, targetDir, commandFiles, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    result.success = false;
  }

  return result;
}

/**
 * Install commands and clean up legacy agents.
 */
function installAll(options = {}) {
  const cleanedUp = cleanupOldInstalls(options);
  const commands = installCommands(options);

  return {
    commands,
    cleanedUp,
    success: commands.success,
  };
}

/**
 * Format installation result for display.
 */
function formatResult(result, label) {
  const lines = [];

  if (result.installed.length > 0) {
    lines.push(`Installed ${result.installed.length} ${label}(s) to ${result.targetDir}:`);
    for (const file of result.installed) {
      lines.push(`  + ${file}`);
    }
  }

  if (result.skipped.length > 0) {
    lines.push(`Skipped ${result.skipped.length} unchanged ${label}(s):`);
    for (const file of result.skipped) {
      lines.push(`  = ${file}`);
    }
  }

  if (result.errors.length > 0) {
    lines.push(`${label} errors:`);
    for (const error of result.errors) {
      lines.push(`  ! ${error}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format full installation result for display.
 */
function formatFullResult(result) {
  const lines = [];

  const commandsOutput = formatResult(result.commands, 'command');
  if (commandsOutput) {
    lines.push('=== Commands ===');
    lines.push(commandsOutput);
  }

  if (result.cleanedUp) {
    if (lines.length > 0) lines.push('');
    for (const dir of result.cleanedUp) {
      lines.push(`Cleaned up old install: ${dir}`);
    }
  }

  if (lines.length === 0) {
    lines.push('No commands to install.');
  }

  return lines.join('\n');
}

/**
 * CLI entry point.
 */
function main() {
  const args = process.argv.slice(2);
  const options = {
    project: args.includes('--project') || args.includes('-p'),
    force: args.includes('--force') || args.includes('-f'),
    quiet: args.includes('--quiet') || args.includes('-q'),
  };

  const result = installAll(options);

  if (!options.quiet) {
    console.log(formatFullResult(result));

    if (result.success) {
      const commandCount = result.commands.installed.length;

      if (commandCount > 0) {
        console.log('\nClaude Code integration installed successfully!');
        console.log(
          'Commands: /ac:role, /ac:playbook, /ac:explain, /ac:fix, /ac:project, /ac:collection',
        );
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
