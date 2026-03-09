#!/usr/bin/env node
/**
 * Skill uninstaller for Claude Code, Cursor, and GitHub Copilot integration.
 *
 * Removes ansible-craft skills from one or more targets:
 *   Claude Code (global):   ~/.claude/skills/ansible-craft-{name}/
 *   Claude Code (project):  ./.claude/skills/ansible-craft-{name}/
 *   Cursor (global):        ~/.cursor/rules/ansible-craft-{name}.mdc
 *   Cursor (project):       ./.cursor/rules/ansible-craft-{name}.mdc
 *   GitHub Copilot (global): ~/.github/instructions/ansible-craft-{name}.instructions.md
 *   GitHub Copilot (project): ./.github/instructions/ansible-craft-{name}.instructions.md
 *
 * Usage:
 *   node scripts/uninstall-skills.mjs                    # interactive target selection (TTY)
 *   node scripts/uninstall-skills.mjs --global           # all global targets
 *   node scripts/uninstall-skills.mjs --project          # all project targets
 *   node scripts/uninstall-skills.mjs --all              # all six targets
 *   node scripts/uninstall-skills.mjs --targets=cursor-global,copilot
 *   node scripts/uninstall-skills.mjs --quiet            # suppress output (preuninstall)
 */

import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMESPACE = 'ansible-craft';
const SKILLS = ['role', 'playbook', 'project', 'collection', 'explain', 'fix'];

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

const GLOBAL_TARGETS = ['claude-global', 'cursor-global', 'copilot-global'];
const PROJECT_TARGETS = ['claude-project', 'cursor-project', 'copilot'];

// ---------------------------------------------------------------------------
// Path helpers
// ---------------------------------------------------------------------------

function getClaudeSkillsBaseDir(isProject) {
  if (isProject) {
    return resolve(process.cwd(), '.claude', 'skills');
  }
  return join(homedir(), '.claude', 'skills');
}

function getCursorRulesDir(isGlobal) {
  if (isGlobal) {
    return join(homedir(), '.cursor', 'rules');
  }
  return resolve(process.cwd(), '.cursor', 'rules');
}

function getCopilotInstructionsDir(isGlobal) {
  if (isGlobal) {
    return join(homedir(), '.github', 'instructions');
  }
  return resolve(process.cwd(), '.github', 'instructions');
}

// ---------------------------------------------------------------------------
// Interactive prompt
// ---------------------------------------------------------------------------

async function promptTargets() {
  const items = ALL_TARGETS.map((t) => ({ ...t, selected: t.defaultSelected }));
  let cursor = 0;

  const labelWidth = Math.max(...items.map((t) => t.label.length));

  function render() {
    process.stdout.write('\x1b[2J\x1b[H'); // clear screen
    process.stdout.write('ansible-craft - Select targets to uninstall:\n');
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
// Uninstall per target
// ---------------------------------------------------------------------------

function uninstallTarget(targetKey) {
  const removed = [];
  const notFound = [];

  if (targetKey === 'claude-global' || targetKey === 'claude-project') {
    const isProject = targetKey === 'claude-project';
    const baseDir = getClaudeSkillsBaseDir(isProject);

    for (const skill of SKILLS) {
      const skillDir = join(baseDir, `${NAMESPACE}-${skill}`);
      if (existsSync(skillDir)) {
        try {
          rmSync(skillDir, { recursive: true, force: true });
          removed.push(`${NAMESPACE}-${skill}/`);
        } catch (err) {
          notFound.push(`${NAMESPACE}-${skill}/: ${err.message}`);
        }
      } else {
        notFound.push(`${NAMESPACE}-${skill}/`);
      }
    }
  } else if (targetKey === 'cursor-global' || targetKey === 'cursor-project') {
    const isGlobal = targetKey === 'cursor-global';
    const dir = getCursorRulesDir(isGlobal);

    for (const skill of SKILLS) {
      const filePath = join(dir, `${NAMESPACE}-${skill}.mdc`);
      if (existsSync(filePath)) {
        try {
          rmSync(filePath, { force: true });
          removed.push(`${NAMESPACE}-${skill}.mdc`);
        } catch (err) {
          notFound.push(`${NAMESPACE}-${skill}.mdc: ${err.message}`);
        }
      } else {
        notFound.push(`${NAMESPACE}-${skill}.mdc`);
      }
    }
  } else if (targetKey === 'copilot-global' || targetKey === 'copilot') {
    const isGlobal = targetKey === 'copilot-global';
    const dir = getCopilotInstructionsDir(isGlobal);

    for (const skill of SKILLS) {
      const filePath = join(dir, `${NAMESPACE}-${skill}.instructions.md`);
      if (existsSync(filePath)) {
        try {
          rmSync(filePath, { force: true });
          removed.push(`${NAMESPACE}-${skill}.instructions.md`);
        } catch (err) {
          notFound.push(`${NAMESPACE}-${skill}.instructions.md: ${err.message}`);
        }
      } else {
        notFound.push(`${NAMESPACE}-${skill}.instructions.md`);
      }
    }
  }

  return { removed, notFound };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

const TARGET_LABELS = Object.fromEntries(ALL_TARGETS.map((t) => [t.key, t.label]));

function formatResults(targetResults) {
  const lines = [];

  for (const [targetKey, { removed, notFound }] of Object.entries(targetResults)) {
    const label = TARGET_LABELS[targetKey] ?? targetKey;
    lines.push(`[${label}]`);

    for (const item of removed) {
      lines.push(`  removed: ${item}`);
    }
    for (const item of notFound) {
      lines.push(`  not found: ${item}`);
    }

    lines.push('');
  }

  // Remove trailing empty line
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet') || args.includes('-q');
  const targets = await resolveTargets(args);

  const targetResults = {};

  for (const targetKey of targets) {
    targetResults[targetKey] = uninstallTarget(targetKey);
  }

  if (!quiet) {
    console.log(formatResults(targetResults));

    const anyRemoved = Object.values(targetResults).some((r) => r.removed.length > 0);
    if (anyRemoved) {
      console.log('\nansible-craft skills uninstalled.');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
