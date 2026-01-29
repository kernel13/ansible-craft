/**
 * Template generators for Ansible collection files.
 *
 * Generates galaxy.yml, README.md, and plugin templates.
 */

import type { CollectionWizardContext } from '../../wizard/types.js';
import YAML from 'yaml';

/**
 * Generate galaxy.yml content from wizard context.
 */
export function generateGalaxyYml(context: CollectionWizardContext): string {
  const galaxyYml = {
    namespace: context.namespace,
    name: context.name,
    version: context.version,
    readme: 'README.md',
    authors: context.authors,
    description: context.description,
    license: context.license,
    license_file: '',
    tags: [],
    dependencies: context.dependencies,
    repository: '',
    documentation: '',
    homepage: '',
    issues: '',
  };

  return YAML.stringify(galaxyYml);
}

/**
 * Generate README.md content.
 */
export function generateReadme(context: CollectionWizardContext): string {
  const fqcn = `${context.namespace}.${context.name}`;

  return `# Ansible Collection - ${fqcn}

${context.description}

## Installation

\`\`\`bash
ansible-galaxy collection install ${fqcn}
\`\`\`

## Usage

\`\`\`yaml
---
- name: Use ${fqcn} collection
  hosts: localhost
  collections:
    - ${fqcn}
  tasks:
    - name: Example task
      debug:
        msg: "Using ${fqcn}"
\`\`\`

${
  context.includeModules
    ? `## Modules

This collection includes the following modules:

- \`${fqcn}.example_module\` - Example module description

`
    : ''
}${
  context.includeRoles
    ? `## Roles

This collection includes the following roles:

${context.roleNames.map((role) => `- \`${fqcn}.${role}\` - ${role} role`).join('\n')}

`
    : ''
}## License

${context.license.join(', ')}

## Author Information

${context.authors.join('\n\n')}
`;
}

/**
 * Generate CHANGELOG.md content.
 */
export function generateChangelog(version: string): string {
  return `# Changelog

## [${version}] - ${new Date().toISOString().split('T')[0]}

### Added
- Initial release
`;
}

/**
 * Generate meta/runtime.yml content.
 */
export function generateRuntimeYml(requiresAnsible?: string): string {
  const runtime: Record<string, unknown> = {};

  if (requiresAnsible) {
    runtime.requires_ansible = requiresAnsible;
  }

  return YAML.stringify(runtime);
}

/**
 * Generate a basic Ansible module template.
 */
export function generateModuleTemplate(
  namespace: string,
  name: string,
  moduleName: string,
): string {
  const fqcn = `${namespace}.${name}.${moduleName}`;

  return `#!/usr/bin/python
# -*- coding: utf-8 -*-

# Copyright: (c) ${new Date().getFullYear()}, ${namespace}
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function
__metaclass__ = type

DOCUMENTATION = r'''
---
module: ${moduleName}
short_description: Example module for ${namespace}.${name} collection
description:
    - This is an example module.
    - It demonstrates the basic structure of an Ansible module.
version_added: "1.0.0"
author:
    - ${namespace} Team
options:
    name:
        description:
            - Name of the resource.
        required: true
        type: str
    state:
        description:
            - Desired state of the resource.
        choices: ['present', 'absent']
        default: 'present'
        type: str
'''

EXAMPLES = r'''
- name: Ensure resource is present
  ${fqcn}:
    name: example
    state: present

- name: Remove resource
  ${fqcn}:
    name: example
    state: absent
'''

RETURN = r'''
changed:
    description: Whether the module made changes.
    type: bool
    returned: always
    sample: true
message:
    description: A message describing what the module did.
    type: str
    returned: always
    sample: "Resource example is present"
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

    name = module.params['name']
    state = module.params['state']

    result = dict(
        changed=False,
        message='',
    )

    if module.check_mode:
        module.exit_json(**result)

    # Example logic
    if state == 'present':
        result['changed'] = True
        result['message'] = f"Resource {name} is present"
    elif state == 'absent':
        result['changed'] = True
        result['message'] = f"Resource {name} is absent"

    module.exit_json(**result)


if __name__ == '__main__':
    main()
`;
}

/**
 * Generate a basic filter plugin template.
 */
