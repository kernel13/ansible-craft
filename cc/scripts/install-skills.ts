#!/usr/bin/env bun
/**
 * Skill and agent installer for Claude Code integration.
 *
 * Copies ansible-craft skills to Claude Code commands directory
 * and agents to the agents directory.
 *
 * Usage:
 *   bun run scripts/install-skills.ts [--global|--project]
 *
 * Options:
 *   --global   Install to ~/.claude/ (default)
 *   --project  Install to ./.claude/ (current directory)
 *   --force    Overwrite existing files without prompting
 *   --quiet    Suppress output (for postinstall script)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface InstallOptions {
  /** Install to project-local directory instead of global */
  project?: boolean;
  /** Overwrite existing files without prompting */
  force?: boolean;
  /** Suppress output messages */
  quiet?: boolean;
}

export interface InstallResult {
  success: boolean;
  installed: string[];
  skipped: string[];
  errors: string[];
  targetDir: string;
}

export interface FullInstallResult {
  skills: InstallResult;
  agents: InstallResult;
  success: boolean;
}

/**
 * Get the skills source directory (bundled with package).
 * Skills are stored in skills/ac/ subdirectory.
 */
function getSkillsSourceDir(): string {
  // Look for skills/ac/ relative to this script's directory
  // scripts/install-skills.ts -> ../skills/ac/
  const fromScript = resolve(__dirname, '..', 'skills', 'ac');
  if (existsSync(fromScript)) {
    return fromScript;
  }

  // Fallback: look relative to cwd (for development)
  const fromCwd = resolve(process.cwd(), 'skills', 'ac');
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  throw new Error('Could not find skills directory');
}

/**
 * Get the agents source directory (bundled with package).
 * Agents are stored in agents/ subdirectory.
 */
function getAgentsSourceDir(): string | null {
  // Look for agents/ relative to this script's directory
  const fromScript = resolve(__dirname, '..', 'agents');
  if (existsSync(fromScript)) {
    return fromScript;
  }

  // Fallback: look relative to cwd (for development)
  const fromCwd = resolve(process.cwd(), 'agents');
  if (existsSync(fromCwd)) {
    return fromCwd;
  }

  // Agents are optional - return null if not found
  return null;
}

/**
 * Get the target directory for skill installation.
 * Claude Code uses ~/.claude/commands/[namespace]/ for slash commands.
 */
function getSkillsTargetDir(options: InstallOptions): string {
  if (options.project) {
    return resolve(process.cwd(), '.claude', 'commands', 'ac');
  }
  return join(homedir(), '.claude', 'commands', 'ac');
}

/**
 * Get the target directory for agent installation.
 * Claude Code uses ~/.claude/agents/ for custom agents.
 */
function getAgentsTargetDir(options: InstallOptions): string {
  if (options.project) {
    return resolve(process.cwd(), '.claude', 'agents');
  }
  return join(homedir(), '.claude', 'agents');
}

/**
 * Recursively list all markdown files in a directory.
 * Returns relative paths from sourceDir (e.g., 'role.md', 'role/references/fqcn.md').
 */
function listMarkdownFiles(sourceDir: string, subDir = ''): string[] {
  const files: string[] = [];
  const currentDir = subDir ? join(sourceDir, subDir) : sourceDir;

  try {
    const entries = readdirSync(currentDir);

    for (const entry of entries) {
      const entryPath = join(currentDir, entry);
      const relativePath = subDir ? join(subDir, entry) : entry;

      try {
        const stat = statSync(entryPath);

        if (stat.isDirectory()) {
          // Recursively get files from subdirectory
          files.push(...listMarkdownFiles(sourceDir, relativePath));
        } else if (entry.endsWith('.md')) {
          // Add .md files with their relative path
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
function installFiles(
  sourceDir: string,
  targetDir: string,
  files: string[],
  options: InstallOptions
): InstallResult {
  const result: InstallResult = {
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

    // Copy each file (including files in subdirectories)
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
 * Install skills to the target directory.
 */
export function installSkills(options: InstallOptions = {}): InstallResult {
  const result: InstallResult = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir: '',
  };

  try {
    const sourceDir = getSkillsSourceDir();
    const targetDir = getSkillsTargetDir(options);
    result.targetDir = targetDir;

    const skillFiles = listMarkdownFiles(sourceDir);
    if (skillFiles.length === 0) {
      result.errors.push('No skill files found in source directory');
      result.success = false;
      return result;
    }

    return installFiles(sourceDir, targetDir, skillFiles, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    result.success = false;
  }

  return result;
}

/**
 * Install agents to the target directory.
 */
export function installAgents(options: InstallOptions = {}): InstallResult {
  const result: InstallResult = {
    success: true,
    installed: [],
    skipped: [],
    errors: [],
    targetDir: '',
  };

  try {
    const sourceDir = getAgentsSourceDir();
    if (!sourceDir) {
      // Agents are optional - not an error if not found
      result.skipped.push('(no agents directory found)');
      return result;
    }

    const targetDir = getAgentsTargetDir(options);
    result.targetDir = targetDir;

    // Only install ac-* agents (ansible-craft specific)
    const allFiles = listMarkdownFiles(sourceDir);
    const agentFiles = allFiles.filter((f) => f.startsWith('ac-'));

    if (agentFiles.length === 0) {
      result.skipped.push('(no ansible-craft agents found)');
      return result;
    }

    return installFiles(sourceDir, targetDir, agentFiles, options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    result.success = false;
  }

  return result;
}

/**
 * Install both skills and agents.
 */
export function installAll(options: InstallOptions = {}): FullInstallResult {
  const skills = installSkills(options);
  const agents = installAgents(options);

  return {
    skills,
    agents,
    success: skills.success && agents.success,
  };
}

/**
 * Format installation result for display.
 */
export function formatResult(result: InstallResult, label: string): string {
  const lines: string[] = [];

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
export function formatFullResult(result: FullInstallResult): string {
  const lines: string[] = [];

  const skillsOutput = formatResult(result.skills, 'skill');
  if (skillsOutput) {
    lines.push('=== Skills ===');
    lines.push(skillsOutput);
  }

  const agentsOutput = formatResult(result.agents, 'agent');
  if (agentsOutput) {
    if (lines.length > 0) lines.push('');
    lines.push('=== Agents ===');
    lines.push(agentsOutput);
  }

  if (lines.length === 0) {
    lines.push('No skills or agents to install.');
  }

  return lines.join('\n');
}

/**
 * CLI entry point.
 */
function main(): void {
  const args = process.argv.slice(2);
  const options: InstallOptions = {
    project: args.includes('--project') || args.includes('-p'),
    force: args.includes('--force') || args.includes('-f'),
    quiet: args.includes('--quiet') || args.includes('-q'),
  };

  const result = installAll(options);

  if (!options.quiet) {
    console.log(formatFullResult(result));

    if (result.success) {
      const skillCount = result.skills.installed.length;
      const agentCount = result.agents.installed.length;

      if (skillCount > 0 || agentCount > 0) {
        console.log('\nClaude Code integration installed successfully!');
        if (skillCount > 0) {
          console.log('Skills: /ac:role, /ac:playbook, /ac:explain, /ac:fix');
        }
        if (agentCount > 0) {
          console.log('Agents: ac-planner, ac-generator, ac-validator, ac-linter, ac-fixer');
        }
      }
    }
  }

  process.exit(result.success ? 0 : 1);
}

// Run if executed directly
if (import.meta.main) {
  main();
}
