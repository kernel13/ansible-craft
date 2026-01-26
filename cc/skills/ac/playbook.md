---
name: ac:playbook
description: Generate production-ready Ansible playbooks from natural language descriptions. Use when user asks to create a playbook, deploy stack, configure multiple hosts, or orchestrate tasks. Triggers on "playbook to deploy", "configure servers", "deploy LAMP/LEMP stack", "set up cluster".
allowed-tools:
  - Task
  - AskUserQuestion
  - Read
  - Glob
  - Grep
  - Bash
---

# Ansible Playbook Generator

Generate production-ready playbooks with multi-play structure, group variables, and inventory templates using specialized agents.

## Workflow Overview

```
Step 1: AskUserQuestion → Gather requirements (this skill)
Step 2: Task(ac-planner) → Generate structured plan
Step 3: Display plan → User approval (this skill)
        ↓
        ├── "Yes" → Proceed to Step 4
        ├── "Modify" → Collect changes, LOOP BACK to Step 2 with modifications
        └── "No" → Cancel generation

Step 4: Task(ac-generator) → Generate playbook files
Step 5: Task(ac-validator) → Validate code (parallel)
Step 6: Task(ac-linter) → Run ansible-lint (parallel)
Step 7: Task(ac-fixer) → Auto-fix violations (if any)
Step 8: Display results → Show file tree (this skill)
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

## Step 2: Generate Plan

After gathering requirements, invoke the planner agent:

```
Task(ac-planner):
  prompt: |
    Generate a playbook plan for: [user's description]

    Requirements gathered:
    - Platforms: [from questions]
    - Architecture: [single/multi-server]
    - Task organization: [inline/roles/mixed]
    - Features: [firewall, DB init, SSL, validation, health checks, rolling]

    Load references:
    - cc/common/references/playbook-structure.md
    - cc/common/references/fqcn.md
    - cc/common/references/patterns.md

    Return a complete plan with:
    - Playbook description
    - Plays with hosts and tasks
    - pre_tasks for validation
    - post_tasks for verification
    - Group variables structure
    - Inventory groups needed
    - File tree preview
```

## Step 3: Plan Approval - WITH MODIFICATION LOOP

Display the plan:

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

---
Approve this plan? (yes/modify/no)
```

Use AskUserQuestion for approval with these options:
- **Yes, generate the playbook** - Proceed to Step 4
- **Modify the plan** - User provides changes
- **Cancel** - Stop generation

**AskUserQuestion Example:**
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

**Important:** The "Other" option is always available, allowing users to type specific modifications directly. Treat any non-"Yes" response as a modification request.

### CRITICAL: Modification Loop

**When user selects "Modify" or provides modification text:**

1. **DO NOT proceed to generation (Step 4)**
2. **Collect the user's requested changes** (playbook name, features, plays, etc.)
3. **Re-invoke ac-planner** with the original requirements PLUS the modifications:

```
Task(ac-planner):
  prompt: |
    Regenerate playbook plan with these modifications:

    ORIGINAL REQUIREMENTS:
    [original requirements from Step 1]

    USER MODIFICATIONS:
    [changes requested by user, e.g., 'rename to deploy_lamp', 'add backup play']

    [rest of planner prompt...]
```

4. **Display the UPDATED plan** to the user
5. **Ask for approval again** - repeat until user approves or cancels

This loop ensures the user can iteratively refine the plan before any code is generated.

## Step 4: Generate Files

After approval, invoke the generator agent:

```
Task(ac-generator):
  prompt: |
    Generate playbook files based on this approved plan:

    [Full plan content]

    Output directory: [playbook_name]/

    Create structure:
    - playbook.yml (main playbook)
    - inventory.example (example inventory)
    - group_vars/all.yml (global variables)
    - group_vars/[group].yml (per-group variables)
    - README.md (usage instructions)

    Load references:
    - cc/common/references/playbook-structure.md
    - cc/common/references/fqcn.md
    - cc/common/references/patterns.md
```

## Step 5-6: Validation (Parallel)

Run validator and linter in parallel:

```
Task(ac-validator):
  prompt: |
    Validate the generated playbook at: [playbook_name]/

    Check for:
    - YAML syntax
    - FQCN compliance
    - Idempotency patterns
    - Variable references valid

    Return validation report with file:line references.

Task(ac-linter):
  prompt: |
    Run ansible-lint on: [playbook_name]/playbook.yml

    Execute: ansible-lint [playbook_name]/playbook.yml

    Parse output and return:
    - Errors (blocking)
    - Warnings (non-blocking)
    - Auto-fixable issues
    - Fix suggestions
```

## Step 7: Auto-Fix

If violations found, invoke the fixer agent:

```
Task(ac-fixer):
  prompt: |
    Apply fixes for these violations:

    [Violations from ac-validator and ac-linter]

    Playbook path: [playbook_name]/

    Load references:
    - cc/common/references/lint-fixes.md
    - cc/common/references/fqcn.md

    Apply auto-fixes and report results.
```

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

## Key Requirements

### FQCN - Always use fully qualified names
See [role/references/fqcn.md](role/references/fqcn.md) for complete mapping.

### Play Execution Order
```
1. pre_tasks     → Validation, prerequisite checks
2. roles         → If using roles
3. tasks         → Main work
4. handlers      → Triggered by notify
5. post_tasks    → Verification, health checks
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

### Idempotency & YAML Formatting
See [role/references/patterns.md](role/references/patterns.md) for complete patterns.

### Windows Considerations
- Use `ansible.windows.*` modules
- WinRM connection in inventory:
  ```ini
  [windows:vars]
  ansible_connection=winrm
  ansible_winrm_transport=ntlm
  ```

### Rolling Updates
```yaml
- name: Rolling update
  hosts: webservers
  serial: 1              # One host at a time
  max_fail_percentage: 25
```

## Agents Used

| Agent | Purpose | Tools |
|-------|---------|-------|
| ac-planner | Generate playbook plan | Read, Grep, Glob, WebSearch |
| ac-generator | Create playbook files | Read, Write, Grep, Glob |
| ac-validator | Static validation | Read, Grep, Glob |
| ac-linter | Run ansible-lint | Read, Bash, Grep |
| ac-fixer | Apply auto-fixes | Read, Edit, Grep |

## References

- Playbook structure: [playbook-structure.md](../../common/references/playbook-structure.md)
- FQCN modules: [fqcn.md](../../common/references/fqcn.md)
- Patterns: [patterns.md](../../common/references/patterns.md)
- Lint fixes: [lint-fixes.md](../../common/references/lint-fixes.md)
