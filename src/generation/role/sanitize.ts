/** Maximum length for a role name */
const MAX_ROLE_NAME_LENGTH = 50;

/** Common action words to strip when inferring role name */
const ACTION_WORDS = [
  'install',
  'configure',
  'setup',
  'set up',
  'deploy',
  'create',
  'manage',
  'add',
  'enable',
  'provision',
] as const;

/** Common filler words to remove from descriptions */
const FILLER_WORDS = [
  'a',
  'an',
  'the',
  'for',
  'with',
  'on',
  'to',
  'and',
  'or',
  'that',
  'this',
  'my',
  'our',
] as const;

/**
 * Sanitize a role name to be valid for Ansible/Galaxy.
 * - Lowercase only
 * - Replace spaces and underscores with hyphens
 * - Remove special characters
 * - Remove leading/trailing hyphens
 * - Collapse multiple hyphens
 * - Truncate to 50 chars max
 */
export function sanitizeRoleName(name: string): string {
  return (
    name
      // Lowercase
      .toLowerCase()
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Remove special characters (keep alphanumeric and hyphens)
      .replace(/[^a-z0-9-]/g, '')
      // Collapse multiple hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
      // Truncate to max length
      .slice(0, MAX_ROLE_NAME_LENGTH)
      // Remove trailing hyphen if truncation created one
      .replace(/-+$/, '')
  );
}

/**
 * Infer role name from a natural language description.
 * Extracts key nouns/verbs and sanitizes.
 */
export function inferRoleName(description: string): string {
  let text = description.toLowerCase();

  // Try to extract pattern: "action X with/for Y" -> "X-Y"
  // e.g., "install nginx with SSL" -> "nginx-ssl"
  for (const action of ACTION_WORDS) {
    const actionRegex = new RegExp(`^${action}\\s+`, 'i');
    if (actionRegex.test(text)) {
      text = text.replace(actionRegex, '');
      break;
    }
  }

  // Remove common filler words
  const fillerRegex = new RegExp(`\\b(${FILLER_WORDS.join('|')})\\b`, 'gi');
  text = text.replace(fillerRegex, '');

  // Split into words
  const words = text
    .split(/[\s,]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0 && w.length <= 20);

  // Take first 3 meaningful words
  const meaningfulWords = words.slice(0, 3);

  if (meaningfulWords.length === 0) {
    return 'role';
  }

  // Join and sanitize
  return sanitizeRoleName(meaningfulWords.join('-'));
}

/**
 * Validate a role name is valid for Ansible/Galaxy.
 * Returns error message if invalid, undefined if valid.
 */
export function validateRoleName(name: string): string | undefined {
  if (!name || name.length === 0) {
    return 'Role name cannot be empty';
  }

  if (name.length > MAX_ROLE_NAME_LENGTH) {
    return `Role name must be ${MAX_ROLE_NAME_LENGTH} characters or less`;
  }

  if (!/^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/.test(name)) {
    return 'Role name must start with a letter, end with alphanumeric, and contain only lowercase letters, numbers, and hyphens';
  }

  if (/--/.test(name)) {
    return 'Role name cannot contain consecutive hyphens';
  }

  return undefined;
}
