---
name: ac:collection
description: Generate Ansible collections with plugins, roles, and tests. Use when user asks to create or generate an Ansible collection. Triggers on "create a collection", "ansible collection for", "collection to package".
allowed-tools:
  - Task
  - AskUserQuestion
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
---

# Ansible Collection Generator

Generate production-ready Ansible collections from natural language descriptions.

## What are Ansible Collections?

Collections are a distribution format for Ansible content that can contain:
- **Plugins**: modules, filters, inventory plugins, lookup plugins, test plugins
- **Roles**: Reusable Ansible roles
- **Playbooks**: Example playbooks
- **Documentation**: Guides and examples

Collections use a namespace.name format (e.g., `mycompany.web_utils`) and are distributed via Ansible Galaxy.

## When to Use This Skill

Use this skill when the user asks to:
- "Create an Ansible collection"
- "Generate a collection for..."
- "Package my modules as a collection"
- "Build a collection with roles and plugins"

## Workflow

### 1. Requirements Gathering

First, gather essential information using AskUserQuestion:

**Required:**
- **Namespace**: Organization or author namespace (lowercase, alphanumeric + underscore)
- **Collection Name**: Descriptive name (lowercase, alphanumeric + underscore)
- **Description**: What the collection does
- **Version**: Semantic version (MAJOR.MINOR.PATCH, default: 1.0.0)

**Optional but Recommended:**
- **License**: SPDX identifier (MIT, Apache-2.0, GPL-3.0, etc.)
- **Authors**: Collection authors
- **Plugin Types**: Which plugins to include (modules, filters, inventory, lookup, test)
- **Roles**: Whether to include role scaffolding
- **Testing**: Testing level (none, basic, molecule)
- **Dependencies**: Other collections this depends on

Example questions:
```
Which plugin types should be included?
- Modules (custom Ansible modules)
- Filter plugins (Jinja2 filters)
- Inventory plugins (custom inventory sources)
- Lookup plugins (data lookup mechanisms)
- Test plugins (Jinja2 tests)
```

### 2. Collection Structure Planning

Collections follow this standard structure:
```
namespace/name/
├── galaxy.yml              # Required metadata
├── README.md              # Required documentation
├── CHANGELOG.md           # Version history
├── meta/runtime.yml       # Ansible version requirements
├── plugins/
│   ├── modules/           # Custom modules
│   │   ├── example_module.py          # Python module
│   │   └── win_example_module.ps1     # PowerShell module
│   ├── module_utils/      # Shared module utilities
│   │   ├── common.py                  # Python utilities
│   │   └── common.psm1                # PowerShell utilities
│   ├── filter/            # Filter plugins (optional)
│   ├── inventory/         # Inventory plugins (optional)
│   ├── lookup/            # Lookup plugins (optional)
│   └── test/              # Test plugins (optional)
├── roles/                 # Collection roles
├── playbooks/             # Example playbooks
├── docs/                  # Documentation
└── tests/
    └── integration/       # Integration tests
        └── targets/       # Test targets
```

### 3. Execute Collection Generation

Once all requirements are gathered, generate the collection using the CLI.

**Use the Bash tool to call ansible-craft CLI:**

```bash
# Navigate to desired working directory (or use current directory)
cd /path/to/workspace

# Call ansible-craft CLI with gathered requirements
bun run /Users/stephanesop/Documents/dev/ansible-craft/src/cli/index.ts new collection "<description>" \
  --namespace "<namespace>" \
  --name "<collection_name>" \
  --version "<version_from_wizard>" \
  --authors "<author_list>" \
  --license "<license_list>" \
  --description "<description>" \
  --quick
```

**Note:** Replace placeholders with actual values gathered from user:
- `<description>` - Brief collection description (used in CLI argument and --description flag)
- `<namespace>` - Namespace (lowercase, alphanumeric + underscore)
- `<collection_name>` - Collection name (lowercase, alphanumeric + underscore)
- `<version_from_wizard>` - Semantic version (e.g., "1.0.0")
- `<author_list>` - Comma-separated authors (e.g., "John Doe <john@example.com>,Jane Smith")
- `<license_list>` - Comma-separated SPDX identifiers (e.g., "MIT,Apache-2.0")

