/**
 * Unit tests for wizard type definitions, schemas, and formatters.
 */

import { describe, expect, test } from 'bun:test';
import {
  type PlaybookWizardContext,
  type RoleWizardContext,
  formatPlaybookContextForPrompt,
  formatRoleContextForPrompt,
  playbookWizardSchema,
  roleWizardSchema,
} from './types.js';

/**
 * Creates a minimal valid RoleWizardContext with all required fields.
 * Allows overriding any field via the partial parameter.
 */
function createRoleContext(partial: Partial<RoleWizardContext> = {}): RoleWizardContext {
  return {
    structure: [],
    platforms: [],
    handlers: [],
    ansibleVersion: {
      minimum: '2.14',
      includeVersionCheck: false,
    },
    variableStrategy: {
      includeDefaults: true,
      includeVars: false,
      naming: 'prefixed',
    },
    privilegeEscalation: {
      required: 'yes',
      becomeUser: 'root',
    },
    tags: {
      strategy: 'grouped',
      groups: ['install', 'config', 'service'],
    },
    idempotency: {
      supportCheckMode: true,
      includeChangedWhen: true,
      includeFailedWhen: false,
    },
    dependencies: {
      includeMeta: true,
      roles: [],
    },
    molecule: {
      enabled: true,
      driver: 'docker',
      platforms: [],
      scenarios: ['default', 'idempotence'],
    },
    custom: {},
    ...partial,
  };
}

