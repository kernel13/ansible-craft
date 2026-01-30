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

Generate Galaxy-standard Ansible roles with conversational exploration using specialized agents.

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

## Workflow Overview: Conversational Exploration

The workflow uses a **research-driven, conversational exploration** approach where users:
1. See an overview of research findings
2. Choose which topics to explore deeper
3. Get smart defaults applied to unexplored areas
4. Can make natural language modifications at the summary

```
Step 1: Research Phase (Parallel)
        ├── Task(ac-researcher-docs)  → Documentation, Galaxy roles, features
        └── Task(ac-researcher-impl)  → Package options, quality indicators

Step 2: Interactive Overview
        → Display interesting findings (worth exploring)
        → Show standard decisions (smart defaults ready)
        → List optional topics (hidden by default)

Step 3: Topic Exploration Loop
        → User selects topic to explore (or "continue" for defaults)
        → Display topic context with options and trade-offs
        → Ask contextual follow-up questions
        → Record decision or skip (uses default)
        → Repeat until user is done exploring

Step 4: Summary & Natural Language Modification
        → Show what was explored vs defaulted
        → User can type "yes" to proceed OR describe changes
        → Apply modifications: "add CentOS support", "skip molecule"

Step 5: Task(ac-planner)     → Generate plan with exploration results
Step 6: Plan Approval Loop   → Approve/modify/cancel

Step 7: 4 PARALLEL GENERATORS (after approval)
Step 8-9: Validation & Auto-Fix
Step 10: Final Report
```

## Step 1: Research Phase (Parallel Agents)

**Launch 2 researcher agents in parallel to discover features, packages, and best practices:**

```json
[
  {
    "subagent_type": "ac-researcher-docs",
    "description": "Research [role_name] documentation",
    "prompt": "Research documentation and best practices for: [user_description]\n\nRole name: [sanitized_role_name]\n\nFocus on:\n- Galaxy role implementations\n- Common features and patterns\n- Best practices from official docs\n- Community recommendations\n\nReturn structured findings with features (essential/recommended/optional), best practices (critical/recommended), and reference Galaxy roles."
  },
  {
    "subagent_type": "ac-researcher-impl",
    "description": "Research [role_name] packages",
    "prompt": "Research package options and implementation details for: [user_description]\n\nRole name: [sanitized_role_name]\n\nFocus on:\n- System packages (apt, yum, dnf, choco)\n- Package versions and descriptions\n- Implementation patterns\n- Installation best practices\n\nReturn structured findings with packages (name, source, version, isDefault) and implementation features."
  }
]
```

**After research completes, display the Interactive Overview:**

## Step 2: Interactive Overview

Present a **scannable overview** organized by exploration value:

```
## Research Complete for "[role_description]"

### Interesting Findings (explore these)
Topics with depth worth exploring:
  • **SSL/TLS Configuration** - 3 approaches found (Let's Encrypt, self-signed, custom CA)
  • **Virtual Hosts** - Multiple patterns for multi-site setup
  • **Reverse Proxy** - Load balancing options available

### Standard Decisions (smart defaults ready)
Topics with obvious choices:
  ✓ Package: nginx (official)
  ✓ Platforms: Generic
  ✓ Privilege escalation: Required

### Optional Topics (hidden by default)
  Molecule testing, Tags strategy, Variable naming...

### Best Practices
  ! Use FQCN for all modules
  • Implement idempotency with changed_when

### Reference Galaxy Roles
  1. geerlingguy.nginx (⭐⭐⭐⭐⭐ 1.5M downloads)

What would you like to explore? (type topic name or "continue" for defaults)
```

**Use AskUserQuestion for initial topic selection:**

```json
{
  "questions": [{
    "question": "What would you like to explore? Pick a topic or continue with smart defaults.",
    "header": "Explore",
    "options": [
      {"label": "SSL/TLS Configuration", "description": "3 approaches found - Let's Encrypt, self-signed, custom CA"},
      {"label": "Virtual Hosts", "description": "Multiple patterns for multi-site setup"},
      {"label": "Continue with defaults", "description": "Apply smart defaults to all topics and proceed to planning"}
    ],
    "multiSelect": false
  }]
}
```

## Step 3: Topic Exploration Loop

When user selects a topic, enter a **focused conversation**:

