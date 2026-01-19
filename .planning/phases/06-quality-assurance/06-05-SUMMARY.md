---
phase: 06-quality-assurance
plan: 05
subsystem: cli-integration
tags: [cli, lint, auto-fix, progress, dry-run]

dependency-graph:
  requires: ["06-01", "06-02", "06-03", "06-04"]
  provides: [complete-qa-workflow, lint-integration, auto-fix-cli]
  affects: [07-testing, 08-release]

tech-stack:
  added: []
  patterns: [phase-tracker, temp-file-validation, preview-confirm]

key-files:
  created: []
  modified:
    - src/cli/commands/new.ts
    - src/generation/index.ts
    - src/generation/generate-role.ts
    - src/generation/generate-playbook.ts

decisions:
  - id: "06-05-01"
    decision: "Pass quiet: true to inner functions when PhaseTracker handles progress"
    rationale: "Cleaner than adding externalProgress option - reuses existing quiet mechanism"
  - id: "06-05-02"
    decision: "Temp file approach for ansible-lint validation"
    rationale: "Lint requires files on disk; temp dir allows pre-write validation"
  - id: "06-05-03"
    decision: "Auto-fix confirmation default true"
    rationale: "Fixable issues are safe to auto-fix; encourages clean code"

metrics:
  duration: ~3min
  completed: 2026-01-19
---

# Phase 06 Plan 05: QA Integration Summary

**One-liner:** Complete QA workflow wired into `new role` and `new playbook` commands with PhaseTracker, ansible-lint validation, auto-fix prompting, and syntax-highlighted dry-run preview.

## What Was Done

### Task 1: Role Command QA Integration
- Added `--fix` flag for auto-fix without prompting
- Added `-q, --quiet` flag for suppressing progress output
- Integrated PhaseTracker for progressive phase display with elapsed time
- Added ansible-lint validation using temp file approach
- Wired auto-fix prompting (or auto-apply with `--fix`)
- Enhanced dry-run mode with syntax-highlighted preview and lint results
- Added helper functions: `writeTempFiles()`, `cleanupTempDir()`

### Task 2: Playbook Command QA Integration
- Applied identical workflow to playbook command
- Both commands now share consistent QA experience
- Same flags: `--fix`, `-q/--quiet`
- Same phases: Planning, Code Generation, Validation, Lint Check, Auto-fix, Write

### Task 3: Documentation for External Progress Tracking
- Updated `quiet` option docs in GenerateOptions and PlaybookGenerateOptions
- Clarified that `quiet: true` enables external progress tracking (PhaseTracker)
- Existing implementation already correctly supports this pattern

## Technical Details

### Workflow Order
1. Load config and create client
2. Planning phase (with PhaseTracker)
3. Plan preview and confirmation loop
4. Code generation phase
5. YAML validation phase
6. ansible-lint validation (if available)
7. Auto-fix phase (if violations and fixable)
8. Dry-run preview (if `--dry-run`)
9. Write files
10. Display result and next steps

### Temp File Approach
```typescript
const tempDir = join(tmpdir(), `ansible-craft-${Date.now()}`);
// Write all files to temp dir
const lintResult = await runAnsibleLint(tempDir);
// Cleanup after lint
await cleanupTempDir(tempDir);
```

### Exports Added to generation/index.ts
- `runAnsibleLint`, `isAnsibleLintAvailable`, `formatInstallInstructions`
- `applyAutoFixes`, `canAutoFix`
- `LintViolation`, `AnsibleLintResult`, `AutoFixResult`

## Commits

| Hash | Type | Description |
|------|------|-------------|
| a6e14ad | feat | Integrate quality assurance into role command |
| bae5927 | feat | Integrate quality assurance into playbook command |
| c4c3fd7 | docs | Document quiet option for external progress tracking |

## Verification Results

- TypeScript compiles without errors in modified files
- All 156 tests pass
- `--help` shows `--fix` and `-q/--quiet` flags for both commands
- Commands properly integrate all QA components

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria Met

- [x] new role and new playbook commands have --fix flag
- [x] PhaseTracker shows progressive phase completion with elapsed time
- [x] ansible-lint runs on temp files before writing (when available)
- [x] Auto-fix prompts user unless --fix flag used
- [x] --dry-run shows syntax-highlighted preview with lint results
- [x] Missing ansible-lint shows helpful install instructions

## Next Phase Readiness

Phase 06 Quality Assurance is now complete. All five plans executed:
- 06-01: ansible-lint wrapper
- 06-02: Progress tracking
- 06-03: Preview/dry-run
- 06-04: Auto-fix system
- 06-05: CLI integration (this plan)

Ready to proceed to Phase 07 Testing.