describe('roleWizardSchema', () => {
  describe('valid input', () => {
    test('accepts minimal valid input (empty arrays)', () => {
      const input = createRoleContext();

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts full valid input with all options', () => {
      const input = createRoleContext({
        structure: ['tasks', 'handlers', 'templates', 'files', 'defaults', 'vars', 'meta'],
        platforms: ['Ubuntu', 'RHEL', 'Debian', 'Windows', 'Generic'],
        handlers: ['restart', 'reload', 'enable', 'custom'],
        custom: { key: 'value', another: 'data' },
      });

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts single items in arrays', () => {
      const input = createRoleContext({
        structure: ['tasks'],
        platforms: ['Ubuntu'],
        handlers: ['restart'],
      });

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    test('rejects unknown structure directory', () => {
      const input = {
        structure: ['invalid_directory'],
        platforms: [],
        handlers: [],
        custom: {},
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects unknown platform', () => {
      const input = {
        structure: [],
        platforms: ['UnknownOS'],
        handlers: [],
        custom: {},
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects unknown handler', () => {
      const input = {
        structure: [],
        platforms: [],
        handlers: ['unknown_handler'],
        custom: {},
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects unknown fields (strict mode)', () => {
      const input = {
        structure: [],
        platforms: [],
        handlers: [],
        custom: {},
        unknownField: 'should fail',
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects missing required fields', () => {
      const input = {
        structure: [],
        platforms: [],
        // Missing handlers and custom
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('playbookWizardSchema', () => {
  describe('valid input', () => {
    test('accepts valid input with hosts', () => {
      const input: PlaybookWizardContext = {
        hosts: ['webservers', 'databases'],
        become: true,
        includeHandlers: false,
        custom: {},
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts empty hosts array', () => {
      const input: PlaybookWizardContext = {
        hosts: [],
        become: false,
        includeHandlers: true,
        custom: {},
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts single host', () => {
      const input: PlaybookWizardContext = {
        hosts: ['localhost'],
        become: true,
        includeHandlers: true,
        custom: { env: 'production' },
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid input', () => {
    test('rejects non-boolean become', () => {
      const input = {
        hosts: ['webservers'],
        become: 'yes', // Should be boolean
        includeHandlers: true,
        custom: {},
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects non-boolean includeHandlers', () => {
      const input = {
        hosts: ['webservers'],
        become: true,
        includeHandlers: 'include', // Should be boolean
        custom: {},
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects unknown fields (strict mode)', () => {
      const input = {
        hosts: ['webservers'],
        become: true,
        includeHandlers: false,
        custom: {},
        extraField: 'invalid',
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    test('rejects missing required fields', () => {
      const input = {
        hosts: ['webservers'],
        become: true,
        // Missing includeHandlers and custom
      };

      const result = playbookWizardSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe('formatRoleContextForPrompt', () => {
  test('formats full context with all fields', () => {
    const context = createRoleContext({
      structure: ['tasks', 'handlers', 'templates'],
      platforms: ['Ubuntu', 'RHEL'],
      handlers: ['restart', 'reload'],
    });

    const result = formatRoleContextForPrompt(context);

    // Check core fields
    expect(result.structure).toBe('tasks, handlers, templates');
    expect(result.platforms).toBe('Ubuntu, RHEL');
    expect(result.handlers).toBe('restart, reload');
    // Check new fields are present
    expect(result.ansible_min_version).toBe('2.14');
    expect(result.variable_naming).toBe('prefixed by role name');
    expect(result.privilege_escalation).toBe('yes');
  });

  test('handles empty arrays (omits empty structure/platforms/handlers)', () => {
    const context = createRoleContext({
      structure: [],
      platforms: [],
      handlers: [],
    });

    const result = formatRoleContextForPrompt(context);

    // Empty arrays should not be included
    expect(result.structure).toBeUndefined();
    expect(result.platforms).toBeUndefined();
    expect(result.handlers).toBeUndefined();
    // But other fields should still be present
    expect(result.ansible_min_version).toBe('2.14');
  });

  test('includes custom fields if non-empty', () => {
    const context = createRoleContext({
      structure: ['tasks'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
      custom: { ssl: 'letsencrypt', version: '1.20' },
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.structure).toBe('tasks');
    expect(result.platforms).toBe('Ubuntu');
    expect(result.handlers).toBe('restart');
    expect(result.ssl).toBe('letsencrypt');
    expect(result.version).toBe('1.20');
  });

  test('excludes custom fields if empty', () => {
    const context = createRoleContext({
      structure: ['tasks', 'defaults'],
      platforms: ['Debian'],
      handlers: ['enable'],
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.structure).toBe('tasks, defaults');
    expect(result.platforms).toBe('Debian');
    expect(result.handlers).toBe('enable');
    // No custom fields should be added
    expect(result.ssl).toBeUndefined();
  });

  test('handles single items in arrays', () => {
    const context = createRoleContext({
      structure: ['tasks'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.structure).toBe('tasks');
    expect(result.platforms).toBe('Ubuntu');
    expect(result.handlers).toBe('restart');
  });

  test('handles multiple items with comma separation', () => {
    const context = createRoleContext({
      structure: ['tasks', 'handlers', 'templates', 'defaults'],
      platforms: ['Ubuntu', 'RHEL', 'Debian'],
      handlers: ['restart', 'reload', 'enable'],
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.structure).toBe('tasks, handlers, templates, defaults');
    expect(result.platforms).toBe('Ubuntu, RHEL, Debian');
    expect(result.handlers).toBe('restart, reload, enable');
  });

  test('formats molecule settings when enabled', () => {
    const context = createRoleContext({
      molecule: {
        enabled: true,
        driver: 'podman',
        platforms: ['Ubuntu', 'Debian'],
        scenarios: ['default', 'side_effect'],
      },
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.molecule_testing).toBe('enabled');
    expect(result.molecule_driver).toBe('podman');
    expect(result.molecule_platforms).toBe('Ubuntu, Debian');
    expect(result.molecule_scenarios).toBe('default, side_effect');
  });

  test('formats molecule settings when disabled', () => {
    const context = createRoleContext({
      molecule: {
        enabled: false,
      },
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.molecule_testing).toBe('disabled');
    expect(result.molecule_driver).toBeUndefined();
  });

  test('formats idempotency settings', () => {
    const context = createRoleContext({
      idempotency: {
        supportCheckMode: true,
        includeChangedWhen: true,
        includeFailedWhen: true,
      },
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.idempotency).toBe(
      'check mode support, changed_when conditions, failed_when conditions',
    );
  });

  test('formats dependencies with roles', () => {
    const context = createRoleContext({
      dependencies: {
        includeMeta: true,
        roles: ['geerlingguy.docker', 'geerlingguy.pip'],
      },
    });

    const result = formatRoleContextForPrompt(context);

    expect(result.include_meta).toBe('yes');
    expect(result.role_dependencies).toBe('geerlingguy.docker, geerlingguy.pip');
  });
});

describe('formatPlaybookContextForPrompt', () => {
  test('formats become as "yes"', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers'],
      become: true,
      includeHandlers: false,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.become).toBe('yes');
  });

  test('formats become as "no"', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers'],
      become: false,
      includeHandlers: true,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.become).toBe('no');
  });

  test('formats includeHandlers as "include"', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers'],
      become: false,
      includeHandlers: true,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.handlers).toBe('include');
  });

  test('formats includeHandlers as "exclude"', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers'],
      become: true,
      includeHandlers: false,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.handlers).toBe('exclude');
  });

  test('handles single host', () => {
    const context: PlaybookWizardContext = {
      hosts: ['localhost'],
      become: true,
      includeHandlers: true,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.hosts).toBe('localhost');
  });

  test('handles multiple hosts (comma-separated)', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers', 'databases', 'loadbalancers'],
      become: true,
      includeHandlers: false,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.hosts).toBe('webservers, databases, loadbalancers');
  });

  test('handles empty hosts array', () => {
    const context: PlaybookWizardContext = {
      hosts: [],
      become: false,
      includeHandlers: false,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result.hosts).toBeUndefined();
  });

  test('includes custom fields if non-empty', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers'],
      become: true,
      includeHandlers: true,
      custom: { env: 'production', region: 'us-east' },
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result).toEqual({
      hosts: 'webservers',
      become: 'yes',
      handlers: 'include',
      env: 'production',
      region: 'us-east',
    });
  });

  test('excludes custom fields if empty', () => {
    const context: PlaybookWizardContext = {
      hosts: ['databases'],
      become: false,
      includeHandlers: false,
      custom: {},
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result).toEqual({
      hosts: 'databases',
      become: 'no',
      handlers: 'exclude',
    });
  });

  test('formats complete context with all fields', () => {
    const context: PlaybookWizardContext = {
      hosts: ['webservers', 'databases'],
      become: true,
      includeHandlers: false,
      custom: { timeout: '300', retries: '3' },
    };

    const result = formatPlaybookContextForPrompt(context);

    expect(result).toEqual({
      hosts: 'webservers, databases',
      become: 'yes',
      handlers: 'exclude',
      timeout: '300',
      retries: '3',
    });
  });
});
