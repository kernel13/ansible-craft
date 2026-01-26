/**
 * Template content generators for Ansible project files.
 *
 * Provides functions to generate content for various project files
 * following Ansible best practices.
 */

/**
 * Template types for project files.
 */
export type ProjectTemplateType =
  | 'inventory'
  | 'group_vars_all'
  | 'group_vars_group'
  | 'site_yml'
  | 'ansible_cfg'
  | 'gitignore'
  | 'readme';

/**
 * Template data for project file generation.
 */
export interface ProjectTemplateData {
  environment?: string;
  groups?: string[];
  group?: string;
  projectName?: string;
  layout?: 'single' | 'multi';
  environments?: string[];
  defaultInventory?: string;
}

/**
 * Generated project file descriptor.
 */
export interface GeneratedProjectFile {
  /** Relative path within project */
  path: string;
  /** Template type */
  type: ProjectTemplateType;
  /** Data for template generation */
  templateData: ProjectTemplateData;
}

/**
 * Generate INI-format inventory file content.
 */
function generateInventory(data: ProjectTemplateData): string {
  const env = data.environment || 'production';
  const groups = data.groups || ['webservers', 'databases'];

  let content = `# ${env} inventory\n\n`;

  for (const group of groups) {
    content += `[${group}]\n`;
    content += `# ${group.slice(0, 3)}01.example.com\n\n`;
  }

  content += `[all:vars]\n`;
  content += `ansible_python_interpreter=/usr/bin/python3\n`;

  return content;
}

/**
 * Generate group_vars/all.yml content.
 */
function generateGroupVarsAll(data: ProjectTemplateData): string {
  const lines = ['---', '# Variables that apply to all groups'];

  if (data.environment) {
    lines.push(`environment: "${data.environment}"`);
  } else {
    lines.push('# environment: "{{ inventory_dir | basename }}"');
  }

  lines.push('timezone: UTC');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate group_vars/<group>.yml content.
 */
function generateGroupVarsGroup(data: ProjectTemplateData): string {
  const group = data.group || 'webservers';

  const lines = ['---', `# Variables for ${group} group`, ''];

  // Add sample variables based on group name
  if (group === 'webservers' || group.includes('web')) {
    lines.push('# http_port: 80');
    lines.push('# https_port: 443');
  } else if (group === 'databases' || group.includes('db')) {
    lines.push('# db_port: 5432');
    lines.push('# db_max_connections: 100');
  } else {
    lines.push(`# ${group}_enabled: true`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate site.yml content.
 */
function generateSiteYml(data: ProjectTemplateData): string {
  const groups = data.groups || ['webservers', 'databases'];

  const lines = [
    '---',
    '# Main site playbook',
    '',
    '- name: Apply common configuration',
    '  hosts: all',
    '  become: true',
    '  roles:',
    '    - role: common',
    '      tags: common',
    '',
  ];

  // Add import for each group
  for (const group of groups) {
    lines.push(`- name: Configure ${group}`);
    lines.push(`  ansible.builtin.import_playbook: ${group}.yml`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate ansible.cfg content.
 */
function generateAnsibleCfg(data: ProjectTemplateData): string {
  const defaultInventory = data.defaultInventory || 'production';

  return `[defaults]
inventory = ${defaultInventory}
roles_path = ./roles
host_key_checking = False
stdout_callback = yaml
# retry_files_enabled = False

[privilege_escalation]
become = True
become_method = sudo
# become_user = root
# become_ask_pass = False

[ssh_connection]
pipelining = True
# ssh_args = -o ControlMaster=auto -o ControlPersist=60s
`;
}

/**
 * Generate .gitignore content.
 */
function generateGitignore(): string {
  return `# Ansible
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
`;
}

/**
 * Generate README.md content.
 */
function generateReadme(data: ProjectTemplateData): string {
  const projectName = data.projectName || 'ansible-project';
  const layout = data.layout || 'single';
  const environments = data.environments || ['production', 'staging'];

  let content = `# ${projectName}

Ansible project for infrastructure automation.

## Project Structure

`;

  if (layout === 'single') {
    content += `This project uses a single-environment layout with inventory files at the root level.

\`\`\`
${projectName}/
`;
    for (const env of environments) {
      content += `├── ${env}              # ${env} inventory\n`;
    }
    content += `├── group_vars/         # Group variable files
├── host_vars/          # Host-specific variables
├── roles/              # Custom and external roles
├── site.yml            # Main playbook
`;
    content += `└── ansible.cfg         # Ansible configuration
\`\`\`
`;
  } else {
    content += `This project uses a multi-environment layout with separate inventory directories.

\`\`\`
${projectName}/
├── inventories/
`;
    for (const env of environments) {
      content += `│   └── ${env}/
│       ├── hosts           # ${env} inventory
│       ├── group_vars/     # ${env} group vars
│       └── host_vars/      # ${env} host vars
`;
    }
    content += `├── playbooks/          # Additional playbooks
├── roles/              # Custom and external roles
├── site.yml            # Main playbook
└── ansible.cfg         # Ansible configuration
\`\`\`
`;
  }

  content += `
## Quick Start

1. Update the inventory files with your hosts
2. Configure variables in group_vars/
3. Run the playbook:

\`\`\`bash
`;

  if (layout === 'single') {
    content += `# Production
ansible-playbook -i production site.yml --check
ansible-playbook -i production site.yml

# Staging
ansible-playbook -i staging site.yml
`;
  } else {
    content += `# Production
ansible-playbook -i inventories/production site.yml --check
ansible-playbook -i inventories/production site.yml

# Staging
ansible-playbook -i inventories/staging site.yml
`;
  }

  content += `\`\`\`

## Requirements

- Ansible >= 2.14
- Python >= 3.9

## License

Proprietary
`;

  return content;
}

/**
 * Generate template content based on type.
 *
 * @param type - Template type
 * @param data - Template data
 * @returns Generated content string
 */
export function generateTemplateContent(type: ProjectTemplateType, data: ProjectTemplateData): string {
  switch (type) {
    case 'inventory':
      return generateInventory(data);
    case 'group_vars_all':
      return generateGroupVarsAll(data);
    case 'group_vars_group':
      return generateGroupVarsGroup(data);
    case 'site_yml':
      return generateSiteYml(data);
    case 'ansible_cfg':
      return generateAnsibleCfg(data);
    case 'gitignore':
      return generateGitignore();
    case 'readme':
      return generateReadme(data);
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}
