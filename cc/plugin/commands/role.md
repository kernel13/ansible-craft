---
description: Generate production-ready Ansible roles from natural language descriptions. Use when user asks to create, generate, or build an Ansible role. Triggers on "create a role for", "ansible role that", "role to install/configure". Covers 10 topics through interactive questions with sensible defaults.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - WebSearch
argument-hint: "[role description]"
---

# Ansible Role Generator

Generate Galaxy-standard Ansible roles with conversational exploration. Generate files directly — do NOT use the Task tool.

```
+=====================================================================+
|  GENERATE FILES DIRECTLY using Write/Edit tools.                    |
|  Do NOT use the Task tool. Do NOT spawn agents.                     |
+=====================================================================+
```

## Workflow Overview

```
Step 0:  Detect existing role        — read current files if role exists
Step 1:  Research (optional)        — WebSearch for uncommon software only
Step 2:  Interactive Overview        — display findings, smart defaults
Step 3:  Topic Exploration Loop      — user selects topics or continues
Step 4:  Summary & Modification      — confirm or describe changes
Step 5:  Read Reference Files        — lazy load only what's needed
Step 6:  Generate Plan Inline        — variable design, task flow, handlers
Step 7:  Plan Approval Loop          — approve/modify/cancel
Step 8:  Generate Files (Write/Edit) — create or update role files
Step 9:  Validate                    — ansible-lint + static checks
Step 10: Fix                         — read lint-fixes.md, apply Edit fixes
Step 11: Final Report                — file tree, validation, next steps
```

## Step 0: Detect Existing Role

Before anything else, resolve the role name from the argument and check if the role already exists.

```bash
# Detect role directory (try common locations)
ls roles/[role_name]/ 2>/dev/null || ls [role_name]/ 2>/dev/null
```

**If role directory exists** → set `MODE=update`:

1. Read core files:
   - `defaults/main.yml` — capture all existing variables and their comments
   - `vars/main.yml` — capture internal variables
   - `meta/main.yml` — extract role metadata (platforms, dependencies)

2. Scan ALL task files and templates to audit variable usage:
   ```bash
   # Find all role-prefixed variables used across tasks and templates
   grep -Eoh "[a-z]+_[a-z_]+" roles/[role_name]/tasks/*.yml roles/[role_name]/templates/*.j2 2>/dev/null | sort -u
   ```
   - Separate top-level variables (e.g. `apache_port`) from sub-keys of list/dict variables (e.g. `item.serveralias`)
   - Sub-keys of list/dict variables belong as **commented examples** inside the parent variable definition in defaults/main.yml, not as standalone entries

3. Build a **variable gap report** before proceeding:
   - Variables in defaults/main.yml but NOT used anywhere → flag as potentially unused
   - Variables used in tasks/templates but NOT in defaults/main.yml and NOT in vars/main.yml → missing, must be added
   - List/dict variables whose optional sub-keys are used in templates but not documented in defaults/main.yml → must add commented sub-key examples

4. Display a brief update notice:
   ```
   ## Updating existing role: [role_name]
   Found: 10 existing variables, 2 missing from defaults, 3 sub-keys undocumented.
   Existing variables preserved. Missing variables will be added with comments.
   ```

**If role directory does not exist** → set `MODE=create` and proceed normally.

## Step 1: Research Phase (Optional)

**For common software** (nginx, docker, postgresql, apache, mysql, redis, etc.): Skip research — Claude's training + reference files provide sufficient knowledge.

**For uncommon software** (niche tools, new projects, internal apps): Use WebSearch to discover:
- Package names per platform (apt vs dnf vs choco)
- Configuration file paths
- Service names
- Default ports
- Common configuration patterns

## Step 2: Interactive Overview

Present a **scannable overview** organized by exploration value:

