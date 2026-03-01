---
description: Generate Ansible collections with plugins, roles, and tests. Use when user asks to create or generate an Ansible collection. Triggers on "create a collection", "ansible collection for", "collection to package".
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
  - Grep
  - Glob
argument-hint: "[collection description]"
---

# Ansible Collection Generator

Generate production-ready Ansible collections from natural language descriptions. This is a **template-based** approach — no AI generation agents required.

## Key Differences from Role/Playbook Skills

- **No AI generation** — uses predefined templates from reference docs
- **No API key required** — works offline
- **No validation agents** — templates are pre-validated
- **Simpler workflow** — gather requirements, confirm, write files

## Workflow Overview

```
Step 1: AskUserQuestion      → Gather requirements
Step 2: Display preview      → Show structure for approval
Step 3: User confirmation    → Yes/Modify/Cancel
Step 4: Write tool           → Create all files directly
Step 5: Display results      → Show created structure
```

## Step 1: Requirements Gathering

First, read the reference for collection structure:
- `cc/common/references/collection-structure.md`

Then use AskUserQuestion to gather essential information:

```json
{
  "questions": [
    {
      "question": "What namespace should the collection use? (lowercase, alphanumeric + underscore)",
      "header": "Namespace",
      "options": [
        {"label": "Use project/org name", "description": "Derive from project context (e.g., mycompany)"},
        {"label": "Custom namespace", "description": "Specify your own namespace"}
      ],
      "multiSelect": false
    },
    {
      "question": "Which plugin types should be included?",
      "header": "Plugins",
      "options": [
        {"label": "Modules only (Recommended)", "description": "Custom Ansible modules (Python + PowerShell templates)"},
        {"label": "Modules + Filters", "description": "Custom modules and Jinja2 filter plugins"},
        {"label": "Modules + Roles", "description": "Custom modules with reusable roles"},
        {"label": "Full collection", "description": "Modules, filters, roles, and example playbooks"}
      ],
      "multiSelect": false
    },
    {
      "question": "Include testing scaffolding?",
      "header": "Testing",
      "options": [
        {"label": "Integration tests (Recommended)", "description": "Standard integration test targets"},
        {"label": "None", "description": "Skip test scaffolding"}
      ],
      "multiSelect": false
    }
  ]
}
```

**Apply defaults for non-selected topics:**
- Version: 1.0.0
- License: MIT
- Ansible: >=2.14
- Authors: ansible-craft

## Step 2: Display Structure Preview

Show the user what will be created:

```
## Collection Preview: namespace.name

namespace/name/
├── galaxy.yml                 # Collection metadata
├── README.md                  # Documentation
├── CHANGELOG.md               # Version history
├── meta/runtime.yml           # Ansible version requirements
├── plugins/
│   ├── modules/
│   │   ├── example_module.py          # Python module template
│   │   └── win_example_module.ps1     # PowerShell module template
│   └── module_utils/
│       ├── common.py                  # Python utilities
│       └── common.psm1               # PowerShell utilities
├── roles/                     # (if roles selected)
├── playbooks/                 # (if full collection)
├── docs/
└── tests/
    └── integration/
        └── targets/
```

## Step 3: User Confirmation

```json
{
  "questions": [{
    "question": "Create this collection structure?",
    "header": "Confirm",
    "options": [
      {"label": "Yes, create the collection", "description": "Write all files and directories"},
      {"label": "Modify", "description": "Change configuration before creating"},
      {"label": "Cancel", "description": "Abort collection creation"}
    ],
    "multiSelect": false
  }]
}
```

## Step 4: Write Files

Use the Write tool to create each file. **Do NOT use agents** — write files directly.

### Output Path

Create at: `collections/ansible_collections/<namespace>/<name>/`

### Required Files

#### galaxy.yml

```yaml
---
namespace: <namespace>
name: <name>
version: "<version>"
readme: README.md
authors:
  - "<author>"
description: "<description>"
license:
  - "<license>"
tags:
  - <tag1>
  - <tag2>
dependencies: {}
repository: ""
documentation: ""
homepage: ""
issues: ""
```

#### README.md

Generate with:
- Collection name and description
- Installation instructions
- Available modules/plugins list
- Usage examples
- License and author

#### CHANGELOG.md

```markdown
# Changelog

## [1.0.0] - <date>

### Added
- Initial release
- `example_module` module
- `win_example_module` PowerShell module
```

#### meta/runtime.yml

```yaml
---
requires_ansible: ">=2.14"
```

#### plugins/modules/example_module.py

Standard Python module template with DOCUMENTATION, EXAMPLES, RETURN blocks.

#### plugins/modules/win_example_module.ps1

Standard PowerShell module template with Ansible.Basic.

#### plugins/module_utils/common.py

Shared Python helper functions.

#### plugins/module_utils/common.psm1

Shared PowerShell helper functions.

#### tests/integration/targets/example_module/tasks/main.yml

```yaml
---
- name: Test module with valid input
  <namespace>.<name>.example_module:
    name: test_resource
    state: present
  register: result

- name: Assert module succeeded
  ansible.builtin.assert:
    that:
      - result is changed
      - result.message is defined

- name: Test idempotency
  <namespace>.<name>.example_module:
    name: test_resource
    state: present
  register: result

- name: Assert no changes on second run
  ansible.builtin.assert:
    that:
      - result is not changed
```

#### tests/integration/targets/example_module/aliases

```
unstable
```

## Step 5: Display Results

```
## Collection Created Successfully

**Collection:** <namespace>.<name>
**Location:** collections/ansible_collections/<namespace>/<name>/

### File Tree
[tree output]

### Next Steps
1. Implement module logic in plugins/modules/
2. Build: `cd collections/ansible_collections/<namespace>/<name>/ && ansible-galaxy collection build`
3. Test: `ansible-test integration`
4. Install locally: `ansible-galaxy collection install <namespace>-<name>-1.0.0.tar.gz`
```

Use Bash to display the file tree:
```bash
find collections/ansible_collections/<namespace>/<name> -type f | sort
```

## Reference Files

Read for guidance on collection structures:
- [collection-structure.md](../../common/references/collection-structure.md)
