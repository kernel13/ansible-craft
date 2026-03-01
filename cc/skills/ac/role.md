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

## Workflow Overview: Simplified Pipeline

The workflow uses a **research-driven, conversational exploration** approach with a streamlined agent pipeline (7-9 agent calls, down from 11-13).

```
Step 1:  Task(ac-researcher)           — single consolidated research pass
Step 2:  Interactive Overview           — display findings, smart defaults
Step 3:  Topic Exploration Loop         — user selects topics or continues
Step 4:  Summary & Modification         — confirm or describe changes
Step 5:  [Optional] Task(ac-researcher) — deeper dive on selected features
Step 6:  Read reference files           — direct Read, no agent
Step 7:  Task(ac-planner)              — synthesis (receives research + refs)
Step 8:  Plan Approval Loop             — approve/modify/cancel
Step 9:  3x generators in parallel      — core+templates/tasks/molecule
Step 10: ac-validator                   — static checks + ansible-lint
Step 11: ac-fixer (conditional)         — only if violations found
Step 12: Final report                   — no agent
```

**Agent calls: 6-8** (1 researcher + 1 planner + 3 generators + 1 validator + conditional fixer)

## Step 1: Research Phase (Single Agent)

**Launch 1 researcher agent for a comprehensive research pass:**

```json
{
  "subagent_type": "ac-researcher",
  "description": "Research [role_name] documentation",
  "prompt": "Research documentation, best practices, and implementation details for: [user_description]\n\nRole name: [sanitized_role_name]\n\nConduct a comprehensive single-pass research covering:\n- Galaxy API search for popular roles\n- Feature discovery and classification (essential/recommended/optional)\n- Service configuration: config paths, service names, ports per platform\n- Platform differences (Debian vs RHEL vs Windows)\n- Best practices and security recommendations\n- Common pitfalls\n\nReturn structured JSON with features (including exploreHint and alternatives for complex ones), bestPractices, galaxyRoles, serviceConfig, platformDifferences, securityRecommendations, and commonPitfalls."
}
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

## Step 5: Optional Deep Dive Research (Conditional)

**IMPORTANT:** Only execute this step if:
1. User selected 3+ features
2. Features include complex options (SSL/TLS, virtual hosts, caching, etc.)

**Ask user first:**
```
Deep dive research provides detailed implementation guidance for your selected features.
This adds approximately 30 seconds to the planning phase.

Would you like deep dive research on your selected features? (y/N)
```

**If user confirms, re-invoke ac-researcher with a focused prompt:**

```json
{
  "subagent_type": "ac-researcher",
  "description": "Deep dive on selected features",
  "prompt": "Deep dive research on selected features for: [user_description]\n\nRole name: [sanitized_role_name]\n\nSelected features:\n- [feature 1]\n- [feature 2]\n- [feature 3]\n\nFor each feature, research:\n- Multiple implementation approaches (simple → complex)\n- Configuration details and best practices\n- Security considerations\n- Common pitfalls to avoid\n\nReturn structured findings with expanded sub-features and feature-specific best practices."
}
```

## Step 6: Read Reference Files (Direct — No Agent)

**Read reference files directly** using the Read tool. Do NOT spawn an agent for this.

Read these files and extract relevant sections based on the role's platforms and features:

1. **`cc/common/references/role-structure.md`** — Always include full structure
2. **`cc/common/references/fqcn.md`** — Filter by platform:
   - Linux-only: include `ansible.builtin.*`, `ansible.posix.*`, skip Windows
   - Windows-only: include `ansible.windows.*`, `chocolatey.*`, skip Linux
   - Multi-platform: include all
3. **`cc/common/references/patterns.md`** — Include idempotency, validation, variable naming. Filter by features (SSL patterns if SSL selected, etc.)
4. **`cc/common/references/molecule.md`** — Skip if molecule=none. Filter by driver (docker/vagrant/delegated).

Pass the relevant excerpts to ac-planner in the next step.

## Step 7: Generate Plan ⚠️ AGENT REQUIRED

**Invoke the Task tool** with ac-planner, passing ALL context in the prompt:

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-planner",
    "description": "Plan [role_name] role",
    "prompt": "Generate a role plan for: [user description]\n\n## Research Findings (from ac-researcher)\n\n[Paste full output from ac-researcher agent]\n\n[If deep dive was performed:]\n## Deep Dive Implementation Details\n\n[Paste deep dive output]\n\n## User Requirements (from exploration)\n\n- Platforms: [value]\n- Ansible: [version]\n- Variables: [naming]\n- Handlers: [list]\n- Tags: [strategy]\n- Molecule: [none/basic/advanced]\n- Selected Features: [list from user]\n\n[If Molecule is basic:]\nMolecule config: basic\n  Driver: docker\n  Images: pre-built (geerlingguy/*-ansible)\n  Sequence: standard\n  Verifier: ansible\n\n[If Molecule is advanced:]\nMolecule config: advanced\n  Driver: [docker/podman/vagrant/delegated]\n  [driver-specific options...]\n  Sequence: [standard/with-prepare/with-side-effect/minimal]\n  Verifier: [ansible/testinfra]\n\nService-specific: [answers]\n\nNaming convention:\n- Variables MUST use role name prefix (e.g., nginx_port, apache_user)\n\n## Reference Context\n\n[Paste relevant excerpts from reference files read in Step 6]\n\nReturn complete plan with: config summary, variables, tasks with FQCN, handlers, templates, file tree, and Molecule configuration details"
  }
}
```

