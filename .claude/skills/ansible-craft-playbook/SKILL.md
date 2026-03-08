---
description: Generate production-ready Ansible playbooks from natural language descriptions. Use when user asks to create a playbook, deploy stack, configure multiple hosts, or orchestrate tasks. Triggers on "playbook to deploy", "configure servers", "deploy LAMP/LEMP stack", "set up cluster".
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebSearch
argument-hint: "[playbook description]"
---

# Ansible Playbook Generator

Generate production-ready playbooks with multi-play structure, group variables, and inventory templates. Generate files directly — do NOT use the Task tool.

```
+=====================================================================+
|  GENERATE FILES DIRECTLY using Write/Edit tools.                    |
|  Do NOT use the Task tool. Do NOT spawn agents.                     |
+=====================================================================+
```

## Workflow Overview

```
Step 1: AskUserQuestion      -> Gather requirements
Step 2: Read References       -> Load playbook-structure, fqcn, patterns
Step 3: Generate Plan Inline  -> Design plays, variables, inventory
Step 4: Plan Approval Loop    -> approve/modify/cancel
Step 5: Generate Files (Write)-> Create all playbook files directly
Step 6: Validate              -> ansible-lint + static checks
Step 7: Fix (if needed)       -> Apply fixes via Edit
Step 8: Final Report          -> File tree, validation, next steps
```

## Step 1: Requirements Gathering

### Platform & Architecture

Use AskUserQuestion:

```json
{
  "questions": [
    {
      "question": "Which platform(s) will this target?",
      "header": "Platform",
      "multiSelect": true,
      "options": [
        {"label": "Ubuntu 22.04/24.04", "description": "Debian-based with apt"},
        {"label": "RHEL 9 / Rocky 9", "description": "Enterprise Linux with dnf"},
        {"label": "Debian 12", "description": "Stable Debian with apt"},
        {"label": "Windows Server", "description": "Windows via WinRM"}
      ]
    },
    {
      "question": "What is the deployment architecture?",
      "header": "Architecture",
      "multiSelect": false,
      "options": [
        {"label": "Single server", "description": "All components on one host"},
        {"label": "Multi-server", "description": "Separate hosts for different services"}
      ]
    }
  ]
}
```

### Task Organization

```json
{
  "questions": [{
    "question": "How should tasks be organized?",
    "header": "Structure",
    "multiSelect": false,
    "options": [
      {"label": "Inline tasks (Recommended)", "description": "Tasks directly in playbook"},
      {"label": "Use existing roles", "description": "Reference roles from Galaxy"},
      {"label": "Mixed approach", "description": "Inline tasks with role imports"}
    ]
  }]
}
```

### Features (adapt based on stack type)

**For web/application stacks:**
- Firewall configuration (ufw/firewalld)
- Database initialization (users, grants)
- SSL/TLS certificates

**For all playbooks:**
- Variable validation (pre_tasks assert)
- Health checks (post_tasks verification)
- Rolling updates (serial: option)

## Step 2: Read Reference Files

Read these references directly using the Read tool:
- `/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/playbook-structure.md` — Directory conventions
- `/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/fqcn.md` — Module FQCN mappings (filter by platform)
- `/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/patterns.md` — Idempotency, validation, formatting

## Step 3: Generate Plan Inline

Design the playbook plan directly — do NOT spawn an agent. Include:

- Playbook description
- Plays with hosts and tasks (FQCN modules)
- pre_tasks for validation
- post_tasks for verification
- Handlers per play
- Group variables structure
- Inventory groups needed
- File tree preview

Present in this format:

```
## Playbook Plan: [playbook_name]

**Description**: [what the playbook does]

**Plays**:
- [play name] - hosts: [target] - [purpose]
  - Tasks: [task list with FQCN modules]
  - Has pre_tasks: [yes/no]
  - Has post_tasks: [yes/no]

**Group Variables**:
- group_vars/all.yml: [global variables]
- group_vars/[group].yml: [group-specific variables]

**Inventory Groups**: [required groups]

**File Tree**:
[playbook_name]/
├── playbook.yml
├── inventory.example
├── group_vars/
│   ├── all.yml
│   └── [group].yml
└── README.md
```

## Step 4: Plan Approval Loop

Display the plan and ask for approval:

```json
{
  "questions": [{
    "question": "Approve this plan for the [playbook_name] playbook?",
    "header": "Approval",
    "options": [
      {"label": "Yes, generate the playbook", "description": "Proceed with generating all playbook files"},
      {"label": "Modify the plan", "description": "Request changes before generating (will show updated plan)"},
      {"label": "Cancel", "description": "Stop playbook generation"}
    ],
    "multiSelect": false
  }]
}
```

