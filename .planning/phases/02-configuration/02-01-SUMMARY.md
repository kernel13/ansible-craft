---
phase: 02-configuration
plan: 01
subsystem: config
tags: [toml, smol-toml, configuration, environment-variables]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: CLIError class for error handling
provides:
  - Config TypeScript interfaces (Config, ApiConfig, DefaultsConfig, OutputConfig)
  - TOML config file loading from ~/.ansible-craft/config.toml
  - Environment variable ANTHROPIC_API_KEY reading
  - Conflict detection between config sources
  - DEFAULT_CONFIG with sensible defaults
affects: [02-02, 02-03, 03-api-integration]

# Tech tracking
tech-stack:
  added: [smol-toml@1.6.0]
  patterns: [config-merge, env-var-precedence, conflict-detection]

key-files:
  created:
    - src/config/schema.ts
    - src/config/paths.ts
    - src/config/defaults.ts
    - src/config/loader.ts
    - src/config/index.ts
  modified:
    - package.json
    - src/cli/output.ts

key-decisions:
  - "smol-toml for TOML parsing - lightweight, modern ESM library"
  - "Env var takes precedence over config file (common CLI pattern)"
  - "Error on conflict when both sources have different API keys"

patterns-established:
  - "Config module structure: schema.ts → paths.ts → defaults.ts → loader.ts → index.ts"
  - "Deep merge for config objects with explicit property overlay"
  - "CLIError with code and suggestion for user-friendly errors"

# Metrics
duration: 4min
completed: 2026-01-18
---

# Phase 02 Plan 01: Config Infrastructure Summary

**TOML config loading with smol-toml, env var support, and conflict detection for API key sources**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-18
- **Completed:** 2026-01-18
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Config TypeScript interfaces with proper typing for all settings
- Cross-platform config path resolution (~/.ansible-craft/config.toml)
- Default configuration with sensible values (sonnet model, plain format)
- Config loading with TOML parsing and env var merge
- Conflict detection between env var and config file API keys

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and create config schema** - `2f34110` (feat)
2. **Task 2: Implement config loading with conflict detection** - `c2467a4` (feat)

## Files Created/Modified
- `src/config/schema.ts` - TypeScript interfaces for Config, ApiConfig, DefaultsConfig, OutputConfig
- `src/config/paths.ts` - Cross-platform config path resolution with helper functions
- `src/config/defaults.ts` - DEFAULT_CONFIG constant with sensible defaults
- `src/config/loader.ts` - loadConfig() and configExists() with conflict detection
- `src/config/index.ts` - Public config API re-exporting all components
- `package.json` - Added smol-toml dependency
- `src/cli/output.ts` - Fixed pre-existing lint issues (import order, template literal)

## Decisions Made
- **smol-toml library:** Chosen for TOML parsing - lightweight, modern ESM, TypeScript support
- **Env var precedence:** When no conflict, env var takes precedence (common CLI pattern)
- **Conflict detection:** Error when both env var and config file have different API key values

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing lint issues in output.ts**
- **Found during:** Task 1 (lint verification)
- **Issue:** output.ts had import order and string concatenation lint violations
- **Fix:** Reordered imports alphabetically, used template literal instead of concatenation
- **Files modified:** src/cli/output.ts
- **Verification:** `bun run lint` passes
- **Committed in:** 2f34110 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Lint fix was necessary for verification to pass. No scope creep.

## Issues Encountered
None - plan executed without blocking issues.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Config infrastructure complete, ready for config save command (02-02)
- loadConfig() can be used by API integration phase (03)
- CLIError patterns established for consistent error messaging

---
*Phase: 02-configuration*
*Completed: 2026-01-18*
