/**
 * galaxy.yml schema validation.
 *
 * Defines required fields and validation rules for Ansible Galaxy collections.
 */

/** Required fields in galaxy.yml */
export const GALAXY_YML_REQUIRED_FIELDS = [
  'namespace',
  'name',
  'version',
  'readme',
  'authors',
  'license',
] as const;

/** Optional fields in galaxy.yml */
export const GALAXY_YML_OPTIONAL_FIELDS = [
  'description',
  'license_file',
  'tags',
  'dependencies',
  'repository',
  'documentation',
  'homepage',
  'issues',
] as const;

/**
 * galaxy.yml structure interface.
 */
export interface GalaxyYml {
  namespace: string;
  name: string;
  version: string;
  readme: string;
  authors: string[];
  license: string[];
  description?: string;
  license_file?: string;
  tags?: string[];
  dependencies?: Record<string, string>;
  repository?: string;
  documentation?: string;
  homepage?: string;
  issues?: string;
}

/**
 * Validate galaxy.yml structure against required fields.
 */
export function validateGalaxyYml(data: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['galaxy.yml must be a valid YAML object'] };
  }

  const galaxy = data as Partial<GalaxyYml>;

  // Check required fields
  for (const field of GALAXY_YML_REQUIRED_FIELDS) {
    if (!(field in galaxy) || galaxy[field as keyof GalaxyYml] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate namespace format
  if (galaxy.namespace && !/^[a-z][a-z0-9_]*$/.test(galaxy.namespace)) {
    errors.push(
      'namespace must start with a letter and contain only lowercase letters, numbers, and underscores',
    );
  }

  // Validate name format
  if (galaxy.name && !/^[a-z][a-z0-9_]*$/.test(galaxy.name)) {
    errors.push(
      'name must start with a letter and contain only lowercase letters, numbers, and underscores',
    );
  }

  // Validate version format (semantic versioning)
  if (galaxy.version && !/^\d+\.\d+\.\d+$/.test(galaxy.version)) {
    errors.push('version must follow semantic versioning format (MAJOR.MINOR.PATCH)');
  }

  // Validate authors is an array
  if (galaxy.authors && !Array.isArray(galaxy.authors)) {
    errors.push('authors must be an array');
  } else if (galaxy.authors && galaxy.authors.length === 0) {
    errors.push('authors must contain at least one author');
  }

  // Validate license is an array
  if (galaxy.license && !Array.isArray(galaxy.license)) {
    errors.push('license must be an array');
  } else if (galaxy.license && galaxy.license.length === 0) {
    errors.push('license must contain at least one license');
  }

  // Validate dependencies is an object
  if (galaxy.dependencies && typeof galaxy.dependencies !== 'object') {
    errors.push('dependencies must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
