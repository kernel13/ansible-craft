#!/usr/bin/env node
/**
 * Skill installer for Claude Code integration.
 *
 * Deploys each ansible-craft skill into its own folder under ~/.claude/skills/:
 *   ~/.claude/skills/ansible-craft-{name}/SKILL.md
 *   ~/.claude/skills/ansible-craft-{name}/references/{scoped refs}
 *
 * Skills are discovered as /ansible-craft-{name} by Claude Code.
 * Reference paths inside SKILL.md are rewritten to absolute paths
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
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const NAMESPACE = 'ansible-craft';

// ---------------------------------------------------------------------------
// Reference mapping — only these files are copied per skill
// ---------------------------------------------------------------------------

const SKILL_REFERENCES = {
  role: ['role-structure.md', 'fqcn.md', 'patterns.md', 'molecule.md', 'lint-fixes.md'],
  playbook: ['playbook-structure.md', 'fqcn.md', 'patterns.md', 'lint-fixes.md'],
  collection: ['collection-structure.md'],
  project: ['project-structure.md'],
  explain: [],
  fix: [],
};

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

function getSkillsBaseDir(options) {
  if (options.project) {
    return resolve(process.cwd(), '.claude', 'skills');
  }
  return join(homedir(), '.claude', 'skills');
}

function getSkillTargetDir(skillName, options) {
  return join(getSkillsBaseDir(options), `${NAMESPACE}-${skillName}`);
}

// ---------------------------------------------------------------------------
// Reference path rewriting
// ---------------------------------------------------------------------------

/**
 * Rewrite `references/` paths in skill content to absolute paths.
 * This ensures the Read tool can locate reference files regardless of the
 * user's working directory when the skill runs.
 */
function rewriteReferencePaths(content, referencesAbsPath) {
  return content.replace(/\.\.\/references\//g, `${referencesAbsPath}/`).replace(
    /(?<![/\w])references\//g,
    `${referencesAbsPath}/`,
  );
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

/**
 * Install a single skill and its scoped references.
 */
function installSkill(skillName, options) {
  const skillsSourceDir = getSkillsSourceDir();
  const refsSourceDir = getReferencesSourceDir();
  const skillTargetDir = getSkillTargetDir(skillName, options);
  const refsTargetDir = join(skillTargetDir, 'references');
  const refsAbsPath = refsTargetDir;

  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir: skillTargetDir,
  };

  try {
    mkdirSync(skillTargetDir, { recursive: true });
  } catch (err) {
    result.errors.push(`Failed to create ${skillTargetDir}: ${err.message}`);
    result.success = false;
    return result;
  }

  // Install skill file as SKILL.md
  const sourcePath = join(skillsSourceDir, `${skillName}.md`);
  const targetPath = join(skillTargetDir, 'SKILL.md');

  try {
    let content = readFileSync(sourcePath, 'utf-8');
    content = rewriteReferencePaths(content, refsAbsPath);

    if (existsSync(targetPath) && !options.force) {
      const existing = readFileSync(targetPath, 'utf-8');
      if (content === existing || options.quiet) {
        result.skipped.push('SKILL.md');
      } else {
        writeFileSync(targetPath, content, 'utf-8');
        result.installed.push('SKILL.md');
      }
    } else {
      writeFileSync(targetPath, content, 'utf-8');
      result.installed.push('SKILL.md');
    }
  } catch (err) {
    result.errors.push(`Failed to install SKILL.md for ${skillName}: ${err.message}`);
  }

  // Install scoped references
  const refs = SKILL_REFERENCES[skillName] ?? [];
  if (refs.length > 0 && refsSourceDir) {
    try {
      mkdirSync(refsTargetDir, { recursive: true });
    } catch (err) {
      result.errors.push(`Failed to create references dir: ${err.message}`);
    }

    for (const ref of refs) {
      const refSource = join(refsSourceDir, ref);
      const refTarget = join(refsTargetDir, ref);

      try {
        const content = readFileSync(refSource, 'utf-8');

        if (existsSync(refTarget) && !options.force) {
          const existing = readFileSync(refTarget, 'utf-8');
          if (content === existing || options.quiet) {
            result.skipped.push(`references/${ref}`);
            continue;
          }
        }

        writeFileSync(refTarget, content, 'utf-8');
        result.installed.push(`references/${ref}`);
      } catch (err) {
        result.errors.push(`Failed to install references/${ref}: ${err.message}`);
      }
    }
  }

  if (result.errors.length > 0 && result.installed.length === 0 && result.skipped.length === 0) {
    result.success = false;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

/**
 * Remove stale files from previous install approaches.
 */
function cleanupOldInstalls(options) {
  const cleaned = [];

  const staleDirs = options.project
    ? [
        resolve(process.cwd(), '.claude', 'commands', 'ac'),
        resolve(process.cwd(), '.claude', 'commands', NAMESPACE),
        resolve(process.cwd(), '.claude', 'skills', 'ac'),
      ]
    : [
        join(homedir(), '.claude', 'commands', 'ac'),
        join(homedir(), '.claude', 'commands', NAMESPACE),
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
  const skillResults = {};
  let overallSuccess = true;

  for (const skillName of Object.keys(SKILL_REFERENCES)) {
    const result = installSkill(skillName, options);
    skillResults[skillName] = result;
    if (!result.success) overallSuccess = false;
  }

  return {
    skillResults,
    cleanedUp,
    success: overallSuccess,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatSkillResult(skillName, result) {
  const lines = [];

  if (result.installed.length > 0) {
    lines.push(`  ${NAMESPACE}-${skillName}: installed ${result.installed.join(', ')}`);
  } else if (result.skipped.length > 0) {
    lines.push(`  ${NAMESPACE}-${skillName}: up to date`);
  }

  for (const error of result.errors) {
    lines.push(`  ${NAMESPACE}-${skillName}: ERROR ${error}`);
  }

  return lines.join('\n');
}

function formatFullResult(result) {
  const lines = [];

  for (const [skillName, skillResult] of Object.entries(result.skillResults)) {
    const line = formatSkillResult(skillName, skillResult);
    if (line) lines.push(line);
  }

  if (result.cleanedUp) {
    if (lines.length > 0) lines.push('');
    for (const dir of result.cleanedUp) {
      lines.push(`Cleaned up old install: ${dir}`);
    }
  }

  if (lines.length === 0) {
    lines.push('No skills to install.');
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
      const anyInstalled = Object.values(result.skillResults).some((r) => r.installed.length > 0);
      if (anyInstalled) {
        console.log('\nClaude Code integration installed successfully!');
        console.log(
          'Skills: /ansible-craft-role, /ansible-craft-playbook, /ansible-craft-explain, /ansible-craft-fix, /ansible-craft-project, /ansible-craft-collection',
        );
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