## Step 8: Plan Approval (Direct) - WITH MODIFICATION LOOP

Display the plan from ac-planner and ask user to approve:

```
## Role Plan: [role_name]

[Plan content from ac-planner agent]

---
Approve this plan? (yes/modify/no)
```

Use AskUserQuestion for approval with these options:
- **Yes, generate the role** - Proceed to Step 9
- **Modify the plan** - User provides changes
- **Cancel** - Stop generation

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

### When User Approves ("Yes, generate the role")

Your NEXT response after approval MUST contain exactly 3 Task tool calls to the generator agents (Step 9). Do NOT use Write, Edit, or Bash to create any role files. The generators load reference files, validate FQCN usage, and apply idempotency patterns that writing directly would skip. Proceed immediately to Step 9.

### CRITICAL: Modification Loop

**When user selects "Modify" or provides modification text:**

1. **DO NOT proceed to generation (Step 9)**
2. **Collect the user's requested changes**
3. **Re-invoke ac-planner** with the original requirements PLUS the modifications:

```json
{
  "subagent_type": "ac-planner",
  "description": "Re-plan [role_name] with changes",
  "prompt": "Regenerate role plan with these modifications:\n\nORIGINAL REQUIREMENTS:\n[original requirements]\n\nUSER MODIFICATIONS:\n[changes requested by user]\n\n[Include cached research + reference context]\n\nReturn updated plan..."
}
```

4. **Display the UPDATED plan** to the user
5. **Ask for approval again** — repeat until user approves or cancels

**IMPORTANT:** Do NOT re-run ac-researcher or re-read reference files during modifications. Re-invoke only ac-planner with the cached research + refs plus the user's modifications.

## Step 9: Generate Files ⚠️ AGENTS REQUIRED (Parallel)

**STOP — DO NOT use Write tool here.** Pass the plan to the 3 generator agents below.

After approval, **invoke 3 Task tool calls in PARALLEL**:

