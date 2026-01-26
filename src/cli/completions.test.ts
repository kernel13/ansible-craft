import { describe, expect, test } from 'bun:test';
import {
  generateBashCompletions,
  generateFishCompletions,
  generateZshCompletions,
} from './completions.js';

describe('generateBashCompletions', () => {
  test('returns bash completion script', () => {
    const result = generateBashCompletions();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes bash shebang comment', () => {
    const result = generateBashCompletions();
    expect(result).toContain('# ansible-craft bash completion');
  });

  test('includes installation instructions', () => {
    const result = generateBashCompletions();
    expect(result).toContain('Install:');
    expect(result).toContain('.bashrc');
  });

  test('includes completion function', () => {
    const result = generateBashCompletions();
    expect(result).toContain('_ansible_craft_completions');
  });

  test('includes main commands', () => {
    const result = generateBashCompletions();
    expect(result).toContain('new');
    expect(result).toContain('config');
    expect(result).toContain('explain');
    expect(result).toContain('fix');
    expect(result).toContain('completions');
  });

  test('includes new subcommands', () => {
    const result = generateBashCompletions();
    expect(result).toContain('role');
    expect(result).toContain('playbook');
  });

  test('includes shell completions', () => {
    const result = generateBashCompletions();
    expect(result).toContain('bash');
    expect(result).toContain('zsh');
    expect(result).toContain('fish');
  });

  test('includes common flags', () => {
    const result = generateBashCompletions();
    expect(result).toContain('--output');
    expect(result).toContain('--dry-run');
    expect(result).toContain('--force');
    expect(result).toContain('--quick');
    expect(result).toContain('--quiet');
    expect(result).toContain('--json');
  });

  test('registers complete function', () => {
    const result = generateBashCompletions();
    expect(result).toContain('complete -F _ansible_craft_completions ansible-craft');
  });
});

describe('generateZshCompletions', () => {
  test('returns zsh completion script', () => {
    const result = generateZshCompletions();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes compdef directive', () => {
    const result = generateZshCompletions();
    expect(result).toContain('#compdef ansible-craft');
  });

  test('includes installation instructions', () => {
    const result = generateZshCompletions();
    expect(result).toContain('Install:');
    expect(result).toContain('.zshrc');
  });

  test('includes main commands with descriptions', () => {
    const result = generateZshCompletions();
    expect(result).toContain("'new:Generate new Ansible resources'");
    expect(result).toContain("'config:Manage configuration'");
    expect(result).toContain("'explain:Explain Ansible code'");
    expect(result).toContain("'fix:Fix Ansible errors'");
  });

  test('includes new subcommands with descriptions', () => {
    const result = generateZshCompletions();
    expect(result).toContain("'role:Generate a new Ansible role'");
    expect(result).toContain("'playbook:Generate a new Ansible playbook'");
  });

  test('includes _arguments for flags', () => {
    const result = generateZshCompletions();
    expect(result).toContain('_arguments');
    expect(result).toContain('--dry-run');
    expect(result).toContain('--force');
  });

  test('includes short and long flag variants', () => {
    const result = generateZshCompletions();
    expect(result).toContain('-o,--output');
    expect(result).toContain('-q,--quiet');
    expect(result).toContain('-Q,--quick');
  });

  test('includes file completion for explain', () => {
    const result = generateZshCompletions();
    expect(result).toContain('_files');
  });

  test('calls main function', () => {
    const result = generateZshCompletions();
    expect(result).toContain('_ansible_craft "$@"');
  });
});

describe('generateFishCompletions', () => {
  test('returns fish completion script', () => {
    const result = generateFishCompletions();
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  test('includes fish completion comment', () => {
    const result = generateFishCompletions();
    expect(result).toContain('# ansible-craft fish completion');
  });

  test('includes installation instructions', () => {
    const result = generateFishCompletions();
    expect(result).toContain('Install:');
    expect(result).toContain('.config/fish/completions');
  });

  test('disables default file completions', () => {
    const result = generateFishCompletions();
    expect(result).toContain('complete -c ansible-craft -f');
  });

  test('includes main commands with descriptions', () => {
    const result = generateFishCompletions();
    expect(result).toContain('-a "new" -d "Generate new Ansible resources"');
    expect(result).toContain('-a "config" -d "Manage configuration"');
    expect(result).toContain('-a "explain" -d "Explain Ansible code"');
    expect(result).toContain('-a "fix" -d "Fix Ansible errors"');
  });

  test('includes new subcommands', () => {
    const result = generateFishCompletions();
    expect(result).toContain('-a "role" -d "Generate a new Ansible role"');
    expect(result).toContain('-a "playbook" -d "Generate a new Ansible playbook"');
  });

  test('includes flag completions', () => {
    const result = generateFishCompletions();
    expect(result).toContain('-l output');
    expect(result).toContain('-l dry-run');
    expect(result).toContain('-l force');
    expect(result).toContain('-l quick');
    expect(result).toContain('-l quiet');
    expect(result).toContain('-l json');
  });

  test('includes short flag variants', () => {
    const result = generateFishCompletions();
    expect(result).toContain('-s o');
    expect(result).toContain('-s q');
    expect(result).toContain('-s Q');
  });

  test('includes global flags', () => {
    const result = generateFishCompletions();
    expect(result).toContain('-s h -l help');
    expect(result).toContain('-s V -l version');
  });

  test('uses __fish_use_subcommand for top-level', () => {
    const result = generateFishCompletions();
    expect(result).toContain('__fish_use_subcommand');
  });

  test('uses __fish_seen_subcommand_from for subcommands', () => {
    const result = generateFishCompletions();
    expect(result).toContain('__fish_seen_subcommand_from new');
    expect(result).toContain('__fish_seen_subcommand_from config');
    expect(result).toContain('__fish_seen_subcommand_from completions');
  });
});
