---
phase: 08-publishing
plan: 01
subsystem: infra
tags: [npm, tsup, bundler, publishing, packaging]

# Dependency graph
requires:
  - phase: 07-error-commands
    provides: complete CLI implementation
provides:
  - tsup bundler configuration
  - npm publishing metadata
  - package file exclusions
affects: [08-02, 08-03, 08-04, 08-05]

# Tech tracking
tech-stack:
  added: [tsup]
  patterns: [esm-only-bundling, files-whitelist]

key-files:
  created:
    - tsup.config.ts
    - .npmignore
  modified:
    - package.json

key-decisions:
  - "ESM-only build: CJS incompatible with top-level await in codebase"
  - "No banner config: source already has shebang"
  - "files whitelist: dist, README.md, LICENSE"

patterns-established:
  - "Bundler entry point: src/cli/index.ts -> dist/cli/index.js"
  - "Build script: bun run build triggers tsup"

# Metrics
duration: 4min
completed: 2026-01-21
---

# Phase 8 Plan 1: Package Configuration Summary

**tsup bundler for ESM-only CLI distribution with npm publishing metadata and file exclusions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-21T18:35:00Z
- **Completed:** 2026-01-21T18:39:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- Installed tsup bundler with node18 target configuration
- Added complete npm publishing metadata (author, repository, bugs, homepage, engines, keywords)
- Created .npmignore with comprehensive exclusion patterns
- Build produces single 117KB bundled CLI at dist/cli/index.js

## Task Commits

Each task was committed atomically:

1. **Task 1: Install tsup and update package.json metadata** - `a04f047` (chore)
2. **Task 2: Create tsup configuration** - `627496a` (feat)
3. **Task 3: Create .npmignore** - `9eaedcd` (chore)

## Files Created/Modified

- `package.json` - Added tsup dependency, npm metadata, files whitelist, build scripts
- `tsup.config.ts` - Bundler configuration for ESM CLI output
- `.npmignore` - Exclusion patterns for clean npm packages

## Decisions Made

- **[08-01-01] ESM-only build:** CJS format not supported because codebase uses top-level await which is incompatible with CommonJS. Plan specified dual ESM/CJS but this is a technical limitation.
- **[08-01-02] No banner needed:** Source file (src/cli/index.ts) already has shebang, so no banner config required in tsup.
- **[08-01-03] files whitelist:** Using npm files field (dist, README.md, LICENSE) rather than relying solely on .npmignore.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed banner config causing duplicate shebang**
- **Found during:** Task 2 (Create tsup configuration)
- **Issue:** tsup banner config + existing source shebang = double shebang in output
- **Fix:** Removed banner config since source already has shebang
- **Files modified:** tsup.config.ts
- **Verification:** Build succeeds with single shebang
- **Committed in:** 627496a (Task 2 commit)

**2. [Technical limitation] ESM-only instead of dual format**
- **Found during:** Task 2 (Create tsup configuration)
- **Issue:** Plan specified dual ESM/CJS but CJS fails: "Module format 'cjs' does not support top-level await"
- **Fix:** Changed to ESM-only format
- **Files modified:** tsup.config.ts
- **Verification:** Build succeeds producing dist/cli/index.js
- **Committed in:** 627496a (Task 2 commit)

---

**Total deviations:** 2 (1 bug fix, 1 technical limitation)
**Impact on plan:** ESM-only is sufficient for Node 18+ and modern npm usage. CJS can be added in plan 02 if needed by refactoring top-level await.

## Issues Encountered

- Double shebang in output due to both source shebang and banner config - resolved by removing banner
- CJS incompatibility with top-level await - accepted ESM-only as solution

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Build infrastructure ready for plan 02 (dual format entry points)
- npm metadata complete for publishing
- Consideration: Plan 02 may need to address top-level await for CJS compatibility

---
*Phase: 08-publishing*
*Completed: 2026-01-21*