```
## Research Complete for "[role_description]"

### Interesting Findings (explore these)
Topics with depth worth exploring:
  * **SSL/TLS Configuration** - 3 approaches found (Let's Encrypt, self-signed, custom CA)
  * **Virtual Hosts** - Multiple patterns for multi-site setup

### Standard Decisions (smart defaults ready)
Topics with obvious choices:
  . Package: nginx (official)
  . Platforms: Generic
  . Privilege escalation: Required

### Optional Topics (hidden by default)
  Molecule testing, Tags strategy, Variable naming...

### Best Practices
  ! Use FQCN for all modules
  * Implement idempotency with changed_when

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
  . SSL/TLS: Let's Encrypt with webroot
  . Virtual hosts: Multi-site with separate configs

### Applied Defaults
  * Package: nginx from official repos
  * Platforms: Generic
  * Molecule: Basic Docker tests
  * Tags: Per-task strategy

Does this look right?
  - Type "yes" to generate
  - Or describe changes: "add CentOS support", "skip molecule tests", etc.
```

**Handle modifications:**

If user types something other than "yes", parse their request:
- "add CentOS support" -> Add RHEL to platforms
- "skip molecule tests" -> Disable molecule
- "make SSL optional" -> Add feature toggle variable
- "remove virtual hosts" -> Simplify to single-site config

**Apply modifications and show updated summary**, then ask again until user approves.

## Step 5: Read Reference Files

Read reference files directly using the Read tool. Lazy load only what's needed:

**Always read:**
- `cc/common/references/role-structure.md` — Full Galaxy structure
- `cc/common/references/fqcn.md` — Filter by platform:
  - Linux-only: include `ansible.builtin.*`, `ansible.posix.*`, skip Windows
  - Windows-only: include `ansible.windows.*`, `chocolatey.*`, skip Linux
  - Multi-platform: include all
- `cc/common/references/patterns.md` — Idempotency, validation, variable naming

**Conditional reads:**
- If molecule enabled: `cc/common/references/molecule.md`
- If fixing needed later (Step 10): `cc/common/references/lint-fixes.md`

## Step 6: Generate Plan Inline

Design the role plan directly — do NOT spawn an agent. The plan must include:

### Variable Design

**defaults/main.yml** (user-overridable):
```yaml
role_name_package_name: "package"
role_name_version: "latest"
role_name_port: 8080
role_name_config_path: "/etc/role_name"
role_name_service_enabled: true
```

**vars/main.yml** (internal):
```yaml
role_name_supported_os:
  - Ubuntu
  - RedHat
role_name_packages:
  Debian:
    - package1
  RedHat:
    - package1
```

**When MODE=update**, use the variable gap report from Step 0 to drive the plan:
- List every variable to be added to defaults/main.yml (with its comment and default value)
- List every list/dict variable whose optional sub-keys need to be added as commented examples
- Do NOT redesign variables that already exist — only fill the gaps

### Task Flow Ordering

Standard sequence for tasks/main.yml (includes only):
1. `validate_params.yml` — Input validation (ALWAYS FIRST)
2. `install.yml` — Package installation
3. `configure.yml` — Configuration files
4. `service.yml` — Service management
5. `validate.yml` — Post-install verification (ALWAYS LAST)

### Handler and Template Identification
- Identify restart/reload handlers needed
- List templates with their config file targets
- Include `{{ ansible_managed }}` header in all templates

### Output Plan Format

Present the plan in this format for user review:

```
## Role Plan: [role_name]

### Configuration Summary
| Setting | Value |
|---------|-------|
| Role Name | [name] |
| Target Platforms | [platforms] |
| Ansible Version | [min version] |
| Molecule Testing | [yes/no] |

### Variables
defaults/main.yml: [list with comments]
vars/main.yml: [internal variables]

### Tasks Structure
tasks/main.yml - Entry point (includes only)
tasks/validate_params.yml - Input validation (runs first)
tasks/install.yml - Installation
tasks/configure.yml - Configuration
tasks/service.yml - Service management
tasks/validate.yml - Post-install verification (runs last)

### Handlers
handlers/main.yml: Restart [service], Reload [service]

### Templates
templates/[config].j2: [purpose]

### Molecule (if enabled)
molecule/default/: [driver], [platforms], [verifier]

### File Tree
roles/[role_name]/
├── defaults/main.yml
├── vars/main.yml
├── handlers/main.yml
├── tasks/
│   ├── main.yml
│   ├── validate_params.yml
│   ├── install.yml
│   ├── configure.yml
│   ├── service.yml
│   └── validate.yml
├── templates/
│   └── [config].j2
├── meta/main.yml
├── molecule/default/ (if enabled)
└── README.md
```