export function generateFilterPluginTemplate(
  namespace: string,
  name: string,
  filterName: string,
): string {
  return `# -*- coding: utf-8 -*-

# Copyright: (c) ${new Date().getFullYear()}, ${namespace}
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function
__metaclass__ = type


def ${filterName}(value):
    """
    Example filter that transforms a value.

    Args:
        value: The input value to transform

    Returns:
        The transformed value
    """
    # Example: uppercase the string
    return str(value).upper()


class FilterModule:
    """Ansible filter plugin."""

    def filters(self):
        return {
            '${filterName}': ${filterName},
        }
`;
}

/**
 * Generate a basic integration test target.
 */
export function generateIntegrationTest(namespace: string, name: string, testName: string): string {
  return `---
# Integration test for ${namespace}.${name}.${testName}

- name: Test ${testName}
  hosts: localhost
  gather_facts: false
  tasks:
    - name: Run ${testName} module
      ${namespace}.${name}.${testName}:
        name: test_resource
        state: present
      register: result

    - name: Assert module succeeded
      assert:
        that:
          - result is changed
          - result.message is defined
`;
}

/**
 * Generate module_utils helper template.
 */
export function generateModuleUtilsTemplate(
  namespace: string,
  name: string,
  utilName: string,
): string {
  return `# -*- coding: utf-8 -*-

# Copyright: (c) ${new Date().getFullYear()}, ${namespace}
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

from __future__ import absolute_import, division, print_function
__metaclass__ = type


class ${utilName}Helper:
    """
    Helper class for ${namespace}.${name} collection modules.
    """

    def __init__(self, module):
        self.module = module

    def validate_input(self, params):
        """Validate module input parameters."""
        # Add validation logic here
        return True

    def perform_action(self, action, params):
        """Perform the specified action."""
        # Add action logic here
        return {'changed': False, 'message': 'Action performed'}
`;
}

/**
 * Generate PowerShell module template for Windows targets.
 */
export function generatePowerShellModuleTemplate(
  namespace: string,
  name: string,
  moduleName: string,
): string {
  const fqcn = `${namespace}.${name}.${moduleName}`;

  return `#!powershell
# Copyright: (c) ${new Date().getFullYear()}, ${namespace}
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

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

# Main module logic
try {
    if ($state -eq "present") {
        # Perform action for present state
        if (-not $checkMode) {
            # Example: create or update resource
            $module.Result.changed = $false
            $module.Result.message = "Resource '$name' is in desired state"
        }
        else {
            $module.Result.changed = $false
            $module.Result.message = "Would ensure resource '$name' is present"
        }
    }
    elseif ($state -eq "absent") {
        # Perform action for absent state
        if (-not $checkMode) {
            # Example: remove resource
            $module.Result.changed = $false
            $module.Result.message = "Resource '$name' removed successfully"
        }
        else {
            $module.Result.changed = $false
            $module.Result.message = "Would ensure resource '$name' is absent"
        }
    }

    $module.ExitJson()
}
catch {
    $module.FailJson("An error occurred: $($_.Exception.Message)", $_)
}
`;
}

/**
 * Generate PowerShell module_utils template.
 */
export function generatePowerShellModuleUtilsTemplate(
  namespace: string,
  name: string,
): string {
  return `#!powershell
# Copyright: (c) ${new Date().getFullYear()}, ${namespace}
# GNU General Public License v3.0+ (see COPYING or https://www.gnu.org/licenses/gpl-3.0.txt)

Function Invoke-CommonValidation {
    <#
    .SYNOPSIS
    Validate common module parameters.

    .PARAMETER Module
    The AnsibleModule instance.

    .PARAMETER Params
    The parameters hashtable to validate.
    #>
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

    if ([string]::IsNullOrWhiteSpace($Params.name)) {
        $Module.FailJson("Parameter 'name' cannot be empty")
    }

    return $true
}

Function Invoke-CommonAction {
    <#
    .SYNOPSIS
    Perform a common action with consistent error handling.

    .PARAMETER Module
    The AnsibleModule instance.

    .PARAMETER Action
    The action to perform.

    .PARAMETER Params
    The parameters hashtable for the action.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        $Module,

        [Parameter(Mandatory = $true)]
        [string]$Action,

        [Parameter(Mandatory = $true)]
        [hashtable]$Params
    )

    # Common action implementation
    $result = @{
        changed = $false
        message = "Action '$Action' performed successfully"
    }

    return $result
}

Export-ModuleMember -Function Invoke-CommonValidation, Invoke-CommonAction
`;
}
