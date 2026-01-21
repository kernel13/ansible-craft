# Claude Code Integration Design

> Enable ansible-craft to work within Claude Code without requiring a separate API key.

## Overview

This design adds a Claude Code integration that allows users to generate Ansible roles and playbooks directly from Claude Code using slash commands, while maintaining the same output quality as the standalone CLI.

## Goals

- **Consistency**: Same prompts, schemas, and validation produce identical quality output
- **Seamless experience**: Users type `/ansible new role "nginx"` and it just works
- **No API key required**: Claude Code itself generates content using embedded prompts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Claude Code                              │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │  /ansible skill │───▶│  Claude generates using      │   │
│  │  (slash command)│    │  embedded prompts & schemas  │   │
│  └─────────────────┘    └──────────────────────────────┘   │
│           │                         │                        │
│           ▼                         ▼                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ansible-craft CLI (validation & file writing)      │   │
│  │  • ansible-craft validate <path>                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Two Modes, Same Quality

| Mode | Generation | Validation | API Key Required |
|------|------------|------------|------------------|
| Standalone CLI | Anthropic API | CLI | Yes |
| Claude Code | Claude Code itself | CLI | No |

The key insight: validation is entirely local (YAML parsing, regex patterns, ansible-lint). Only generation needs an AI, and in Claude Code, Claude IS the AI.

## User Experience

### Slash Command Flow

```
User: /ansible new role "nginx with SSL"

Claude Code:
  1. Reads prompts from user config directory
  2. Generates plan using system prompt + plan template

  "Here's the plan for your nginx role:

   Role: nginx
   Tasks:
     - Install nginx package
     - Configure SSL certificates
     - Set up reverse proxy
   Variables:
     - nginx_ssl_cert_path (default: /etc/ssl/certs)
   Handlers:
     - Restart nginx

   How would you like to proceed?
   • Accept - Generate the role
   • Modify - Adjust the plan
   • Reject - Cancel"

User: Accept

Claude Code:
  3. Generates full YAML files using generate prompt
  4. Writes files to disk
  5. Runs: ansible-craft validate <path>
  6. Reports results

  "✓ Role created at ./roles/nginx/
   ✓ Validation passed (YAML syntax, FQCN, idempotency)
   ✓ ansible-lint: 0 violations"
```

### Conversational Recognition

Beyond slash commands, Claude Code may recognize natural language like "create an Ansible role for nginx" and invoke the same workflow. This is best-effort - slash commands guarantee the structured flow.

## File Structure

### Platform-Native Paths

| Platform | Config Directory |
|----------|------------------|
| Linux/macOS | `~/.config/ansible-craft/` |
| Windows | `%APPDATA%\ansible-craft\` |

### Installed Files

```
~/.config/ansible-craft/          # or %APPDATA%\ansible-craft\
├── config.toml                   # Existing config (API key, defaults)
└── prompts/
    ├── system.txt                # ANSIBLE_EXPERT_SYSTEM_PROMPT
    ├── plan-role.txt             # Role plan prompt template
    ├── plan-playbook.txt         # Playbook plan prompt template
    ├── generate-role.txt         # Role generation prompt
    ├── generate-playbook.txt     # Playbook generation prompt
    └── schemas/
        ├── plan-preview.json     # Role plan JSON schema
        └── playbook-plan.json    # Playbook plan JSON schema

