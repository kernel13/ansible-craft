// Role structure utilities
export {
  ROLE_DIRECTORIES,
  REQUIRED_FILES,
  createRoleStructure,
  roleExists,
  type RoleStructureOptions,
  type RoleStructureResult,
} from './structure.js';

// Role name sanitization
export {
  sanitizeRoleName,
  inferRoleName,
  validateRoleName,
} from './sanitize.js';

// Generated output parsing
export {
  parseGeneratedFiles,
  hasFileMarkers,
  countFiles,
  type GeneratedFile,
} from './parser.js';

// YAML validation and quality checks
export {
  validateYaml,
  validateAllFiles,
  checkFqcn,
  checkIdempotency,
  validateGeneratedRole,
  type ValidationResult,
  type FqcnWarning,
  type IdempotencyWarning,
  type ValidationSummary,
} from './validator.js';

// Existing role reading
export {
  readExistingRole,
  formatExistingRoleForPrompt,
  type ExistingRoleContent,
} from './reader.js';
