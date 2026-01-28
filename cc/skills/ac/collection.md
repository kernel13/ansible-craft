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
│   ├── module_utils/      # Shared module utilities
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

### 3. Generate galaxy.yml

The `galaxy.yml` file is **required** and must contain:

```yaml
namespace: mycompany           # Required: lowercase, alphanumeric + underscore
name: web_utils               # Required: lowercase, alphanumeric + underscore
version: "1.0.0"              # Required: semantic versioning
readme: README.md             # Required
authors:                      # Required: at least one
  - "Your Name <email@example.com>"
description: "Web utility modules and filters"
license:                      # Required: at least one
  - MIT
license_file: ''
tags: []                      # Galaxy search tags
dependencies: {}              # Format: namespace.name: ">=version"
repository: ''
documentation: ''
homepage: ''
issues: ''
```

**Critical Rules:**
- `namespace` and `name` must be lowercase
- Only alphanumeric characters and underscores (no hyphens!)
- Version must be semantic (MAJOR.MINOR.PATCH)
- At least one author and one license required

### 4. Generate Plugin Templates

#### Module Template (plugins/modules/example_module.py)

```python
#!/usr/bin/python
# -*- coding: utf-8 -*-

from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = r'''
---
module: example_module
short_description: Brief description
description:
    - Detailed description
version_added: "1.0.0"
author:
    - Your Name (@github)
options:
    name:
        description: Resource name
        required: true
        type: str
    state:
        description: Desired state
        choices: ['present', 'absent']
        default: 'present'
        type: str
'''

EXAMPLES = r'''
- name: Ensure resource is present
  mycompany.web_utils.example_module:
    name: example
    state: present
'''

RETURN = r'''
changed:
    description: Whether changes were made
    type: bool
    returned: always
'''

from ansible.module_utils.basic import AnsibleModule

def main():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            state=dict(type='str', default='present', choices=['present', 'absent']),
        ),
        supports_check_mode=True,
    )

    # Implementation here
    result = dict(changed=False, message='')
    module.exit_json(**result)

if __name__ == '__main__':
    main()
```

#### Filter Plugin Template (plugins/filter/example_filter.py)

```python
# -*- coding: utf-8 -*-

from __future__ import absolute_import, division, print_function
__metaclass__ = type

def example_filter(value, param=None):
    """Transform value based on param."""
    # Implementation here
    return str(value).upper()

class FilterModule:
    def filters(self):
        return {
            'example_filter': example_filter,
        }
```

### 5. Generate README.md

```markdown
# Ansible Collection - namespace.name

Brief description of the collection.

## Installation

\`\`\`bash
ansible-galaxy collection install namespace.name
\`\`\`

## Usage

\`\`\`yaml
---
- name: Use collection
  hosts: all
  collections:
    - namespace.name
  tasks:
    - name: Use module
      namespace.name.example_module:
        name: example
        state: present
\`\`\`

## Modules

- `example_module` - Description

## Roles

- `example_role` - Description

## License

MIT

## Author

Your Name
```

### 6. Generate Integration Tests

For basic or molecule testing, create test targets:

```yaml
# tests/integration/targets/example_module/tasks/main.yml
---
- name: Test example_module
  namespace.name.example_module:
    name: test_resource
    state: present
  register: result

- name: Assert success
  assert:
    that:
      - result is changed
```

### 7. Validation

After generating all files, validate:

1. **YAML Syntax**: All .yml files must be valid YAML
2. **galaxy.yml Schema**: Must contain all required fields
3. **Naming Conventions**: namespace and name must match regex `^[a-z][a-z0-9_]*$`
4. **Version Format**: Must be semantic versioning `\d+\.\d+\.\d+`

Run validation:
```bash
ansible-galaxy collection build
```

This will create a tarball: `namespace-name-version.tar.gz`

### 8. Installation and Testing

```bash
# Build the collection
ansible-galaxy collection build

# Install locally
ansible-galaxy collection install namespace-name-1.0.0.tar.gz

# Test the module
ansible localhost -m namespace.name.example_module -a "name=test state=present"
```

## Using the ansible-craft CLI

The fastest way to generate a collection is using the CLI:

```bash
# Interactive mode (recommended)
ansible-craft new collection "web utilities" --namespace mycompany

# Quick mode (uses defaults)
ansible-craft new collection "database tools" \
  --namespace acme \
  --name db_tools \
  --quick

# With specific options
ansible-craft new collection "monitoring plugins" \
  --namespace myorg \
  --output ./collections \
  --force
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
