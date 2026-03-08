#!/usr/bin/env node
/**
 * Skill installer for Claude Code integration.
 *
 * Copies ansible-craft skills to ~/.claude/commands/ansible-craft/
 * and references to ~/.claude/commands/ansible-craft/references/.
 *
 * Skills are discovered as /ansible-craft:<name> by Claude Code.
 * Reference paths inside skill files are rewritten to absolute paths
 * so the Read tool can locate them regardless of the user's CWD.
 *
 * Usage:
 *   node scripts/install-skills.mjs [--global|--project]
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
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NAMESPACE = 'ansible-craft';

// ---------------------------------------------------------------------------
// Source directories
// ---------------------------------------------------------------------------

function getSkillsSourceDir() {
  const fromScript = resolve(__dirname, '..', 'skills');
  if (existsSync(fromScript)) return fromScript;

  const fromCwd = resolve(process.cwd(), 'skills');
  if (existsSync(fromCwd)) return fromCwd;

  throw new Error('Could not find skills directory');
}

function getReferencesSourceDir() {
  const fromScript = resolve(__dirname, '..', 'references');
  if (existsSync(fromScript)) return fromScript;

  const fromCwd = resolve(process.cwd(), 'references');
  if (existsSync(fromCwd)) return fromCwd;

  return null; // references are optional at install time
}

// ---------------------------------------------------------------------------
// Target directories
// ---------------------------------------------------------------------------

function getSkillsTargetDir(options) {
  if (options.project) {
    return resolve(process.cwd(), '.claude', 'commands', NAMESPACE);
  }
  return join(homedir(), '.claude', 'commands', NAMESPACE);
}

function getReferencesTargetDir(options) {
  return join(getSkillsTargetDir(options), 'references');
}

// ---------------------------------------------------------------------------
// File utilities
// ---------------------------------------------------------------------------

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
 * Rewrite `references/` paths in skill content to absolute paths.
 * This ensures the Read tool can locate reference files regardless of the
 * user's working directory when the skill runs.
 */
function rewriteReferencePaths(content, referencesAbsPath) {
  // Match `references/<file>` in any context (backticks, parens, plain text)
  // Handles both `references/foo.md` and `../references/foo.md` patterns
  return content.replace(/\.\.\/references\//g, `${referencesAbsPath}/`).replace(
    /(?<![/\w])references\//g,
    `${referencesAbsPath}/`,
  );
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Install files from source to target directory.
 * For skill files (.md at the top level of sourceDir), rewrite reference paths.
 */
function installFiles(sourceDir, targetDir, files, options, referencesAbsPath = null) {
  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir,
  };

  try {
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }

    for (const file of files) {
      const sourcePath = join(sourceDir, file);
      const targetPath = join(targetDir, file);

      try {
        const parentDir = dirname(targetPath);
        if (!existsSync(parentDir)) {
          mkdirSync(parentDir, { recursive: true });
        }

        let content = readFileSync(sourcePath, 'utf-8');

        // Rewrite reference paths in skill files (not in reference files themselves)
        if (referencesAbsPath && file.endsWith('.md') && !file.includes('/')) {
          content = rewriteReferencePaths(content, referencesAbsPath);
        }

        if (existsSync(targetPath) && !options.force) {
          const targetContent = readFileSync(targetPath, 'utf-8');

          if (content === targetContent) {
            result.skipped.push(file);
            continue;
          }

          if (options.quiet) {
            result.skipped.push(file);
            continue;
          }
        }

        writeFileSync(targetPath, content, 'utf-8');
        result.installed.push(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to install ${file}: ${message}`);
      }
    }

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

function installSkills(options = {}) {
  const sourceDir = getSkillsSourceDir();
  const targetDir = getSkillsTargetDir(options);
  const referencesAbsPath = getReferencesTargetDir(options);

  const skillFiles = listMarkdownFiles(sourceDir);
  if (skillFiles.length === 0) {
    return {
      success: false,
      installed: [],
      skipped: [],
      errors: ['No skill files found in source directory'],
      targetDir,
    };
  }

  return installFiles(sourceDir, targetDir, skillFiles, options, referencesAbsPath);
}

function installReferences(options = {}) {
  const sourceDir = getReferencesSourceDir();
  if (!sourceDir) {
    return {
      success: true,
      installed: [],
      skipped: ['(no references directory found)'],
      errors: [],
      targetDir: '',
    };
  }

  const targetDir = getReferencesTargetDir(options);
  const refFiles = listMarkdownFiles(sourceDir);

  return installFiles(sourceDir, targetDir, refFiles, options);
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove stale files from previous install approaches.
 */
function cleanupOldInstalls(options) {
  const cleaned = [];

  // Old namespace dirs and plugin cache entries
  const staleDirs = options.project
    ? [
        resolve(process.cwd(), '.claude', 'commands', 'ac'),
        resolve(process.cwd(), '.claude', 'skills', 'ac'),
      ]
    : [
        join(homedir(), '.claude', 'commands', 'ac'),
        join(homedir(), '.claude', 'skills', 'ac'),
        join(homedir(), '.claude', 'plugins', 'cache', 'local', 'ansible-craft'),
        join(homedir(), '.claude', 'plugins', 'cache', 'local', 'ac'),
      ];

  for (const dir of staleDirs) {
    if (existsSync(dir)) {
      try {
        rmSync(dir, { recursive: true, force: true });
        cleaned.push(dir);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  // Legacy agent files (ac-*.md)
  const agentsDir = options.project
    ? resolve(process.cwd(), '.claude', 'agents')
    : join(homedir(), '.claude', 'agents');

  if (existsSync(agentsDir)) {
    try {
      for (const entry of readdirSync(agentsDir)) {
        if (entry.startsWith('ac-') && entry.endsWith('.md')) {
          try {
            rmSync(join(agentsDir, entry), { force: true });
            cleaned.push(join(agentsDir, entry));
          } catch {
            // Ignore individual file errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  cleanupPluginRegistry(options);

  return cleaned.length > 0 ? cleaned : null;
}

function cleanupPluginRegistry(options) {
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

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

function installAll(options = {}) {
  const cleanedUp = cleanupOldInstalls(options);
  const skills = installSkills(options);
  const references = installReferences(options);

  return {
    skills,
    references,
    cleanedUp,
    success: skills.success && references.success,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

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

function formatFullResult(result) {
  const lines = [];

  const skillsOutput = formatResult(result.skills, 'skill');
  if (skillsOutput) {
    lines.push('=== Skills ===');
    lines.push(skillsOutput);
  }

  const refsOutput = formatResult(result.references, 'reference');
  if (refsOutput) {
    if (lines.length > 0) lines.push('');
    lines.push('=== References ===');
    lines.push(refsOutput);
  }

  if (result.cleanedUp) {
    if (lines.length > 0) lines.push('');
    for (const dir of result.cleanedUp) {
      lines.push(`Cleaned up old install: ${dir}`);
    }
  }

  if (lines.length === 0) {
    lines.push('No skills or references to install.');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

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
      const skillCount = result.skills.installed.length;
      const refCount = result.references.installed.length;

      if (skillCount > 0 || refCount > 0) {
        console.log('\nClaude Code integration installed successfully!');
        if (skillCount > 0) {
          console.log(
            'Skills: /ansible-craft:role, /ansible-craft:playbook, /ansible-craft:explain, /ansible-craft:fix, /ansible-craft:project, /ansible-craft:collection',
          );
        }
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
