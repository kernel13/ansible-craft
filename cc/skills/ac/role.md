---
name: ac:role
description: Generate production-ready Ansible roles from natural language descriptions. Use when user asks to create, generate, or build an Ansible role. Triggers on "create a role for", "ansible role that", "role to install/configure". Covers 10 topics through interactive questions with sensible defaults.
allowed-tools:
  - Task
  - AskUserQuestion
  - Read
  - Glob
  - Grep
  - Bash
---

# Ansible Role Generator

Generate Galaxy-standard Ansible roles with interactive configuration using specialized agents.

## CRITICAL: Agent Usage Required

**YOU MUST use the Task tool to invoke specialized agents.** Do NOT generate role files directly with Write tool. The agents provide validated, production-ready output.

```
╔═══════════════════════════════════════════════════════════════════════╗
║  MANDATORY: Use Task tool with subagent_type parameter                ║
║                                                                       ║
║  You MUST call the Task tool like this:                               ║
║                                                                       ║
║  Task tool parameters:                                                ║
║    subagent_type: "ac-planner"     (or ac-generator, etc.)            ║
║    description: "Plan nginx role"  (short 3-5 word description)       ║
║    prompt: "Generate a role plan for..."  (full instructions)         ║
║                                                                       ║
║  DO NOT skip agents. DO NOT use Write tool directly for role files.   ║
╚═══════════════════════════════════════════════════════════════════════╝
```

## Workflow Overview

```
Step 1: AskUserQuestion      → Gather requirements (direct - no agent)
Step 2: Task(ac-planner)     → Generate structured plan ⚠️ AGENT REQUIRED
Step 3: Display plan         → User approval (direct - no agent)
        ↓
        ├── "Yes" → Proceed to Step 4
        ├── "Modify" → Collect changes, LOOP BACK to Step 2 with modifications
        └── "No" → Cancel generation

Step 4: 4 PARALLEL GENERATORS:
        ├── Task(ac-generator-core)       → defaults, vars, handlers, meta, README
        ├── Task(ac-generator-tasks)      → tasks/*.yml
        ├── Task(ac-generator-templates)  → templates/*.j2
        └── Task(ac-generator-molecule)   → molecule/**/*
Step 5: Task(ac-validator)   → Validate code ⚠️ AGENT REQUIRED (parallel)
Step 6: Task(ac-linter)      → Run ansible-lint ⚠️ AGENT REQUIRED (parallel)
Step 7: Task(ac-fixer)       → Auto-fix violations ⚠️ AGENT REQUIRED (if needed)
Step 8: Display results      → Show file tree (direct - no agent)
```

## Step 1: Requirements Gathering (Direct)

Use AskUserQuestion to gather requirements. Combine questions efficiently (max 4 questions per call, max 4 options each).

**Core Questions Example:**
```json
{
  "questions": [
    {
      "question": "Which Ansible version should this role support?",
      "header": "Ansible",
      "options": [
        {"label": "2.14+ (Recommended)", "description": "Latest stable with full support"},
        {"label": "2.12+", "description": "Older LTS version"},
        {"label": "2.16+", "description": "Cutting edge features"}
      ],
      "multiSelect": false
    },
    {
      "question": "How should the software be installed?",
      "header": "Install",
      "options": [
        {"label": "Package manager (Recommended)", "description": "apt/yum for Linux, Chocolatey for Windows"},
        {"label": "Source/binary", "description": "Download and extract manually"},
        {"label": "Container", "description": "Pull and run Docker image"}
      ],
      "multiSelect": false
    },
    {
      "question": "What features do you need? (select all that apply)",
      "header": "Features",
      "options": [
        {"label": "SSL/TLS support", "description": "HTTPS configuration"},
        {"label": "Virtual hosts", "description": "Multiple site configurations"},
        {"label": "Firewall rules", "description": "Open required ports"},
        {"label": "Basic only", "description": "Minimal installation"}
      ],
      "multiSelect": true
    },
    {
      "question": "Molecule testing level?",
      "header": "Testing",
      "options": [
        {"label": "Basic (Recommended)", "description": "Quick setup with sensible defaults"},
        {"label": "Advanced", "description": "Full control over driver, images, test sequence"},
        {"label": "None", "description": "Skip Molecule test scaffolding"}
      ],
      "multiSelect": false
    }
  ]
}
```

