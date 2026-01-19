import type { GeneratedFile } from '../role/parser.js';

export interface FqcnWarning {
  type: 'fqcn';
  path: string;
  line: number;
  module: string;
  suggestion: string;
}

/** Map of short module names to their FQCN equivalents */
const FQCN_MAP: Record<string, string> = {
  // Package management
  apt: 'ansible.builtin.apt',
  yum: 'ansible.builtin.yum',
  dnf: 'ansible.builtin.dnf',
  package: 'ansible.builtin.package',
  pip: 'ansible.builtin.pip',
  // File operations
  file: 'ansible.builtin.file',
  copy: 'ansible.builtin.copy',
  template: 'ansible.builtin.template',
  lineinfile: 'ansible.builtin.lineinfile',
  blockinfile: 'ansible.builtin.blockinfile',
  stat: 'ansible.builtin.stat',
  unarchive: 'ansible.builtin.unarchive',
  get_url: 'ansible.builtin.get_url',
  // Service management
  service: 'ansible.builtin.service',
  systemd: 'ansible.builtin.systemd_service',
  systemd_service: 'ansible.builtin.systemd_service',
  // User/group
  user: 'ansible.builtin.user',
  group: 'ansible.builtin.group',
  // Command execution
  command: 'ansible.builtin.command',
  shell: 'ansible.builtin.shell',
  // Control flow
  include_tasks: 'ansible.builtin.include_tasks',
  import_tasks: 'ansible.builtin.import_tasks',
  include_vars: 'ansible.builtin.include_vars',
  set_fact: 'ansible.builtin.set_fact',
  debug: 'ansible.builtin.debug',
  fail: 'ansible.builtin.fail',
  assert: 'ansible.builtin.assert',
};

/**
 * Check if a file is a YAML file based on extension.
 */
function isYamlFile(path: string): boolean {
  return path.endsWith('.yml') || path.endsWith('.yaml');
}

/**
 * Check for short module names that should use FQCN.
 *
 * Detects patterns like:
 * - apt:        (should be ansible.builtin.apt:)
 * - copy:       (should be ansible.builtin.copy:)
 *
 * Does not flag already-qualified names like:
 * - ansible.builtin.apt:
 * - community.general.something:
 *
 * @param file - Generated file to check
 * @returns Array of warnings
 */
export function checkFqcnCompliance(file: GeneratedFile): FqcnWarning[] {
  // Skip non-YAML files
  if (!isYamlFile(file.path)) {
    return [];
  }

  const warnings: FqcnWarning[] = [];
  const lines = file.content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;

    // Skip lines that are already using FQCN
    if (line.includes('ansible.') || line.includes('community.')) {
      continue;
    }

    // Check each known short module name
    for (const [shortName, fqcn] of Object.entries(FQCN_MAP)) {
      // Match module at task key position:
      // - "  apt:" (indented module)
      // - "- apt:" (list item module)
      // - "  - apt:" (indented list item)
      // Must be followed by : and then space/newline/end
      const regex = new RegExp(`^(\\s*-?\\s*)${shortName}:\\s*(?:\\S|$)`, 'm');

      if (regex.test(line)) {
        warnings.push({
          type: 'fqcn',
          path: file.path,
          line: lineNumber,
          module: shortName,
          suggestion: fqcn,
        });
        // Only one warning per line (in case of overlapping patterns)
        break;
      }
    }
  }

  return warnings;
}
