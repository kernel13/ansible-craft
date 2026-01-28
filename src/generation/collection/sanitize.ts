/**
 * Collection name sanitization and validation.
 *
 * Collections have stricter naming requirements than roles:
 * - Only lowercase letters, numbers, and underscores
 * - Must start with a letter
 * - No hyphens allowed (unlike roles)
 */

/** Maximum length for namespace/name */
const MAX_COLLECTION_NAME_LENGTH = 50;

/** Regex for valid collection namespace/name */
const COLLECTION_NAME_REGEX = /^[a-z][a-z0-9_]*$/;

/** Semantic version regex (MAJOR.MINOR.PATCH) */
const SEMANTIC_VERSION_REGEX = /^\d+\.\d+\.\d+$/;

/**
 * Sanitize a collection namespace or name to be valid for Ansible Galaxy.
 * - Lowercase only
 * - Replace spaces and hyphens with underscores
 * - Remove special characters (keep alphanumeric and underscores)
 * - Remove leading/trailing underscores
 * - Collapse multiple underscores
 * - Ensure starts with letter
 * - Truncate to 50 chars max
 */
export function sanitizeCollectionName(name: string): string {
  return (
    name
      // Lowercase
      .toLowerCase()
      // Replace spaces and hyphens with underscores
      .replace(/[\s-]+/g, '_')
      // Remove special characters (keep alphanumeric and underscores)
      .replace(/[^a-z0-9_]/g, '')
      // Collapse multiple underscores
      .replace(/_+/g, '_')
      // Remove leading/trailing underscores
      .replace(/^_+|_+$/g, '')
      // Ensure starts with letter (prepend 'c' if needed)
      .replace(/^[0-9]/, 'c$&')
      // Truncate to max length
      .slice(0, MAX_COLLECTION_NAME_LENGTH)
      // Remove trailing underscore if truncation created one
      .replace(/_+$/, '')
  );
}

/**
 * Alias for namespace sanitization (same rules as name).
 */
export function sanitizeNamespace(namespace: string): string {
  return sanitizeCollectionName(namespace);
}

/**
 * Infer collection name from a natural language description.
 * Extracts key nouns and sanitizes to collection-valid format.
 *
 * @example
 * inferCollectionName('web utilities') // -> 'web_utilities'
 * inferCollectionName('database tools') // -> 'database_tools'
 */
export function inferCollectionName(description: string): string {
  let text = description.toLowerCase();

  // Remove common filler words
  const fillerWords = ['a', 'an', 'the', 'for', 'with', 'on', 'to', 'and', 'or'];
  const fillerRegex = new RegExp(`\\b(${fillerWords.join('|')})\\b`, 'gi');
  text = text.replace(fillerRegex, '');

  // Split into words
  const words = text
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 20);

  // Take first 2-3 meaningful words
  const meaningfulWords = words.slice(0, 3);

  if (meaningfulWords.length === 0) {
    return 'collection';
  }

  // Join with underscores and sanitize
  return sanitizeCollectionName(meaningfulWords.join('_'));
}

/**
 * Validate a collection namespace or name.
 * Returns error message if invalid, undefined if valid.
 */
export function validateCollectionName(name: string): string | undefined {
  if (!name || name.length === 0) {
    return 'Collection name cannot be empty';
  }

  if (name.length > MAX_COLLECTION_NAME_LENGTH) {
    return `Collection name must be ${MAX_COLLECTION_NAME_LENGTH} characters or less`;
  }

  if (!COLLECTION_NAME_REGEX.test(name)) {
    return 'Collection name must start with a letter and contain only lowercase letters, numbers, and underscores';
  }

  return undefined;
}

/**
 * Validate semantic version string (MAJOR.MINOR.PATCH).
 * Returns error message if invalid, undefined if valid.
 */
export function validateSemanticVersion(version: string): string | undefined {
  if (!version || version.length === 0) {
    return 'Version cannot be empty';
  }

  if (!SEMANTIC_VERSION_REGEX.test(version)) {
    return 'Version must follow semantic versioning format (MAJOR.MINOR.PATCH), e.g., "1.0.0"';
  }

  return undefined;
}

/**
 * Validate a fully qualified collection name (namespace.name).
 * Returns error message if invalid, undefined if valid.
 */
export function validateFQCN(fqcn: string): string | undefined {
  const parts = fqcn.split('.');
  if (parts.length !== 2) {
    return 'FQCN must be in format namespace.name';
  }

  const [namespace, name] = parts;

  const namespaceError = validateCollectionName(namespace);
  if (namespaceError) {
    return `Invalid namespace: ${namespaceError}`;
  }

  const nameError = validateCollectionName(name);
  if (nameError) {
    return `Invalid name: ${nameError}`;
  }

  return undefined;
}
