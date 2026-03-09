#!/usr/bin/env node
/**
 * Skill installer for Claude Code, Cursor, and GitHub Copilot integration.
 *
 * Deploys each ansible-craft skill to one or more targets:
 *   Claude Code (global):   ~/.claude/skills/ansible-craft-{name}/SKILL.md
 *   Claude Code (project):  ./.claude/skills/ansible-craft-{name}/SKILL.md
 *   Cursor (global):        ~/.cursor/rules/ansible-craft-{name}.mdc
 *   Cursor (project):       ./.cursor/rules/ansible-craft-{name}.mdc
 *   GitHub Copilot:         ./.github/instructions/ansible-craft-{name}.instructions.md
 *
 * Usage:
 *   node scripts/install-skills.mjs                    # interactive target selection (TTY)
 *   node scripts/install-skills.mjs --global           # all global targets (Claude + Cursor)
 *   node scripts/install-skills.mjs --project          # all project targets (Claude + Cursor + Copilot)
 *   node scripts/install-skills.mjs --global --project # all five targets
 *   node scripts/install-skills.mjs --all              # all five targets
 *   node scripts/install-skills.mjs --targets=cursor-global,copilot
 *   node scripts/install-skills.mjs --force            # overwrite existing files
 *   node scripts/install-skills.mjs --quiet            # suppress output (postinstall)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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
// Target definitions
// ---------------------------------------------------------------------------

const ALL_TARGETS = [
  {
    key: 'claude-global',
    label: 'Claude Code (global)',
    hint: '~/.claude/skills/',
    defaultSelected: true,
  },
  {
    key: 'claude-project',
    label: 'Claude Code (project)',
    hint: './.claude/skills/',
    defaultSelected: false,
  },
  {
    key: 'cursor-global',
    label: 'Cursor (global)',
    hint: '~/.cursor/rules/',
    defaultSelected: false,
  },
  {
    key: 'cursor-project',
    label: 'Cursor (project)',
    hint: '.cursor/rules/',
    defaultSelected: false,
  },
  {
    key: 'copilot-global',
    label: 'GitHub Copilot (global)',
    hint: '~/.github/instructions/',
    defaultSelected: false,
  },
  {
    key: 'copilot',
    label: 'GitHub Copilot (project)',
    hint: '.github/instructions/',
    defaultSelected: false,
  },
];

// ---------------------------------------------------------------------------
// Interactive prompt
// ---------------------------------------------------------------------------

async function promptTargets() {
  const items = ALL_TARGETS.map((t) => ({ ...t, selected: t.defaultSelected }));
  let cursor = 0;

  const labelWidth = Math.max(...items.map((t) => t.label.length));

  function render() {
    process.stdout.write('\x1b[2J\x1b[H'); // clear screen
    process.stdout.write('ansible-craft - Select installation targets:\n');
    process.stdout.write('Use \u2191\u2193 to navigate, Space to toggle, Enter to confirm\n\n');
    for (let i = 0; i < items.length; i++) {
      const pointer = i === cursor ? '>' : ' ';
      const check = items[i].selected ? '\u25cf' : '\u25cb';
      const label = items[i].label.padEnd(labelWidth);
      process.stdout.write(`  ${pointer} ${check} ${label}  ${items[i].hint}\n`);
    }
  }

  return new Promise((resolvePromise) => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf-8');

    render();

    function onKey(key) {
      if (key === '\x03' || key === '\x1b') {
        // Ctrl-C or Escape
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        process.exit(0);
      }

      if (key === '\x1b[A') {
        // arrow up
        cursor = (cursor - 1 + items.length) % items.length;
        render();
        return;
      }

      if (key === '\x1b[B') {
        // arrow down
        cursor = (cursor + 1) % items.length;
        render();
        return;
      }

      if (key === '\x20') {
        // space — toggle
        items[cursor].selected = !items[cursor].selected;
        render();
        return;
      }

      if (key === '\r') {
        // enter — confirm
        const selected = items.filter((t) => t.selected).map((t) => t.key);
        if (selected.length === 0) {
          process.stdout.write('\n  Please select at least one target.\n');
          render();
          return;
        }
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onKey);
        process.stdout.write('\n');
        resolvePromise(selected);
      }
    }

    process.stdin.on('data', onKey);
  });
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

const GLOBAL_TARGETS = ['claude-global', 'cursor-global', 'copilot-global'];
const PROJECT_TARGETS = ['claude-project', 'cursor-project', 'copilot'];

async function resolveTargets(args) {
  if (args.includes('--quiet') || args.includes('-q')) {
    return ['claude-global'];
  }

  if (args.includes('--all')) {
    return ALL_TARGETS.map((t) => t.key);
  }

  const targetsArg = args.find((a) => a.startsWith('--targets='));
  if (targetsArg) {
    const keys = targetsArg
      .slice('--targets='.length)
      .split(',')
      .map((s) => s.trim());
    const valid = ALL_TARGETS.map((t) => t.key);
    const invalid = keys.filter((k) => !valid.includes(k));
    if (invalid.length > 0) {
      console.error(`Unknown target(s): ${invalid.join(', ')}`);
      console.error(`Valid targets: ${valid.join(', ')}`);
      process.exit(1);
    }
    return keys;
  }

  const hasGlobal = args.includes('--global') || args.includes('-g');
  const hasProject = args.includes('--project') || args.includes('-p');

  if (hasGlobal && hasProject) {
    return ALL_TARGETS.map((t) => t.key);
  }
  if (hasGlobal) {
    return GLOBAL_TARGETS;
  }
  if (hasProject) {
    return PROJECT_TARGETS;
  }

  if (process.stdin.isTTY) {
    return await promptTargets();
  }

  return ['claude-global'];
}

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
// Reference path rewriting (Claude Code only)
// ---------------------------------------------------------------------------

function rewriteReferencePaths(content, referencesAbsPath) {
  return content
    .replace(/\.\.\/references\//g, `${referencesAbsPath}/`)
    .replace(/(?<![/\w])references\//g, `${referencesAbsPath}/`);
}

// ---------------------------------------------------------------------------
// Frontmatter parser
// ---------------------------------------------------------------------------

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { fields: {}, body: content };
  }

  const rawFields = match[1];
  const body = match[2];
  const fields = {};

  for (const line of rawFields.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    fields[key] = value;
  }

  return { fields, body };
}

// ---------------------------------------------------------------------------
// Format converters
// ---------------------------------------------------------------------------

function convertToCursor(content) {
  const { fields, body } = parseFrontmatter(content);
  const description = fields.description ?? '';
  return `---\ndescription: "${description}"\nglobs: []\nalwaysApply: false\n---\n${body}`;
}

function convertToCopilot(content) {
  const { body } = parseFrontmatter(content);
  return `---\napplyTo: "**"\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// Install — Claude Code
// ---------------------------------------------------------------------------

function getClaudeSkillsBaseDir(isProject) {
  if (isProject) {
    return resolve(process.cwd(), '.claude', 'skills');
  }
  return join(homedir(), '.claude', 'skills');
}

function installSkillClaude(skillName, options) {
  const isProject = options.target === 'claude-project';
  const skillsSourceDir = getSkillsSourceDir();
  const refsSourceDir = getReferencesSourceDir();
  const skillTargetDir = join(getClaudeSkillsBaseDir(isProject), `${NAMESPACE}-${skillName}`);
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
// Install — Cursor
// ---------------------------------------------------------------------------

function getCursorRulesDir(isGlobal) {
  if (isGlobal) {
    return join(homedir(), '.cursor', 'rules');
  }
  return resolve(process.cwd(), '.cursor', 'rules');
}

function installSkillCursor(skillName, options) {
  const skillsSourceDir = getSkillsSourceDir();
  const isGlobal = options.target === 'cursor-global';
  const targetDir = getCursorRulesDir(isGlobal);
  const fileName = `${NAMESPACE}-${skillName}.mdc`;
  const targetPath = join(targetDir, fileName);

  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir,
  };

  try {
    const sourcePath = join(skillsSourceDir, `${skillName}.md`);
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    const converted = convertToCursor(sourceContent);

    try {
      mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      result.errors.push(`Failed to create ${targetDir}: ${err.message}`);
      result.success = false;
      return result;
    }

    if (existsSync(targetPath) && !options.force) {
      const existing = readFileSync(targetPath, 'utf-8');
      if (converted === existing || options.quiet) {
        result.skipped.push(fileName);
      } else {
        writeFileSync(targetPath, converted, 'utf-8');
        result.installed.push(fileName);
      }
    } else {
      writeFileSync(targetPath, converted, 'utf-8');
      result.installed.push(fileName);
    }
  } catch (err) {
    result.errors.push(`Failed to install Cursor skill ${skillName}: ${err.message}`);
    result.success = false;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Install — GitHub Copilot
// ---------------------------------------------------------------------------

function installSkillCopilot(skillName, options) {
  const skillsSourceDir = getSkillsSourceDir();
  const isGlobal = options.target === 'copilot-global';
  const targetDir = isGlobal
    ? join(homedir(), '.github', 'instructions')
    : resolve(process.cwd(), '.github', 'instructions');
  const fileName = `${NAMESPACE}-${skillName}.instructions.md`;
  const targetPath = join(targetDir, fileName);

  const result = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir,
  };

  try {
    const sourcePath = join(skillsSourceDir, `${skillName}.md`);
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    const converted = convertToCopilot(sourceContent);

    try {
      mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      result.errors.push(`Failed to create ${targetDir}: ${err.message}`);
      result.success = false;
      return result;
    }

    if (existsSync(targetPath) && !options.force) {
      const existing = readFileSync(targetPath, 'utf-8');
      if (converted === existing || options.quiet) {
        result.skipped.push(fileName);
      } else {
        writeFileSync(targetPath, converted, 'utf-8');
        result.installed.push(fileName);
      }
    } else {
      writeFileSync(targetPath, converted, 'utf-8');
      result.installed.push(fileName);
    }
  } catch (err) {
    result.errors.push(`Failed to install Copilot skill ${skillName}: ${err.message}`);
    result.success = false;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

function cleanupOldInstalls(isProject) {
  const cleaned = [];

  const staleDirs = isProject
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

  const agentsDir = isProject
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

  cleanupPluginRegistry(isProject);

  return cleaned.length > 0 ? cleaned : null;
}

function cleanupPluginRegistry(isProject) {
  const pluginsPath = isProject
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

  const settingsPath = isProject
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
  const targets = options.targets ?? ['claude-global'];
  let cleanedUp = null;

  if (targets.includes('claude-global')) {
    const c = cleanupOldInstalls(false);
    if (c) cleanedUp = [...(cleanedUp ?? []), ...c];
  }
  if (targets.includes('claude-project')) {
    const c = cleanupOldInstalls(true);
    if (c) cleanedUp = [...(cleanedUp ?? []), ...c];
  }

  // targetResults: { [targetKey]: { [skillName]: result } }
  const targetResults = {};
  let overallSuccess = true;

  for (const targetKey of targets) {
    const skillResults = {};

    for (const skillName of Object.keys(SKILL_REFERENCES)) {
      let result;

      if (targetKey === 'claude-global' || targetKey === 'claude-project') {
        result = installSkillClaude(skillName, { ...options, target: targetKey });
      } else if (targetKey === 'cursor-global' || targetKey === 'cursor-project') {
        result = installSkillCursor(skillName, { ...options, target: targetKey });
      } else if (targetKey === 'copilot-global' || targetKey === 'copilot') {
        result = installSkillCopilot(skillName, { ...options, target: targetKey });
      } else {
        result = {
          success: false,
          installed: [],
          skipped: [],
          errors: [`Unknown target: ${targetKey}`],
          targetDir: '',
        };
      }

      skillResults[skillName] = result;
      if (!result.success) overallSuccess = false;
    }

    targetResults[targetKey] = skillResults;
  }

  return {
    targetResults,
    cleanedUp,
    success: overallSuccess,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const TARGET_LABELS = Object.fromEntries(ALL_TARGETS.map((t) => [t.key, t.label]));

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

  for (const [targetKey, skillResults] of Object.entries(result.targetResults)) {
    const targetLabel = TARGET_LABELS[targetKey] ?? targetKey;
    lines.push(`[${targetLabel}]`);

    for (const [skillName, skillResult] of Object.entries(skillResults)) {
      const line = formatSkillResult(skillName, skillResult);
      if (line) lines.push(line);
    }

    lines.push('');
  }

  if (result.cleanedUp) {
    for (const dir of result.cleanedUp) {
      lines.push(`Cleaned up old install: ${dir}`);
    }
    lines.push('');
  }

  // Remove trailing empty line
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  if (lines.length === 0) {
    lines.push('No skills to install.');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const targets = await resolveTargets(args);
  const options = {
    targets,
    force: args.includes('--force') || args.includes('-f'),
    quiet: args.includes('--quiet') || args.includes('-q'),
  };

  const result = installAll(options);

  if (!options.quiet) {
    console.log(formatFullResult(result));

    if (result.success) {
      const anyInstalled = Object.values(result.targetResults).some((skillResults) =>
        Object.values(skillResults).some((r) => r.installed.length > 0),
      );
      if (anyInstalled) {
        console.log('\nansible-craft skills installed successfully!');
        console.log(
          'Skills: /ansible-craft-role, /ansible-craft-playbook, /ansible-craft-explain, /ansible-craft-fix, /ansible-craft-project, /ansible-craft-collection',
        );
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