```json
[
  {
    "subagent_type": "ac-generator-core",
    "description": "Generate [role_name] core files",
    "prompt": "Generate core role files and templates based on this approved plan:\n\n[Full plan from ac-planner]\n\nOutput directory: roles/[role_name]/\n\nYour scope: defaults/main.yml, vars/main.yml, handlers/main.yml, meta/main.yml, README.md, templates/*.j2"
  },
  {
    "subagent_type": "ac-generator-tasks",
    "description": "Generate [role_name] task files",
    "prompt": "Generate task files based on this approved plan:\n\n[Full plan from ac-planner]\n\nOutput directory: roles/[role_name]/\n\nYour scope: tasks/main.yml, tasks/validate_params.yml, tasks/install.yml, tasks/configure.yml, tasks/service.yml, tasks/validate.yml, and any additional task files from plan"
  },
  {
    "subagent_type": "ac-generator-molecule",
    "description": "Generate [role_name] molecule tests",
    "prompt": "Generate Molecule test files based on this approved plan:\n\n[Full plan from ac-planner]\n\nMolecule configuration from plan:\n[Include the Molecule config block]\n\nOutput directory: roles/[role_name]/\n\nYour scope: molecule/default/* and tests/ (if testinfra)"
  }
]
```

## Step 10: Validation ⚠️ AGENT REQUIRED

Run combined validation (static checks + ansible-lint):

```json
{
  "subagent_type": "ac-validator",
  "description": "Validate [role_name] role",
  "prompt": "Validate role at: roles/[role_name]/\n\nPhase 1: Static checks — YAML syntax, FQCN compliance, idempotency patterns, variable naming.\nPhase 2: Run ansible-lint — execute `ansible-lint roles/[role_name]/`, parse violations.\n\nReturn combined validation report with file:line references, auto-fixable issues, and fix suggestions."
}
```

## Step 11: Auto-Fix ⚠️ AGENT REQUIRED (If Needed)

If violations found, **invoke ac-fixer**:

```json
{
  "subagent_type": "ac-fixer",
  "description": "Fix [role_name] violations",
  "prompt": "Apply fixes for these violations:\n\n[Violations from ac-validator]\n\nRole path: roles/[role_name]/\n\nApply auto-fixes and report what was fixed vs requires manual intervention."
}
```

## Step 12: Final Report (Direct)

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

## Legacy: Requirements Gathering (Research-Informed)

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
- **basic**: Docker driver, geerlingguy images, standard test sequence, ansible verifier
- **advanced**: Full configuration with follow-up questions (driver, images, sequence, verifier)

## Legacy Sub-Step: Advanced Molecule Configuration (Conditional)

**IMPORTANT:** Only executed when user selects "Advanced" for Molecule.

### Driver Selection

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

**For Docker or Podman:**
```json
{
  "questions": [
    {
      "question": "Which container images should be used?",
      "header": "Images",
      "options": [
        {"label": "Pre-built Ansible images (Recommended)", "description": "geerlingguy/*-ansible images with Ansible pre-installed"},
        {"label": "Custom images", "description": "Specify your own container images"}
      ],
      "multiSelect": false
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
        {"label": "Libvirt", "description": "KVM/QEMU on Linux"},
        {"label": "Parallels", "description": "macOS only"}
      ],
      "multiSelect": false
    }
  ]
}
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
| ac-researcher | Research docs, features, implementation details | Read, Grep, Glob, WebSearch, Context7 |
| ac-planner | Synthesize role plan from all inputs | Read |
| ac-generator-core | Core files + templates: defaults, vars, handlers, meta, README, templates/*.j2 | Read, Write, Grep, Glob |
| ac-generator-tasks | Task files: tasks/*.yml | Read, Write, Grep, Glob |
| ac-generator-molecule | Molecule tests: molecule/**/* | Read, Write, Grep, Glob |
| ac-validator | Static validation + ansible-lint | Read, Bash, Grep, Glob |
| ac-fixer | Apply lint auto-fixes | Read, Edit, Grep, Glob |

## Reference Files

Read directly (no agent needed) for guidance:
- Role structure: [role-structure.md](../../common/references/role-structure.md)
- FQCN modules: [fqcn.md](../../common/references/fqcn.md)
- Patterns: [patterns.md](../../common/references/patterns.md)
- Lint fixes: [lint-fixes.md](../../common/references/lint-fixes.md)
- Molecule: [molecule.md](../../common/references/molecule.md)
