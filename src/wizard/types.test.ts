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

describe('roleWizardSchema', () => {
  describe('valid input', () => {
    test('accepts minimal valid input (empty arrays)', () => {
      const input: RoleWizardContext = {
        structure: [],
        platforms: [],
        handlers: [],
        custom: {},
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts full valid input with all options', () => {
      const input: RoleWizardContext = {
        structure: ['tasks', 'handlers', 'templates', 'files', 'defaults', 'vars', 'meta'],
        platforms: ['Ubuntu', 'RHEL', 'Debian', 'Windows', 'Generic'],
        handlers: ['restart', 'reload', 'enable', 'custom'],
        custom: { key: 'value', another: 'data' },
      };

      const result = roleWizardSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    test('accepts single items in arrays', () => {
      const input: RoleWizardContext = {
        structure: ['tasks'],
        platforms: ['Ubuntu'],
        handlers: ['restart'],
        custom: {},
      };

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
    const context: RoleWizardContext = {
      structure: ['tasks', 'handlers', 'templates'],
      platforms: ['Ubuntu', 'RHEL'],
      handlers: ['restart', 'reload'],
      custom: {},
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({
      structure: 'tasks, handlers, templates',
      platforms: 'Ubuntu, RHEL',
      handlers: 'restart, reload',
    });
  });

  test('handles empty arrays (returns empty strings omitted)', () => {
    const context: RoleWizardContext = {
      structure: [],
      platforms: [],
      handlers: [],
      custom: {},
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({});
  });

  test('includes custom fields if non-empty', () => {
    const context: RoleWizardContext = {
      structure: ['tasks'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
      custom: { ssl: 'letsencrypt', version: '1.20' },
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({
      structure: 'tasks',
      platforms: 'Ubuntu',
      handlers: 'restart',
      ssl: 'letsencrypt',
      version: '1.20',
    });
  });

  test('excludes custom fields if empty', () => {
    const context: RoleWizardContext = {
      structure: ['tasks', 'defaults'],
      platforms: ['Debian'],
      handlers: ['enable'],
      custom: {},
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({
      structure: 'tasks, defaults',
      platforms: 'Debian',
      handlers: 'enable',
    });
  });

  test('handles single items in arrays', () => {
    const context: RoleWizardContext = {
      structure: ['tasks'],
      platforms: ['Ubuntu'],
      handlers: ['restart'],
      custom: {},
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({
      structure: 'tasks',
      platforms: 'Ubuntu',
      handlers: 'restart',
    });
  });

  test('handles multiple items with comma separation', () => {
    const context: RoleWizardContext = {
      structure: ['tasks', 'handlers', 'templates', 'defaults'],
      platforms: ['Ubuntu', 'RHEL', 'Debian'],
      handlers: ['restart', 'reload', 'enable'],
      custom: {},
    };

    const result = formatRoleContextForPrompt(context);

    expect(result).toEqual({
      structure: 'tasks, handlers, templates, defaults',
      platforms: 'Ubuntu, RHEL, Debian',
      handlers: 'restart, reload, enable',
    });
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
