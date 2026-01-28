# Ansible Collection Structure Reference

Standard directory layout and file conventions for Ansible Collections.

## Overview

Collections are a distribution format for Ansible content that can contain playbooks, roles, modules, and plugins. They follow a standardized structure defined by Ansible Galaxy.

## Fully Qualified Collection Name (FQCN)

Format: `namespace.name`

- **namespace**: Organization or author (e.g., `mycompany`, `ansible`, `community`)
- **name**: Collection identifier (e.g., `web_utils`, `general`, `aws`)

Example: `mycompany.web_utils`

## Directory Structure

```
namespace/name/
├── galaxy.yml                 # Collection metadata (required)
├── README.md                 # Documentation (required)
├── CHANGELOG.md              # Version history
├── LICENSE                   # License file
├── meta/
│   └── runtime.yml           # Ansible version requirements
├── plugins/
│   ├── modules/              # Custom modules
│   ├── module_utils/         # Shared module utilities
│   ├── action/               # Action plugins
│   ├── become/               # Become plugins
│   ├── cache/                # Cache plugins
│   ├── callback/             # Callback plugins
│   ├── cliconf/              # CLI configuration plugins
│   ├── connection/           # Connection plugins
│   ├── filter/               # Filter plugins
│   ├── httpapi/              # HTTP API plugins
│   ├── inventory/            # Inventory plugins
│   ├── lookup/               # Lookup plugins
│   ├── netconf/              # NETCONF plugins
│   ├── shell/                # Shell plugins
│   ├── strategy/             # Strategy plugins
│   ├── terminal/             # Terminal plugins
│   ├── test/                 # Test plugins (Jinja2 tests)
│   └── vars/                 # Vars plugins
├── roles/
│   ├── role_name_1/
│   │   ├── defaults/
│   │   ├── tasks/
│   │   ├── handlers/
│   │   ├── templates/
│   │   ├── files/
│   │   ├── vars/
│   │   └── meta/
│   └── role_name_2/
├── playbooks/
│   ├── example.yml
│   └── site.yml
├── docs/
│   ├── index.md
│   └── guides/
└── tests/
    ├── integration/
    │   └── targets/
    │       ├── module_name/
    │       │   ├── tasks/
    │       │   │   └── main.yml
    │       │   ├── meta/
    │       │   │   └── main.yml
    │       │   └── aliases
    │       └── role_name/
    └── unit/
        └── plugins/
            └── modules/
```

## Required Files

### galaxy.yml

**Required fields:**
- `namespace` - Collection namespace (lowercase, alphanumeric + underscore)
- `name` - Collection name (lowercase, alphanumeric + underscore)
- `version` - Semantic version (MAJOR.MINOR.PATCH)
- `readme` - Path to README file (usually README.md)
- `authors` - List of authors (at least one)
- `license` - List of SPDX license identifiers (at least one)

**Optional but recommended:**
- `description` - Brief description
- `tags` - List of tags for Galaxy search
- `dependencies` - Collection dependencies (namespace.name: version)
- `repository` - Source repository URL
- `documentation` - Documentation URL
- `homepage` - Homepage URL
- `issues` - Issue tracker URL
- `license_file` - Path to license file

Example:
```yaml
namespace: mycompany
name: web_utils
version: "1.0.0"
readme: README.md
authors:
  - "Your Name <email@example.com>"
description: "Web development utilities"
license:
  - MIT
tags:
  - web
  - nginx
  - apache
dependencies:
  ansible.posix: ">=1.5.0"
repository: "https://github.com/mycompany/ansible-web_utils"
documentation: "https://mycompany.github.io/ansible-web_utils/"
homepage: "https://mycompany.com/tools"
issues: "https://github.com/mycompany/ansible-web_utils/issues"
```

### README.md

Should include:
- Collection description
- Installation instructions
- Usage examples
- Available modules/roles/plugins
- License information
- Author information

### meta/runtime.yml

Specifies Ansible version requirements:

```yaml
requires_ansible: ">=2.9"
```

## Plugin Structure

### Module (plugins/modules/example_module.py)

Must include:
- `DOCUMENTATION` - Module documentation in YAML format
- `EXAMPLES` - Usage examples
- `RETURN` - Return value documentation
- `main()` function - Module entry point

### Filter Plugin (plugins/filter/example_filter.py)

Must include:
- `FilterModule` class with `filters()` method
- Filter functions

### Other Plugins

Follow Ansible plugin conventions for each plugin type.

## Naming Conventions

### Collection Names
- **Format**: `namespace.name`
- **Characters**: Lowercase letters, numbers, underscores only
- **Start with**: Letter
- **Max length**: 50 characters per part
- **Regex**: `^[a-z][a-z0-9_]*$`
- **Examples**: ✓ `mycompany.web_utils` ✗ `MyCompany.web-utils`