**Display topic context:**
```
Research found 3 SSL approaches:
- Let's Encrypt (recommended): Auto-renewing, free, requires certbot
- Self-signed: Quick setup, browser warnings, good for internal
- Custom CA: Enterprise use, manual cert management

Which approach fits your use case?
```

**Use AskUserQuestion for topic decision:**

```json
{
  "questions": [{
    "question": "Which SSL/TLS approach fits your use case?",
    "header": "SSL",
    "options": [
      {"label": "Let's Encrypt (Recommended)", "description": "Auto-renewing free certificates via certbot"},
      {"label": "Self-signed", "description": "Quick setup for internal use, browser warnings"},
      {"label": "Custom CA", "description": "Enterprise certificate management"},
      {"label": "Skip this topic", "description": "Use default (Let's Encrypt) and continue"}
    ],
    "multiSelect": false
  }]
}
```

**After each topic decision, ask if user wants to explore more:**

```json
{
  "questions": [{
    "question": "Explore another topic or continue to summary?",
    "header": "Continue",
    "options": [
      {"label": "Explore another topic", "description": "Choose another topic to configure"},
      {"label": "Continue to summary", "description": "Apply smart defaults to remaining topics"}
    ],
    "multiSelect": false
  }]
}
```

## Step 4: Summary & Natural Language Modification

Present final summary with **natural language modification** capability:

```
## Role Summary: nginx-ssl

### Explored Topics
  ✓ SSL/TLS: Let's Encrypt with webroot
  ✓ Virtual hosts: Multi-site with separate configs

### Applied Defaults
  • Package: nginx from official repos
  • Platforms: Generic
  • Molecule: Basic Docker tests
  • Tags: Per-task strategy

### Structure
  tasks/, handlers/, templates/, defaults/, vars/, meta/, molecule/

Does this look right?
  - Type "yes" to generate
  - Or describe changes: "add CentOS support", "skip molecule tests", etc.
```

**Handle modifications:**

If user types something other than "yes", parse their request:
- "add CentOS support" → Add RHEL to platforms
- "skip molecule tests" → Disable molecule
- "make SSL optional" → Add feature toggle variable
- "remove virtual hosts" → Simplify to single-site config

**Apply modifications and show updated summary**, then ask again until user approves.

## Step 5: Requirements Gathering (Research-Informed) - LEGACY MODE

**NOTE:** This section describes the classic linear wizard. Use the exploration workflow above by default.

For legacy mode or when exploration fails, fall back to these questions:

Use AskUserQuestion to gather requirements. **IMPORTANT: Incorporate research findings into your questions.**

**Features Question (Research-Informed):**

If research discovered features, present them as options:
```json
{
  "question": "What features do you need? (select all that apply)",
  "header": "Features",
  "options": [
    {"label": "[researched feature 1] (essential)", "description": "[description from research]"},
    {"label": "[researched feature 2] (recommended)", "description": "[description from research]"},
    {"label": "[researched feature 3] (optional)", "description": "[description from research]"},
    {"label": "None - basic installation only", "description": "Skip advanced features"}
  ],
  "multiSelect": true
}
```

**Package Selection (Research-Informed):**

If research found packages, ask user to choose:
```json
{
  "question": "Which package should be used for installation?",
  "header": "Package",
  "options": [
    {"label": "[package1] ([source]) (Recommended)", "description": "[description from research]"},
    {"label": "[package2] ([source])", "description": "[description from research]"},
    {"label": "Custom package name", "description": "Specify a different package"}
  ],
  "multiSelect": false
}
```

**Standard Questions (Always Ask):**

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
        {"label": "Package manager (Recommended)", "description": "Use researched packages if available"},
        {"label": "Source/binary", "description": "Download and extract manually"},
        {"label": "Container", "description": "Pull and run Docker image"}
      ],
      "multiSelect": false
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
- Tags: namespaced format `rolename:action` (e.g., `nginx:install`, `nginx:config`)
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

## Step 3: Optional Deep Dive Research (Conditional)

**IMPORTANT:** Only execute this step if:
1. User selected 3+ features in Step 2
2. Features include complex options (SSL/TLS, virtual hosts, caching, etc.)

**Ask user first:**
```
Deep dive research provides detailed implementation guidance for your selected features.
This adds approximately 30 seconds to the planning phase.

Would you like deep dive research on your selected features? (y/N)
```

**If user confirms, launch deep dive researcher:**