## Step 7: Plan Approval Loop

Display the plan and ask user to approve:

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

### When User Approves

Proceed immediately to Step 8. Generate all files directly with Write tool.

### Modification Loop

When user selects "Modify" or provides modification text:
1. **DO NOT proceed to generation (Step 8)**
2. Collect the user's requested changes
3. Regenerate the plan inline with modifications applied
4. Display the updated plan
5. Ask for approval again — repeat until user approves or cancels

## Step 8: Generate Files (Direct Write)

Generate all role files directly using the Write tool. Follow this order:

### 8.1: Create directory structure
```bash
mkdir -p roles/[role_name]/{defaults,vars,tasks,handlers,templates,files,meta,molecule/default}
```

### 8.2: Generate files in order

1. `defaults/main.yml` — Default variables (see rules below)
2. `vars/main.yml` — Internal variables
3. `handlers/main.yml` — Service handlers (FQCN, listen directive)
4. `meta/main.yml` — Galaxy metadata
5. `tasks/main.yml` — Entry point (includes ONLY)
6. `tasks/validate_params.yml` — Input validation (ALWAYS separate, runs FIRST)
7. `tasks/install.yml` — Installation tasks
8. `tasks/configure.yml` — Configuration tasks
9. `tasks/service.yml` — Service management
10. `tasks/validate.yml` — Post-install verification (runs LAST)
11. `templates/*.j2` — All Jinja2 templates
12. `molecule/default/*` — Molecule files (if enabled)
13. `README.md` — Documentation with variable table

## Generation Requirements

These rules are **mandatory** for all generated files:

### tasks/main.yml Rules
- **INCLUDES ONLY** — never inline assertion tasks
- Include `validate_params.yml` as FIRST task
- Include `validate.yml` as LAST task
- Each include uses `ansible.builtin.include_tasks`

### tasks/validate_params.yml Rules
- **ALWAYS a separate file** — never inline in main.yml
- Ansible version check
- OS family validation
- Variable type validation (string, number, boolean)
- Required variables validation
- Range validation (ports 1-65535)
- Enum validation (service_state in started/stopped/restarted/reloaded)

### tasks/validate.yml Rules
- Post-installation verification — runs LAST
- Service status check (service_facts or win_service_info)
- Port listening validation (wait_for or win_wait_for)
- Configuration file existence (stat or win_stat)

### FQCN Rules
- ALL modules must use fully qualified names (from fqcn.md mappings)
- `ansible.builtin.apt:` not `apt:`
- `ansible.builtin.template:` not `template:`
- `ansible.builtin.service:` not `service:`

### Variable Rules
- ALL variables must be role-prefixed: `nginx_port` not `port`
- defaults/main.yml = user-overridable values
- vars/main.yml = internal/computed values

### defaults/main.yml Rules

Every variable **must** have an inline or block comment explaining its purpose and accepted values.

**Required format** — group variables by concern, each group preceded by a comment block:

```yaml
---
# [role_name] default variables
# Override these in your playbook or inventory.

# --- Installation ---
# Package name to install
role_name_package: "package"
# Version to install. Use "latest" to always upgrade.
role_name_version: "latest"

# --- Network ---
# Port the service listens on (1-65535)
role_name_port: 8080

# --- Paths ---
# Directory for configuration files
role_name_config_dir: "/etc/role_name"
# Directory for persistent data
role_name_data_dir: "/var/lib/role_name"

# --- Service ---
# Whether to enable the service at boot
role_name_service_enabled: true
# Desired service state: started, stopped, restarted, reloaded
role_name_service_state: "started"
```