The `--quick` flag skips the interactive wizard since requirements were already gathered.

**Generated Structure:**

This will create a complete collection at `collections/ansible_collections/<namespace>/<name>/` with:

- **galaxy.yml** - Collection metadata
- **README.md** - Documentation with usage examples
- **CHANGELOG.md** - Version history
- **meta/runtime.yml** - Ansible version requirements
- **plugins/modules/example_module.py** - Python module template
- **plugins/modules/win_example_module.ps1** - PowerShell module template ✓
- **plugins/module_utils/common.py** - Python utilities
- **plugins/module_utils/common.psm1** - PowerShell utilities ✓
- **tests/integration/** - Test scaffolding
- **docs/** - Documentation structure

### 4. Validation

After generation completes, verify the collection:

```bash
# Verify directory structure
tree collections/ansible_collections/<namespace>/<name>/

# Specifically verify PowerShell files exist
ls -la collections/ansible_collections/<namespace>/<name>/plugins/modules/win_example_module.ps1
ls -la collections/ansible_collections/<namespace>/<name>/plugins/module_utils/common.psm1

# Display PowerShell module content
echo "=== PowerShell Module ==="
cat collections/ansible_collections/<namespace>/<name>/plugins/modules/win_example_module.ps1

# Build and validate collection
cd collections/ansible_collections/<namespace>/<name>/
ansible-galaxy collection build

# Verify build succeeded
ls -la *.tar.gz
```

**Expected PowerShell Module Structure:**
```powershell
#!powershell
# Copyright: (c) 2026, <namespace>
# GNU General Public License v3.0+

#AnsibleRequires -CSharpUtil Ansible.Basic

$spec = @{
    options = @{
        name = @{ type = "str"; required = $true }
        state = @{ type = "str"; default = "present"; choices = "absent", "present" }
    }
    supports_check_mode = $true
}

$module = [Ansible.Basic.AnsibleModule]::Create($args, $spec)
# ... module logic ...
$module.ExitJson()
```

### 5. Installation and Testing

```bash
# Install the built collection locally
ansible-galaxy collection install namespace-name-1.0.0.tar.gz

# Test Python module
ansible localhost -m namespace.name.example_module -a "name=test state=present"

# Test PowerShell module (on Windows hosts)
ansible windows_host -m namespace.name.win_example_module -a "name=test state=present"
```

## Using the ansible-craft CLI

**This is the recommended approach.** The skill workflow above (sections 1-4) gathers requirements from the user and then calls the CLI to ensure all templates (Python and PowerShell) are generated correctly.

### Direct CLI Usage

Users can also invoke the CLI directly:

```bash
# Interactive mode (wizard) - creates in collections/ansible_collections/
ansible-craft new collection "web utilities" --namespace mycompany
# Creates: ./collections/ansible_collections/mycompany/web_utilities/

# Quick mode (skip wizard, use defaults)
ansible-craft new collection "database tools" \
  --namespace acme \
  --name db_tools \
  --quick

# With custom output directory
ansible-craft new collection "monitoring plugins" \
  --namespace myorg \
  --output ~/my-project
# Creates: ~/my-project/collections/ansible_collections/myorg/monitoring_plugins/
```

### Generated Files

Both approaches (skill workflow and direct CLI) generate the same complete structure including:
- **Python modules** (`.py`) for cross-platform support
- **PowerShell modules** (`.ps1`) for Windows targets
- **Module utilities** for both languages (`.py` and `.psm1`)
- Complete documentation and testing scaffolding
- Galaxy-compliant metadata and structure

## PowerShell Module Reference

Collections automatically include PowerShell module templates for Windows targets:

### PowerShell Module Template (plugins/modules/win_example_module.ps1)

```powershell
#!powershell
# Copyright: (c) 2026, namespace
# GNU General Public License v3.0+

#AnsibleRequires -CSharpUtil Ansible.Basic

$spec = @{
    options = @{
        name = @{ type = "str"; required = $true }
        state = @{ type = "str"; default = "present"; choices = "absent", "present" }
    }
    supports_check_mode = $true
}

$module = [Ansible.Basic.AnsibleModule]::Create($args, $spec)

$name = $module.Params.name
$state = $module.Params.state
$checkMode = $module.CheckMode

try {
    if ($state -eq "present") {
        $module.Result.changed = $false
        $module.Result.message = "Resource '$name' is in desired state"
    }
    elseif ($state -eq "absent") {
        $module.Result.changed = $false
        $module.Result.message = "Resource '$name' removed successfully"
    }

    $module.ExitJson()
}
catch {
    $module.FailJson("An error occurred: $($_.Exception.Message)", $_)
}
```

### PowerShell Module Utilities (plugins/module_utils/common.psm1)

```powershell
#!powershell
# Copyright: (c) 2026, namespace
# GNU General Public License v3.0+

Function Invoke-CommonValidation {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Module,

        [Parameter(Mandatory = $true)]
        [hashtable]$Params
    )

    # Common validation logic
    if (-not $Params.ContainsKey('name')) {
        $Module.FailJson("Parameter 'name' is required")
    }

    return $true
}

Export-ModuleMember -Function Invoke-CommonValidation
```

### Using PowerShell Modules in Playbooks

```yaml
- name: Use PowerShell module on Windows
  hosts: windows_hosts
  tasks:
    - name: Manage resource with PowerShell module
      mycompany.windows_utils.win_example_module:
        name: example
        state: present
```

## Important Notes

1. **Namespace Requirements**:
   - Must be unique on Ansible Galaxy if publishing
   - Common patterns: company name, GitHub username, project name
   - Cannot use hyphens (unlike roles)

2. **FQCN Format**:
   - All plugin references: `namespace.name.plugin_name`
   - Example: `mycompany.web_utils.nginx_config`

3. **Version Management**:
   - Follow semantic versioning strictly
   - Update CHANGELOG.md for each version
   - Galaxy requires version numbers to always increase

4. **Dependencies**:
   - Format: `namespace.name: ">=1.0.0"`
   - Can use version constraints: `>=`, `>`, `<=`, `<`, `==`

5. **Publishing to Galaxy**:
   ```bash
   # Build tarball
   ansible-galaxy collection build

   # Publish (requires API key)
   ansible-galaxy collection publish namespace-name-1.0.0.tar.gz
   ```

## Troubleshooting

**Invalid namespace/name error:**
- Ensure lowercase only
- No hyphens (use underscores)
- Must start with a letter

**Build fails:**
- Check galaxy.yml has all required fields
- Verify YAML syntax in all files
- Ensure README.md exists

**Module not found:**
- Check FQCN format: `namespace.name.module`
- Verify collection is installed: `ansible-galaxy collection list`
- Ensure `collections:` is declared in playbook

## Examples

### Web Utilities Collection
```yaml
namespace: webdev
name: utils
description: Web development utilities
plugins:
  - modules: nginx_config, ssl_cert
  - filters: format_url, parse_headers
```

### Database Management Collection
```yaml
namespace: dbadmin
name: postgres
description: PostgreSQL management tools
plugins:
  - modules: pg_backup, pg_user, pg_database
  - roles: postgres_server, postgres_client
testing: molecule
```

### Security Collection
```yaml
namespace: security
name: scanning
description: Security scanning and compliance
plugins:
  - modules: port_scan, vulnerability_check
  - filters: sanitize_output
  - inventory: security_groups
```

## References

- [Ansible Collections Documentation](https://docs.ansible.com/ansible/latest/dev_guide/developing_collections.html)
- [Galaxy Metadata Requirements](https://docs.ansible.com/ansible/latest/dev_guide/collections_galaxy_meta.html)
- [Collection Structure](https://docs.ansible.com/ansible/latest/dev_guide/developing_collections_structure.html)
- [Publishing to Galaxy](https://docs.ansible.com/ansible/latest/galaxy/dev_guide.html)
