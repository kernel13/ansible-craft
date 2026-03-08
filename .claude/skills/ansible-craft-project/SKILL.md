---
description: Create Ansible project directory structures following official best practices. Use when user asks to create, scaffold, or initialize an Ansible project. Triggers on "create a project", "ansible project structure", "scaffold ansible project". Template-based approach - no AI generation required.
allowed-tools:
  - AskUserQuestion
  - Read
  - Write
  - Bash
argument-hint: "[project name or description]"
---

# Ansible Project Structure Generator

Create Ansible project directory structures following official best practices. This is a **template-based** approach - no AI generation or validation agents required.

## Key Differences from Role/Playbook Skills

- **No AI generation** - uses predefined templates
- **No API key required** - works offline
- **No validation agents** - templates are pre-validated
- **Simpler workflow** - gather requirements, confirm, write files

## Workflow Overview

```
Step 1: AskUserQuestion      → Gather requirements
Step 2: Display preview      → Show structure for approval
Step 3: User confirmation    → Yes/Modify/Cancel
Step 4: Write tool           → Create all files directly
Step 5: Display results      → Show created structure
```

## Step 1: Requirements Gathering

Use AskUserQuestion to gather project configuration:

```json
{
  "questions": [
    {
      "question": "Which project layout structure?",
      "header": "Layout",
      "options": [
        {"label": "Single-environment (Recommended)", "description": "Inventory files at root - simpler for most projects"},
        {"label": "Multi-environment", "description": "Separate inventories/ directories per environment"}
      ],
      "multiSelect": false
    },
    {
      "question": "Which environments to create? (select all that apply)",
      "header": "Environments",
      "options": [
        {"label": "production", "description": "Production environment inventory"},
        {"label": "staging", "description": "Staging/pre-prod environment"},
        {"label": "development", "description": "Development environment"},
        {"label": "testing", "description": "Testing/CI environment"}
      ],
      "multiSelect": true
    },
    {
      "question": "Include optional directories?",
      "header": "Optional",
      "options": [
        {"label": "None (Recommended)", "description": "Standard structure only"},
        {"label": "library/", "description": "Custom modules directory"},
        {"label": "filter_plugins/", "description": "Custom Jinja2 filters"}
      ],
      "multiSelect": true
    }
  ]
}
```

**Apply defaults for non-selected topics:**
- Environments: production, staging (if none selected)
- Groups: webservers, databases
- ansible.cfg: included
- Sample files: included

## Step 2: Display Structure Preview

Show the user what will be created based on their choices:

### Single-Environment Preview
```
project-name/
├── production              # INI inventory
├── staging                 # INI inventory
├── group_vars/
│   ├── all.yml             # Common variables
│   ├── webservers.yml      # Webserver vars
│   └── databases.yml       # Database vars
├── host_vars/              # Host-specific vars
├── roles/                  # Custom roles
├── site.yml                # Main playbook
├── ansible.cfg             # Ansible configuration
├── .gitignore
└── README.md
```

### Multi-Environment Preview
```
project-name/
├── inventories/
│   ├── production/
│   │   ├── hosts           # Production inventory
│   │   ├── group_vars/
│   │   │   └── all.yml
│   │   └── host_vars/
│   └── staging/
│       ├── hosts           # Staging inventory
│       ├── group_vars/
│       │   └── all.yml
│       └── host_vars/
├── playbooks/              # Additional playbooks
├── roles/                  # Custom roles
├── site.yml
├── ansible.cfg
├── .gitignore
└── README.md
```

## Step 3: User Confirmation

Use AskUserQuestion for approval:

```json
{
  "questions": [{
    "question": "Create this project structure?",
    "header": "Confirm",
    "options": [
      {"label": "Yes, create the project", "description": "Write all files and directories"},
      {"label": "Modify", "description": "Change configuration before creating"},
      {"label": "Cancel", "description": "Abort project creation"}
    ],
    "multiSelect": false
  }]
}
```

If "Modify" is selected, ask for specific changes and loop back to Step 2.

## Step 4: Write Files

Use the Write tool to create each file. **Do NOT use agents** - write files directly.

### Required Files to Create

#### Inventory Files

**Single layout:** Create at project root (e.g., `production`, `staging`)
**Multi layout:** Create at `inventories/{env}/hosts`

```ini
# {environment} inventory

[webservers]
# web01.example.com

[databases]
# db01.example.com

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

#### group_vars/all.yml

```yaml
---
# Variables that apply to all groups
timezone: UTC
```

#### group_vars/{group}.yml

```yaml
---
# Variables for {group} group
# {group}_enabled: true
```

#### site.yml

```yaml
---
# Main site playbook

- name: Apply common configuration
  hosts: all
  become: true
  roles:
    - role: common
      tags: common

- name: Configure web servers
  ansible.builtin.import_playbook: webservers.yml

- name: Configure databases
  ansible.builtin.import_playbook: databases.yml
```

#### ansible.cfg

```ini
[defaults]
inventory = {default_inventory}
roles_path = ./roles
host_key_checking = False
stdout_callback = yaml

[privilege_escalation]
become = True
become_method = sudo

[ssh_connection]
pipelining = True
```

#### .gitignore

```gitignore
# Ansible
*.retry
*.log
*.vault
vault_pass.txt
.vault_pass

# Sensitive files
credentials.yml
secrets.yml
*.pem
*.key

# Python
__pycache__/
*.py[cod]
.venv/
venv/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Molecule
.molecule/
.cache/
```

#### README.md

Generate a README with:
- Project name and description
- Directory structure diagram
- Quick start commands
- Environment usage examples

## Step 5: Display Results

After writing files, show the final results:

```
## Project Created Successfully

**Project:** {project_name}
**Location:** {full_path}

### File Tree
{tree output from: find {project_path} -type f | sort}

### Next Steps
1. Update inventory files with your hosts
2. Configure variables in group_vars/
3. Run: ansible-playbook -i production site.yml --check
```

Use Bash to display the file tree:

```bash
find {project_path} -type f | sort
```

## Reference Files

Read for guidance on project structures:
- [project-structure.md](/Users/stephanesop/Documents/01-Projects/ansible-craft/.claude/skills/ansible-craft-project/references/project-structure.md)

## Example Session

**User:** "Create an ansible project called my-infrastructure"

**Claude:**
1. Ask about layout and environments
2. Show structure preview
3. Get confirmation
4. Write all files with Write tool
5. Display success message with next steps

No agents required - direct file creation only.
