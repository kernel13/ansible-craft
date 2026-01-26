---
status: testing
phase: 06-quality-assurance
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md]
started: 2026-01-19T22:30:00Z
updated: 2026-01-19T22:30:00Z
---

## Current Test

number: 1
name: Progress Display During Generation
expected: |
  When running `ansible-craft new role "install nginx"`, you see:
  1. Spinner with phase name (e.g., "Planning role structure...")
  2. When phase completes, spinner becomes checkmark with elapsed time (e.g., "✓ Planning role structure (2.3s)")
  3. Next phase spinner starts immediately
  4. All completed phases remain visible as log lines
awaiting: user response

## Tests

### 1. Progress Display During Generation
expected: Running `ansible-craft new role "install nginx"` shows spinner with phase names, checkmarks with elapsed time when phases complete, and progressive log-style output
result: [pending]

### 2. Quiet Mode Suppresses Progress
expected: Running `ansible-craft new role "test" --quiet` or `-q` shows no spinner or progress output, only final result
result: [pending]

### 3. Dry-Run Shows Syntax-Highlighted Preview
expected: Running `ansible-craft new role "test" --dry-run` shows file contents with YAML syntax highlighting (colored keywords like `name:`, `tasks:`) and asks for confirmation before proceeding
result: [pending]

### 4. Dry-Run Confirmation Defaults to No
expected: In dry-run mode, pressing Enter at confirmation prompt (without typing anything) should NOT write files - you must explicitly type "y" or "yes"
result: [pending]

### 5. ansible-lint Missing Shows Install Instructions
expected: If ansible-lint is not installed, running generation shows a message with install instructions (e.g., "pip install ansible-lint") rather than an error
result: [pending]

### 6. ansible-lint Runs Before Writing Files
expected: If ansible-lint IS installed, running `ansible-craft new role "install nginx"` shows a "Lint check" phase that validates the generated code before writing
result: [pending]

### 7. Lint Violations Displayed With Counts
expected: If lint violations are found, they are displayed grouped by file with error/warning counts (e.g., "2 errors, 3 warnings in tasks/main.yml")
result: [pending]

### 8. Auto-Fix Prompts User
expected: When fixable lint violations are found, you see a prompt asking whether to apply automatic fixes (with default Yes)
result: [pending]

### 9. --fix Flag Auto-Applies Fixes
expected: Running with `--fix` flag applies automatic fixes without prompting (just shows "Auto-fixing lint violations...")
result: [pending]

### 10. Unfixable Violations Show Suggestions
expected: For lint violations that cannot be auto-fixed, the output shows suggestions for how to manually fix them
result: [pending]

### 11. Playbook Command Has Same Features
expected: Running `ansible-craft new playbook "deploy app" --dry-run` shows the same progress display, lint integration, and preview features as the role command
result: [pending]

### 12. Help Shows New Flags
expected: Running `ansible-craft new role --help` shows the `--fix` flag and `-q/--quiet` flag in the options list
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0

## Gaps

[none yet]
