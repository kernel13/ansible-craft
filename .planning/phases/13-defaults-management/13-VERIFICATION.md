---
phase: 13-defaults-management
verified: 2026-01-23T19:45:00Z
status: gaps_found
score: 6/7 must-haves verified
gaps:
  - truth: "Project-level config override properly merges wizard defaults"
    status: failed
    reason: "loader.ts mergeConfig uses shallow merge, would overwrite entire wizard object"
    artifacts:
      - path: "src/config/loader.ts"
        issue: "mergeConfig() line 30-44 lacks deep wizard merge unlike writer.ts"
    missing:
      - "Deep merge wizard field in loader.ts mergeConfig: wizard: overlay.defaults?.wizard ?? base.defaults.wizard"
---

# Phase 13: Defaults Management Verification Report

**Phase Goal:** Users can save wizard choices for reuse in future sessions
**Verified:** 2026-01-23T19:45:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Config schema supports wizard defaults for both role and playbook | ✓ VERIFIED | WizardDefaults interface exists in schema.ts with role/playbook fields |
| 2 | Defaults can be serialized to TOML with nested sections | ✓ VERIFIED | writer.ts lines 57-89 generate [defaults.wizard.role] and [defaults.wizard.playbook] |
| 3 | Defaults can be loaded from config file | ✓ VERIFIED | loadConfigWithProjectOverride exists, reads TOML successfully |
| 4 | User is asked to save defaults at end of wizard (before generation starts) | ✓ VERIFIED | promptToSaveDefaults() called immediately after wizard in new.ts:275, 670 |
| 5 | Saved defaults stored in ~/.config/ansible-craft/config.toml | ✓ VERIFIED | saveConfig() writes to CONFIG_PATH with wizard sections |
| 6 | --quick flag uses saved defaults when available | ✓ VERIFIED | new.ts:285, 685 loads existingDefaults ?? getQuickModeDefaults() |
| 7 | config defaults command allows updating defaults without generation | ✓ VERIFIED | config.ts:132-196 implements `config defaults <type>` command |

**Score:** 6/7 truths verified (one partial issue found)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/config/schema.ts` | WizardDefaults type | ✓ VERIFIED | Lines 14-21: interface with defaults_version, role, playbook |
| `src/config/writer.ts` | TOML generation for wizard sections | ✓ VERIFIED | Lines 57-89: generates nested TOML with arrays using JSON.stringify |
| `src/config/loader.ts` | loadConfigWithProjectOverride function | ⚠️ PARTIAL | Function exists but mergeConfig lacks deep wizard merge (line 30-44) |
| `src/wizard/defaults.ts` | Helper functions | ✓ VERIFIED | All exports present: hasChangedFromDefaults, displayDefaultsPreview, getQuickModeDefaults, WIZARD_DEFAULTS_VERSION |
| `src/cli/commands/new.ts` | Post-wizard save prompt, --quick defaults | ✓ VERIFIED | promptToSaveDefaults at line 100, called at 275/670, --quick at 285/685 |
| `src/cli/commands/config.ts` | config defaults subcommand | ✓ VERIFIED | Lines 132-196: command with wizard execution and save logic |
| `src/config/index.ts` | Re-exports | ✓ VERIFIED | Line 8: exports loadConfigWithProjectOverride |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| schema.ts | wizard/types.ts | type import | ✓ WIRED | Line 5: import type { PlaybookWizardContext, RoleWizardContext } |
| writer.ts | schema.ts | Config type | ✓ WIRED | Line 14: import type { Config }, used in generateConfigToml |
| new.ts | wizard/defaults.ts | helper imports | ✓ WIRED | Lines 25-30: imports all helper functions, used in promptToSaveDefaults |
| new.ts | config/writer.ts | saveConfig with error handling | ✓ WIRED | Line 124: saveConfig in try-catch at new.ts:117-140 |
| config.ts | wizard/role-wizard.ts | runRoleWizard | ✓ WIRED | Line 15: import runRoleWizard, used at line 148 |
| config.ts | wizard/playbook-wizard.ts | runPlaybookWizard | ✓ WIRED | Line 14: import runPlaybookWizard, used at line 148 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/config/loader.ts | 30-44 | Shallow merge of defaults field | ⚠️ Warning | Project config would overwrite entire wizard object instead of merging role/playbook separately |

**Categorization:**
- ⚠️ Warning (1): Shallow merge inconsistency - loader.ts differs from writer.ts deep merge pattern
- ℹ️ Info: Console.log usage in wizard/defaults.ts and config.ts is appropriate for CLI display

### Gaps Summary

**1 gap blocking complete goal achievement:**

**Gap: Project-level config override merge inconsistency**
- **Issue:** `src/config/loader.ts` mergeConfig() uses shallow merge for defaults field
- **Expected behavior:** Deep merge wizard like writer.ts: `wizard: overlay.defaults?.wizard ?? base.defaults.wizard`
- **Actual behavior:** `...overlay.defaults` overwrites entire wizard object if project config has wizard field
- **Impact:** If global config has role defaults and project has playbook defaults, one would overwrite the other
- **Severity:** Medium - edge case (project config wizard defaults not documented/tested), but violates consistency

**Why this matters:**
- writer.ts explicitly handles deep merge (line 107)
- loader.ts should match this pattern for consistency
- Project override is a documented feature (loadConfigWithProjectOverride)
- Without deep merge, you cannot have role defaults in global and playbook defaults in project

**Fix required:**
```typescript
// In src/config/loader.ts, line 36-39, change from:
defaults: {
  ...base.defaults,
  ...overlay.defaults,
},

// To:
defaults: {
  ...base.defaults,
  ...overlay.defaults,
  // Deep merge wizard if both exist
  wizard: overlay.defaults?.wizard ?? base.defaults.wizard,
},
```

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| DFLT-01: User can save wizard choices as defaults | ✓ SATISFIED | None |
| DFLT-02: config defaults command for managing preferences | ✓ SATISFIED | None |

### Testing Status

**Automated tests:** ✓ PASS
- `bun test`: 919 pass, 0 fail
- `bun run lint`: Clean (pre-existing warnings only)

**Manual verification needed:**
None - all functionality programmatically verifiable.

**Test coverage gaps:**
- No test for project-level wizard defaults override scenario
- This would have caught the shallow merge issue

---

_Verified: 2026-01-23T19:45:00Z_
_Verifier: Claude (gsd-verifier)_