```json
{
  "subagent_type": "ac-researcher-deepdive",
  "description": "Deep dive on selected features",
  "prompt": "Deep dive research on selected features for: [user_description]\n\nRole name: [sanitized_role_name]\n\nSelected features:\n- [feature 1]\n- [feature 2]\n- [feature 3]\n\nProvide detailed implementation guidance for each feature:\n- Multiple implementation approaches (simple → complex)\n- Configuration details and best practices\n- Security considerations\n- Common pitfalls to avoid\n\nReturn structured findings with expanded sub-features and feature-specific best practices."
}
```

**After deep dive completes, display expanded findings:**

```
=== Deep Dive Results ===

[Feature 1] Implementation Options:
  • [sub-feature 1] (simple) - [description]
  • [sub-feature 2] (moderate) - [description]
  • [sub-feature 3] (complex) - [description]

[Feature 1] Best Practices:
  ✓ [practice 1] - [rationale]
  ✓ [practice 2] - [rationale]

[Repeat for each feature...]

Proceeding to role planning...
```

## Step 4: Generate Plan ⚠️ AGENT REQUIRED

After gathering requirements (and optional deep dive), **invoke the Task tool** with ac-planner:

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-planner",
    "description": "Plan [role_name] role",
    "prompt": "Generate a role plan for: [user description]\n\n## Research Findings (from Step 1)\n\n[If research found features:]\nDiscovered Features:\n- [feature 1] ([category]) - [description]\n- [feature 2] ([category]) - [description]\n\n[If research found packages:]\nRecommended Packages:\n- [package 1] ([source]): [description]\n\n[If research found best practices:]\nBest Practices:\n- [practice 1] ([priority]): [rationale]\n- [practice 2] ([priority]): [rationale]\n\n[If deep dive was performed:]\nDeep Dive Implementation Details:\n- [feature]: [sub-feature 1] (simple), [sub-feature 2] (moderate)\n\n## User Requirements (from Step 2)\n\n- Platforms: [value]\n- Ansible: [version]\n- Variables: [naming]\n- Handlers: [list]\n- Tags: [strategy]\n- Molecule: [none/basic/advanced]\n- Selected Features: [list from user]\n- Selected Package: [package from user]\n\n[If Molecule is basic - include this block:]\nMolecule config: basic\n  Driver: docker\n  Images: pre-built (geerlingguy/*-ansible)\n  Sequence: standard\n  Verifier: ansible\n\n[If Molecule is advanced - include all collected options from Step 1b:]\nMolecule config: advanced\n  Driver: [docker/podman/vagrant/delegated]\n  Images: [pre-built/custom]               (Docker/Podman only)\n  Options: [standard/privileged/rootless]  (Docker/Podman only)\n  Provider: [virtualbox/libvirt/parallels] (Vagrant only)\n  Resources: [minimal/standard/powerful]   (Vagrant only)\n  Sequence: [standard/with-prepare/with-side-effect/minimal]\n  Verifier: [ansible/testinfra]\n\nService-specific: [answers]\n\nNaming convention:\n- Variables MUST use role name prefix (e.g., nginx_port, apache_user)\n\nRead these references:\n- cc/common/references/role-structure.md\n- cc/common/references/fqcn.md\n- cc/common/references/patterns.md\n- cc/common/references/molecule.md\n\nReturn complete plan with: config summary, variables, tasks with FQCN, handlers, templates, file tree, and Molecule configuration details"
  }
}
```

## Step 5: Plan Approval (Direct) - WITH MODIFICATION LOOP

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

**Important:** The "Other" option is always available, allowing users to type specific modifications directly (e.g., "add backup feature"). Treat any non-"Yes" response as a modification request.

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
    "prompt": "Regenerate role plan with these modifications:\n\nORIGINAL REQUIREMENTS:\n[original requirements from Step 1]\n\nUSER MODIFICATIONS:\n[changes requested by user, e.g., 'add backup feature', 'change variable names']\n\n[rest of planner prompt...]"
  }
}
```

4. **Display the UPDATED plan** to the user
5. **Ask for approval again** - repeat until user approves or cancels

This loop ensures the user can iteratively refine the plan before any code is generated.

## Step 6: Generate Files ⚠️ AGENTS REQUIRED (Parallel)

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

## Step 7-8: Validation ⚠️ AGENTS REQUIRED (Parallel)

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

## Step 9: Auto-Fix ⚠️ AGENT REQUIRED (If Needed)

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

## Step 10: Final Report (Direct)

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