**For list/dict variables** — document all optional sub-keys as commented examples inside the value:

```yaml
# List of virtual host definitions.
# Required keys: servername, documentroot
# Optional keys:
#   serveralias      — alternative hostname (e.g. www subdomain)
#   serveradmin      — admin email shown in error pages
#   allowoverride    — .htaccess override level (default: All)
#   options          — directory options (default: -Indexes +FollowSymLinks)
#   extra_parameters — raw directives appended to the block
role_name_items:
  - required_key: "value"
    other_key: "value"
    # optional_key: "value"
    # another_optional: "value"
```

**When MODE=update** (existing role):
- Read current `defaults/main.yml` first (already done in Step 0)
- Preserve ALL existing variables and their current values exactly
- Preserve existing comments; improve them only if they are missing or incorrect
- Use the variable gap report (Step 0) to identify what to add
- For missing top-level variables: append at the end of the relevant group (or create a new group)
- For list/dict variables with undocumented sub-keys: Edit the existing variable definition to add the sub-key comment block above it and commented optional keys inside the example item
- Use `Write` tool to rewrite the full file when more than 2 variables or comment blocks need to be added — `Edit` only for small targeted additions
- Never remove a variable that already exists, even if unused in the new plan

### YAML Formatting Rules
- 2-space indentation, never tabs
- Booleans: `true`/`false` (never `yes`/`no`)
- Jinja2 variables quoted: `"{{ var }}"`
- File modes quoted: `mode: '0644'`
- Files start with `---`
- Files end with newline

### Template Rules
- ALL templates start with `{{ ansible_managed }}` header comment
- Use role-prefixed variables
- Use `| default()` for optional values
- Use conditionals for optional sections

### Tag Rules
- Format: `rolename:action` (e.g., `nginx:install`, `nginx:config`)
- Never use generic tags like `install` or `config`

### Handler Rules
- Use FQCN: `ansible.builtin.service`
- Include `listen:` directive
- Name format: `Restart [service]`, `Reload [service]`

### README Rules
- Include ALL variables from defaults/main.yml in a table
- Include example playbook
- Include requirements and dependencies

## Step 9: Validate

Run validation directly — do NOT spawn an agent.

### Static Checks

Perform inline checks on generated files:
- **FQCN compliance**: grep for short module names (apt, yum, template, service, etc.)
- **Variable naming**: verify all defaults/vars use role prefix
- **Boolean values**: no yes/no, only true/false
- **Jinja2 quoting**: all `{{ }}` expressions quoted
- **File mode quoting**: all mode values quoted strings
- **When conditions**: no Jinja2 braces in when clauses

### ansible-lint

Run via Bash:
```bash
ansible-lint roles/[role_name]/ 2>&1
```

If ansible-lint is not installed, report and suggest `pip install ansible-lint`.

Parse output for violations, categorize as errors vs warnings, identify auto-fixable issues.

## Step 10: Fix (If Violations Found)

If violations found in Step 9:

1. Read `cc/common/references/lint-fixes.md` for fix patterns
2. Apply fixes using the Edit tool:
   - FQCN conversion (short name -> fully qualified)
   - Trailing whitespace removal
   - Missing newline at EOF
   - Task name capitalization
   - Boolean value fixes (yes/no -> true/false)
   - Jinja2 quoting fixes
   - File mode quoting fixes
   - Missing state: parameter
   - Missing mode: parameter (config files: '0644', scripts: '0755', secrets: '0600')
   - changed_when: false for read-only commands
3. Report what was fixed vs what requires manual intervention

## Step 11: Final Report

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

## Reference Files

Read directly for guidance:
- Role structure: [role-structure.md](../../common/references/role-structure.md)
- FQCN modules: [fqcn.md](../../common/references/fqcn.md)
- Patterns: [patterns.md](../../common/references/patterns.md)
- Lint fixes: [lint-fixes.md](../../common/references/lint-fixes.md)
- Molecule: [molecule.md](../../common/references/molecule.md)