### Plugin/Module Names
- Lowercase with underscores
- Descriptive and specific
- Avoid generic names
- Examples: `nginx_config`, `ssl_certificate`, `user_account`

### Role Names
- Lowercase with underscores (within collections)
- Match collection naming rules
- Examples: `web_server`, `database_client`

## FQCN Usage

All plugin references in playbooks/roles must use FQCN:

```yaml
# Modules
- name: Configure nginx
  mycompany.web_utils.nginx_config:
    server_name: example.com

# Roles
- name: Setup web server
  hosts: webservers
  roles:
    - mycompany.web_utils.web_server

# Filters
- debug:
    msg: "{{ url | mycompany.web_utils.format_url }}"

# Lookup plugins
- debug:
    msg: "{{ lookup('mycompany.web_utils.custom_lookup', 'param') }}"
```

## Testing Structure

### Integration Tests

Located in `tests/integration/targets/`:

```
tests/integration/targets/
├── module_name/
│   ├── tasks/
│   │   └── main.yml         # Test tasks
│   ├── meta/
│   │   └── main.yml         # Test dependencies
│   ├── defaults/
│   │   └── main.yml         # Test variables
│   └── aliases              # Test aliases (unstable, cloud, etc.)
└── role_name/
    └── tasks/
        └── main.yml
```

### Test Task Example

```yaml
# tests/integration/targets/example_module/tasks/main.yml
---
- name: Test module with valid input
  mycompany.web_utils.example_module:
    name: test_resource
    state: present
  register: result

- name: Assert module succeeded
  assert:
    that:
      - result is changed
      - result.message is defined

- name: Test idempotency
  mycompany.web_utils.example_module:
    name: test_resource
    state: present
  register: result

- name: Assert no changes on second run
  assert:
    that:
      - result is not changed
```

## Dependencies

Declare collection dependencies in `galaxy.yml`:

```yaml
dependencies:
  # Exact version
  ansible.posix: "1.5.0"

  # Version range
  community.general: ">=6.0.0,<7.0.0"

  # Minimum version
  ansible.netcommon: ">=2.0.0"
```

Dependencies are installed automatically when the collection is installed.

## Building and Publishing

### Build Collection

```bash
ansible-galaxy collection build
```

Creates: `namespace-name-version.tar.gz`

### Install Locally

```bash
ansible-galaxy collection install namespace-name-1.0.0.tar.gz
```

### Publish to Galaxy

```bash
ansible-galaxy collection publish namespace-name-1.0.0.tar.gz --api-key=YOUR_KEY
```

## Version Management

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Incompatible API changes
- **MINOR**: Backward-compatible functionality additions
- **PATCH**: Backward-compatible bug fixes

Update `CHANGELOG.md` for each version:

```markdown
# Changelog

## [1.1.0] - 2024-01-15

### Added
- New `ssl_certificate` module
- `format_url` filter plugin

### Fixed
- `nginx_config` module error handling

## [1.0.0] - 2024-01-01

### Added
- Initial release
- `nginx_config` module
```

## Best Practices

1. **One collection per domain**: Group related functionality
2. **Clear naming**: Use descriptive, unambiguous names
3. **Complete documentation**: Document all modules and plugins
4. **Integration tests**: Test all modules and roles
5. **Version carefully**: Follow semantic versioning
6. **Declare dependencies**: Explicitly list collection dependencies
7. **Use FQCN**: Always use fully qualified names
8. **Provide examples**: Include usage examples in docs and README

## Common Mistakes

❌ **Using hyphens in names**
```yaml
namespace: my-company  # Wrong!
name: web-utils        # Wrong!
```

✓ **Use underscores**
```yaml
namespace: my_company  # Correct
name: web_utils        # Correct
```

❌ **Missing FQCN in playbooks**
```yaml
- name: Bad
  nginx_config:  # Missing namespace.name
    ...
```

✓ **Always use FQCN**
```yaml
- name: Good
  mycompany.web_utils.nginx_config:  # Full FQCN
    ...
```

❌ **Missing required galaxy.yml fields**
```yaml
namespace: mycompany
name: utils
# Missing: version, readme, authors, license
```

✓ **Include all required fields**
```yaml
namespace: mycompany
name: utils
version: "1.0.0"
readme: README.md
authors: ["Your Name"]
license: ["MIT"]
```

## References

- [Ansible Collections Guide](https://docs.ansible.com/ansible/latest/dev_guide/developing_collections.html)
- [Collection Structure](https://docs.ansible.com/ansible/latest/dev_guide/developing_collections_structure.html)
- [Galaxy Metadata](https://docs.ansible.com/ansible/latest/dev_guide/collections_galaxy_meta.html)
- [Module Development](https://docs.ansible.com/ansible/latest/dev_guide/developing_modules_general.html)
- [Plugin Development](https://docs.ansible.com/ansible/latest/dev_guide/developing_plugins.html)