~/.claude/commands/ansible/
├── new.md                        # /ansible new role|playbook
├── validate.md                   # /ansible validate <path>
└── help.md                       # /ansible help
```

## New CLI Commands

### Setup Command

```bash
ansible-craft setup-claude
ansible-craft setup-claude --force    # Overwrite existing
```

Responsibilities:
- Create prompts directory with platform-native path
- Export all prompts as text files
- Export schemas as JSON files
- Install skill files to `~/.claude/commands/ansible/`

### Validate Command

```bash
ansible-craft validate <path>
ansible-craft validate ./roles/nginx/
ansible-craft validate --json ./roles/nginx/   # Machine-readable output
```

JSON output format:
```json
{
  "valid": true,
  "errors": [],
  "warnings": [
    {
      "type": "fqcn",
      "path": "tasks/main.yml",
      "line": 5,
      "message": "Use ansible.builtin.apt instead of apt"
    }
  ],
  "lint": {
    "available": true,
    "violations": []
  }
}
```

### Command API Key Requirements

| Command | Needs API Key |
|---------|---------------|
| `new role` | Yes |
| `new playbook` | Yes |
| `explain` | Yes |
| `fix` | Yes |
| `validate` | No |
| `config` | No |
| `setup-claude` | No |

## Skill Implementation

### Skill File: `new.md`

```markdown
# /ansible new

Generate Ansible roles and playbooks.

## Usage

/ansible new role "<description>"
/ansible new playbook "<description>"

## Instructions

When invoked, you must:

1. Read the appropriate prompt files:
   - System: ~/.config/ansible-craft/prompts/system.txt
   - Plan: ~/.config/ansible-craft/prompts/plan-role.txt (or plan-playbook.txt)

2. Generate a plan following the schema in:
   - ~/.config/ansible-craft/prompts/schemas/plan-preview.json

3. Present the plan and ask user to Accept/Modify/Reject

4. On accept, read the generate prompt:
   - ~/.config/ansible-craft/prompts/generate-role.txt

5. Generate YAML files following Ansible best practices

6. Write files to disk, then validate:
   ```bash
   ansible-craft validate --json <output-path>
   ```

7. Report results to user

## Critical

- Follow the system prompt EXACTLY - it contains Ansible expertise
- Use FQCN for all modules (e.g., ansible.builtin.apt)
- Generate idempotent tasks only
```

## Error Handling

### ansible-craft Not Installed

```
User: /ansible new role "nginx"

Claude Code:
  "ansible-craft CLI not found. Please install it first:

   npm install -g ansible-craft
   ansible-craft setup-claude

   Then try again."
```

### Setup Not Run

```
User: /ansible new role "nginx"

Claude Code:
  "Claude Code integration not configured. Run:

   ansible-craft setup-claude

   Then try again."
```

### Validation Failures

```
Claude Code:
  "⚠ Validation found issues:

   Errors (blocking):
     tasks/main.yml:12 - Invalid YAML syntax

   Warnings:
     tasks/main.yml:5 - Use ansible.builtin.apt instead of apt

   Would you like me to fix these issues?"
```

### ansible-lint Not Available

```
Claude Code:
  "✓ YAML syntax valid
   ✓ FQCN compliance passed
   ⚠ ansible-lint not installed (optional)

   Role created at ./roles/nginx/"
```

## Implementation Plan

### Components

| Component | Effort | Description |
|-----------|--------|-------------|
| `setup-claude` command | Medium | Copies prompts, installs skills, handles paths |
| `validate` command | Low | Wraps existing validation, adds JSON output |
| Platform-native paths | Low | Update `paths.ts` to use platform detection |
| Prompt export | Low | Write prompts to text files during setup |
| Skill files | Medium | Three markdown files with Claude Code instructions |
| Update existing prompts | Low | Ensure prompts are self-contained |

### Dependencies

```json
{
  "dependencies": {
    "env-paths": "^3.0.0"
  }
}
```

### Testing Strategy

- Unit tests for path resolution on different platforms
- Integration test: `setup-claude` creates correct files
- Integration test: `validate` returns correct JSON
- Manual test: Run skill in Claude Code, verify output matches CLI quality

## Out of Scope

- Auto-update prompts when package updates (user runs `setup-claude` again)
- Prompt customization UI
- Multiple prompt versions
- Syncing config between CLI and Claude Code

## Success Criteria

1. User can run `/ansible new role "nginx"` in Claude Code without any API key
2. Generated roles pass the same validation as CLI-generated roles
3. Setup works on Linux, macOS, and Windows
4. Clear error messages guide users when setup is incomplete