**IMPORTANT: multiSelect Guidelines:**
- `multiSelect: true` for **features** (SSL, virtual hosts, firewall, etc.) - users often want combinations
- `multiSelect: false` for **single-choice** questions (Ansible version, install method, yes/no)

**Apply defaults for non-selected/skipped topics:**
- Platform: Generic
- Ansible: 2.14
- Variables: prefixed (e.g., nginx_port)
- Privilege: yes (become: true)
- Handlers: restart, reload
- Tags: grouped (install, config, service)
- Idempotency: check mode + changed_when
- Molecule: basic level, docker driver, ansible verifier

**Molecule Testing Levels:**
- **none**: Disabled, no molecule files generated
- **basic**: Driver selection only, then apply sensible defaults:
  - docker/podman: geerlingguy/*-ansible images, privileged: false
  - vagrant: generic/* boxes, virtualbox, standard resources (1GB/2CPU)
  - delegated: managed: false
  - All: verifier: ansible, test_sequence: [create, converge, idempotence, verify, destroy]
- **advanced**: Full configuration with follow-up questions (see Step 1b below)

**Service-Specific Feature Options** (adapt based on role type):
- **Web servers** (Apache, Nginx): SSL/TLS, virtual hosts, reverse proxy, caching
- **Databases** (MySQL, PostgreSQL): DB creation, user management, backups, replication
- **Windows roles**: Add installation method question (Chocolatey, MSI, ZIP)

### Role Naming Conventions

**Windows roles MUST use the `win_` prefix:**
- `win_apache` (not `apache_windows` or `apache`)
- `win_iis`
- `win_sqlserver`
- `win_chocolatey`

**Linux/Generic roles use descriptive names:**
- `nginx`
- `postgresql`
- `docker`

When the user selects Windows as the platform, automatically apply the `win_` prefix to the role name. If the user provides a name without the prefix, add it (e.g., "apache" → "win_apache").

## Step 1b: Advanced Molecule Configuration (Conditional)

**IMPORTANT:** This step is ONLY executed when the user selects "Advanced" for the Molecule testing question in Step 1. If user selects "Basic" or "None", skip directly to Step 2.

### Driver Selection

When Testing = "Advanced", first ask which driver to use:

```json
{
  "questions": [{
    "question": "Which Molecule test driver should be used?",
    "header": "Driver",
    "options": [
      {"label": "Docker (Recommended)", "description": "Container-based testing, fastest"},
      {"label": "Podman", "description": "Rootless container testing"},
      {"label": "Vagrant", "description": "VM-based testing with full OS"},
      {"label": "Delegated", "description": "External/CI managed instances"}
    ],
    "multiSelect": false
  }]
}
```

### Driver-Specific Questions

Based on the driver selection, ask the relevant follow-up questions:

**For Docker or Podman:**

```json
{
  "questions": [
    {
      "question": "Which container images should be used?",
      "header": "Images",
      "options": [
        {"label": "Pre-built Ansible images (Recommended)", "description": "geerlingguy/*-ansible images with Ansible pre-installed"},
        {"label": "Custom images", "description": "Specify your own container images in molecule.yml"}
      ],
      "multiSelect": false
    },
    {
      "question": "Container runtime options? (select all that apply)",
      "header": "Options",
      "options": [
        {"label": "Standard mode (Recommended)", "description": "No special privileges, most secure"},
        {"label": "Privileged mode", "description": "Enable for systemd/service testing"},
        {"label": "Rootless mode", "description": "Podman only - run without root privileges"}
      ],
      "multiSelect": true
    }
  ]
}
```

**For Vagrant:**

```json
{
  "questions": [
    {
      "question": "Which Vagrant provider should be used?",
      "header": "Provider",
      "options": [
        {"label": "VirtualBox (Recommended)", "description": "Most common, works on all platforms"},
        {"label": "Libvirt", "description": "KVM/QEMU on Linux, better performance"},
        {"label": "Parallels", "description": "macOS only, native performance"}
      ],
      "multiSelect": false
    },
    {
      "question": "How much VM resources?",
      "header": "Resources",
      "options": [
        {"label": "Minimal", "description": "512MB RAM, 1 CPU - for lightweight roles"},
        {"label": "Standard (Recommended)", "description": "1GB RAM, 2 CPUs - balanced"},
        {"label": "Powerful", "description": "2GB RAM, 4 CPUs - for heavy workloads"}
      ],
      "multiSelect": false
    }
  ]
}
```

**For Delegated:**

No driver-specific questions needed - delegated driver configuration is minimal.

### Common Advanced Questions

After driver-specific questions, ask these for all drivers:

```json
{
  "questions": [
    {
      "question": "Which test sequence configuration?",
      "header": "Sequence",
      "options": [
        {"label": "Standard (Recommended)", "description": "create → converge → idempotence → verify → destroy"},
        {"label": "With prepare", "description": "Add prepare stage before converge for pre-setup"},
        {"label": "With side_effect", "description": "Add side_effect stage after verify for cleanup"},
        {"label": "Minimal", "description": "converge → verify only - fastest for development"}
      ],
      "multiSelect": false
    },
    {
      "question": "Which verifier should be used?",
      "header": "Verifier",
      "options": [
        {"label": "Ansible (Recommended)", "description": "verify.yml playbook with ansible.builtin.assert tasks"},
        {"label": "Testinfra", "description": "Python tests with pytest - more powerful assertions"}
      ],
      "multiSelect": false
    }
  ]
}
```

### Passing Advanced Options to ac-planner

When calling ac-planner in Step 2, include all advanced Molecule options in the prompt:

```
Molecule: advanced
  Driver: [docker/podman/vagrant/delegated]
  Images: [pre-built/custom]        # Docker/Podman only
  Options: [standard/privileged/rootless]  # Docker/Podman only
  Provider: [virtualbox/libvirt/parallels]  # Vagrant only
  Resources: [minimal/standard/powerful]    # Vagrant only
  Sequence: [standard/with-prepare/with-side-effect/minimal]
  Verifier: [ansible/testinfra]
```

## Step 2: Generate Plan ⚠️ AGENT REQUIRED

After gathering requirements, **invoke the Task tool** with ac-planner:

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-planner",
    "description": "Plan [role_name] role",
    "prompt": "Generate a role plan for: [user description]\n\nRequirements:\n- Platforms: [value]\n- Ansible: [version]\n- Variables: [naming]\n- Handlers: [list]\n- Tags: [strategy]\n- Molecule: [none/basic/advanced]\n\n[If Molecule is basic - include this block:]\nMolecule config: basic\n  Driver: docker\n  Images: pre-built (geerlingguy/*-ansible)\n  Sequence: standard\n  Verifier: ansible\n\n[If Molecule is advanced - include all collected options from Step 1b:]\nMolecule config: advanced\n  Driver: [docker/podman/vagrant/delegated]\n  Images: [pre-built/custom]               (Docker/Podman only)\n  Options: [standard/privileged/rootless]  (Docker/Podman only)\n  Provider: [virtualbox/libvirt/parallels] (Vagrant only)\n  Resources: [minimal/standard/powerful]   (Vagrant only)\n  Sequence: [standard/with-prepare/with-side-effect/minimal]\n  Verifier: [ansible/testinfra]\n\nService-specific: [answers]\n\nNaming convention:\n- Windows roles MUST use 'win_' prefix (e.g., win_apache, win_iis)\n- Variables MUST use role name prefix (e.g., win_apache_port)\n\nRead these references:\n- cc/common/references/role-structure.md\n- cc/common/references/fqcn.md\n- cc/common/references/patterns.md\n- cc/common/references/molecule.md\n\nReturn complete plan with: config summary, variables, tasks with FQCN, handlers, templates, file tree, and Molecule configuration details"
  }
}
```

## Step 3: Plan Approval (Direct) - WITH MODIFICATION LOOP

Display the plan from ac-planner and ask user to approve:

```
## Role Plan: [role_name]

[Plan content from ac-planner agent]

---
Approve this plan? (yes/modify/no)
```

Use AskUserQuestion for approval with these options:
- **Yes, generate the role** - Proceed to Step 4
- **Modify the plan** - User provides changes
- **Cancel** - Stop generation

**AskUserQuestion Example:**
```json
{
  "questions": [{
    "question": "Approve this plan for the [role_name] role?",
    "header": "Approval",
    "options": [
      {"label": "Yes, generate the role", "description": "Proceed with generating all role files"},
      {"label": "Modify the plan", "description": "Request changes before generating (will show updated plan)"},
      {"label": "Cancel", "description": "Stop role generation"}
    ],
    "multiSelect": false
  }]
}
```

**Important:** The "Other" option is always available, allowing users to type specific modifications directly (e.g., "rename to win_apache"). Treat any non-"Yes" response as a modification request.

### CRITICAL: Modification Loop

**When user selects "Modify" or provides modification text:**

1. **DO NOT proceed to generation (Step 4)**
2. **Collect the user's requested changes** (role name, features, variables, etc.)
3. **Re-invoke ac-planner** with the original requirements PLUS the modifications:

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-planner",
    "description": "Re-plan [role_name] with changes",
    "prompt": "Regenerate role plan with these modifications:\n\nORIGINAL REQUIREMENTS:\n[original requirements from Step 1]\n\nUSER MODIFICATIONS:\n[changes requested by user, e.g., 'rename to win_apache', 'add backup feature']\n\n[rest of planner prompt...]"
  }
}
```

4. **Display the UPDATED plan** to the user
5. **Ask for approval again** - repeat until user approves or cancels

This loop ensures the user can iteratively refine the plan before any code is generated.

## Step 4: Generate Files ⚠️ AGENTS REQUIRED (Parallel)

After approval, **invoke 4 Task tool calls in PARALLEL** with specialized generators:

```json
[
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-generator-core",
      "description": "Generate [role_name] core files",
      "prompt": "Generate core role files based on this approved plan:\n\n[Full plan from ac-planner]\n\nOutput directory: roles/[role_name]/\n\nYour scope:\n- defaults/main.yml\n- vars/main.yml\n- handlers/main.yml\n- meta/main.yml\n- README.md\n\nRequirements:\n- Role-prefix all variables\n- YAML: 2-space indent, true/false\n- FQCN in handlers"
    }
  },
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-generator-tasks",
      "description": "Generate [role_name] task files",
      "prompt": "Generate task files based on this approved plan:\n\n[Full plan from ac-planner]\n\nOutput directory: roles/[role_name]/\n\nYour scope:\n- tasks/main.yml\n- tasks/install.yml\n- tasks/configure.yml\n- tasks/service.yml\n- Any additional task files from plan\n\nRequirements:\n- Use FQCN for ALL modules\n- Apply idempotency patterns\n- Role-prefix all variables and registers"
    }
  },
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-generator-templates",
      "description": "Generate [role_name] templates",
      "prompt": "Generate template files based on this approved plan:\n\n[Full plan from ac-planner]\n\nOutput directory: roles/[role_name]/\n\nYour scope:\n- templates/*.j2 (all Jinja2 templates)\n\nRequirements:\n- Include ansible_managed header\n- Use role-prefixed variables\n- Proper Jinja2 syntax with conditionals"
    }
  },
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-generator-molecule",
      "description": "Generate [role_name] molecule tests",
      "prompt": "Generate Molecule test files based on this approved plan:\n\n[Full plan from ac-planner]\n\nMolecule configuration from plan:\n[Include the Molecule config block from the plan - basic or advanced]\n\nOutput directory: roles/[role_name]/\n\nYour scope:\n- molecule/default/molecule.yml\n- molecule/default/requirements.yml\n- molecule/default/converge.yml\n- molecule/default/verify.yml\n- molecule/default/prepare.yml (if sequence includes prepare)\n- molecule/default/side_effect.yml (if sequence includes side_effect)\n- tests/test_*.py (if verifier is testinfra)\n\nRequirements:\n- Configure driver as specified (docker/podman/vagrant/delegated)\n- For docker/podman: use specified images (pre-built geerlingguy/*-ansible or custom placeholders)\n- For docker/podman: set privileged mode if requested\n- For vagrant: configure provider and VM resources as specified\n- Configure test sequence stages as specified\n- Use specified verifier (ansible or testinfra)\n- Use delegated driver for Windows roles\n- Include verification tests for service and ports\n- Role-prefix all registered variables"
    }
  }
]
```

**Note:** All 4 generators run in parallel for faster role generation. Each generator handles a specific subset of files to avoid conflicts.

## Step 5-6: Validation ⚠️ AGENTS REQUIRED (Parallel)

Run validator and linter **in parallel** using two Task tool calls in the same message:

```json
[
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-validator",
      "description": "Validate [role_name] role",
      "prompt": "Validate role at: roles/[role_name]/\n\nCheck:\n- YAML syntax\n- FQCN compliance\n- Idempotency patterns\n- Variable naming\n\nReturn validation report with file:line references."
    }
  },
  {
    "tool": "Task",
    "parameters": {
      "subagent_type": "ac-linter",
      "description": "Lint [role_name] role",
      "prompt": "Run ansible-lint on: roles/[role_name]/\n\nExecute: ansible-lint roles/[role_name]/\n\nParse and return:\n- Errors (blocking)\n- Warnings (non-blocking)\n- Auto-fixable issues\n- Fix suggestions"
    }
  }
]
```

## Step 7: Auto-Fix ⚠️ AGENT REQUIRED (If Needed)

If violations found, **invoke the Task tool** with ac-fixer:

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-fixer",
    "description": "Fix [role_name] violations",
    "prompt": "Apply fixes for these violations:\n\n[Violations from ac-validator and ac-linter]\n\nRole path: roles/[role_name]/\n\nRead references:\n- cc/common/references/lint-fixes.md\n- cc/common/references/fqcn.md\n\nApply auto-fixes and report what was fixed vs requires manual intervention."
  }
}
```

## Step 8: Final Report (Direct)

Display final results using Bash to show file tree:

```
## Role Generation Complete

**Role:** [role_name]
**Location:** roles/[role_name]/

### File Tree
[output from: find roles/[role_name] -type f | sort]

### Validation
- Errors: [count]
- Warnings: [count]
- Auto-fixed: [count]

### Next Steps
1. Review generated files
2. Test with: `molecule test` (if molecule enabled)
3. Install dependencies: [list required collections]
```

## Key Requirements

### FQCN - Always use fully qualified names
```yaml
# Correct
ansible.builtin.apt:
ansible.windows.win_service:
chocolatey.chocolatey.win_chocolatey:

# Wrong
apt:
win_service:
```

### Idempotency
- Always specify `state:` parameter
- Use handlers for service restarts (notify:)
- Add `creates:` for command idempotency
- Use `changed_when: false` for read-only commands

### YAML Formatting
- 2-space indentation
- `true`/`false` not `yes`/`no`
- Quote Jinja2: `"{{ var }}"`
- Quote modes: `mode: '0644'`
- Prefix variables: `role_name_varname`

### Windows Considerations
- **Role name MUST start with `win_`** (e.g., `win_apache`, `win_iis`, `win_sqlserver`)
- **Variables MUST use role prefix** (e.g., `win_apache_port`, `win_iis_site_name`)
- Use `ansible.windows.*` modules
- Use `chocolatey.chocolatey.win_chocolatey` for packages
- Molecule requires `delegated` driver (not docker)
- WinRM connection settings in molecule.yml

## Agents Reference

| Agent | Purpose | Tools Available |
|-------|---------|-----------------|
| ac-planner | Generate role plan from requirements | Read, Grep, Glob, WebSearch, mcp__context7__* |
| ac-generator-core | Core files: defaults, vars, handlers, meta, README | Read, Write, Grep, Glob |
| ac-generator-tasks | Task files: tasks/*.yml | Read, Write, Grep, Glob |
| ac-generator-templates | Template files: templates/*.j2 | Read, Write, Grep, Glob |
| ac-generator-molecule | Molecule tests: molecule/**/* | Read, Write, Grep, Glob |
| ac-validator | Static code validation | Read, Grep, Glob |
| ac-linter | Run ansible-lint | Read, Bash, Grep, Glob |
| ac-fixer | Apply lint auto-fixes | Read, Edit, Grep, Glob |

## Reference Files

Agents should read these for guidance:
- Role structure: [role-structure.md](../../common/references/role-structure.md)
- FQCN modules: [fqcn.md](../../common/references/fqcn.md)
- Patterns: [patterns.md](../../common/references/patterns.md)
- Lint fixes: [lint-fixes.md](../../common/references/lint-fixes.md)
- Molecule: [molecule.md](../../common/references/molecule.md)