### When User Approves

Proceed immediately to Step 5. Generate all files directly with Write tool.

### Modification Loop

When user selects "Modify" or provides modification text:
1. **DO NOT proceed to generation (Step 5)**
2. Collect the user's requested changes
3. Regenerate the plan inline with modifications applied
4. Display the updated plan
5. Ask for approval again — repeat until user approves or cancels

## Step 5: Generate Files (Direct Write)

Generate all playbook files directly using the Write tool.

### 5.1: Create directory structure
```bash
mkdir -p [playbook_name]/group_vars
```

### 5.2: Generate files

1. `playbook.yml` — Main playbook with all plays
2. `inventory.example` — Example inventory file
3. `group_vars/all.yml` — Global variables
4. `group_vars/[group].yml` — Per-group variables
5. `README.md` — Usage instructions

## Generation Requirements

These rules are **mandatory** for all generated files:

### FQCN Rules
- ALL modules must use fully qualified names
- `ansible.builtin.apt:` not `apt:`
- `ansible.builtin.template:` not `template:`

### Play Structure
```
1. pre_tasks     -> Validation, prerequisite checks
2. roles         -> If using roles
3. tasks         -> Main work
4. handlers      -> Triggered by notify
5. post_tasks    -> Verification, health checks
```

### pre_tasks - Use for Validation
```yaml
pre_tasks:
  - name: Validate required variables
    ansible.builtin.assert:
      that:
        - db_password is defined
        - db_password | length > 8
      fail_msg: "db_password required (min 8 chars)"
```

### post_tasks - Use for Verification
```yaml
post_tasks:
  - name: Verify service is responding
    ansible.builtin.uri:
      url: "http://localhost:{{ app_port }}/health"
      status_code: 200
    retries: 5
    delay: 10
```

### Handlers - Define Per-Play
```yaml
- name: Configure webservers
  hosts: webservers
  tasks:
    - name: Deploy config
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/app/app.conf
      notify: Restart app

  handlers:
    - name: Restart app
      ansible.builtin.service:
        name: app
        state: restarted
```

### YAML Formatting Rules
- 2-space indentation, never tabs
- Booleans: `true`/`false` (never `yes`/`no`)
- Jinja2 variables quoted: `"{{ var }}"`
- File modes quoted: `mode: '0644'`
- Files start with `---`
- Files end with newline

### Idempotency Rules
- Always specify `state:` parameter
- Use handlers for service restarts (notify:)
- Add `creates:` for command idempotency
- Use `changed_when: false` for read-only commands

### Rolling Updates
```yaml
- name: Rolling update
  hosts: webservers
  serial: 1              # One host at a time
  max_fail_percentage: 25
```

### Windows Considerations
- Use `ansible.windows.*` modules
- WinRM connection in inventory:
  ```ini
  [windows:vars]
  ansible_connection=winrm
  ansible_winrm_transport=ntlm
  ```

## Step 6: Validate

Run validation directly — do NOT spawn an agent.

### Static Checks

Perform inline checks on generated files:
- **FQCN compliance**: grep for short module names
- **Boolean values**: no yes/no, only true/false
- **Jinja2 quoting**: all `{{ }}` expressions quoted
- **File mode quoting**: all mode values quoted strings

### ansible-lint

Run via Bash:
```bash
ansible-lint [playbook_name]/playbook.yml 2>&1
```

If ansible-lint is not installed, report and suggest `pip install ansible-lint`.

## Step 7: Fix (If Violations Found)

If violations found in Step 6:

1. Read `/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/lint-fixes.md` for fix patterns
2. Read `/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/fqcn.md` for FQCN mappings
3. Apply fixes using the Edit tool
4. Report what was fixed vs what requires manual intervention

## Step 8: Final Report

Display final results:

```
## Playbook Generation Complete

**Playbook:** [playbook_name]
**Location:** [playbook_name]/

### File Tree
[tree output]

### Validation
- Errors: [count]
- Warnings: [count]
- Auto-fixed: [count]

### Usage

1. Copy inventory.example to inventory
2. Update hosts and variables
3. Run: ansible-playbook -i inventory playbook.yml
```

## References

- Playbook structure: [playbook-structure.md](/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/playbook-structure.md)
- FQCN modules: [fqcn.md](/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/fqcn.md)
- Patterns: [patterns.md](/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/patterns.md)
- Lint fixes: [lint-fixes.md](/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-playbook/references/lint-fixes.md)
