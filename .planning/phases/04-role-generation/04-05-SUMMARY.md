---
phase: 04-role-generation
plan: 05
subsystem: cli
tags: [cli, generation, writer, user-interface]
depends_on: [04-03, 04-04]
provides:
  - "new role command with full generation flow"
  - "File writer with conflict handling"
  - "Plan preview and validation display"
affects: [05-playbook-generation]
tech-stack:
  added: []
  patterns:
    - "Commander subcommand pattern (new -> role)"
    - "Interactive prompts with select/input"
    - "Dry-run mode for preview"
key-files:
  created:
    - src/generation/writer.ts
    - src/cli/commands/new.ts
  modified:
    - src/generation/index.ts
    - src/cli/program.ts
decisions:
  - id: "04-05-01"
    decision: "Confirm prompt for existing directory"
    rationale: "Safe default prevents accidental data loss"
  - id: "04-05-02"
    decision: "Accept/Modify/Reject workflow for plan"
    rationale: "User control over generation before code output"
  - id: "04-05-03"
    decision: "Show next steps after generation"
    rationale: "Guide user to ansible-lint and molecule test"
metrics:
  duration: "~2.5 minutes"
  completed: "2026-01-19"
---

# Phase 04 Plan 05: CLI Command & File Writer Summary

**One-liner:** Complete `new role` command with plan preview, validation, and conflict-aware file writing

## What Was Built

### 1. File Writer (src/generation/writer.ts)
- `writeGeneratedRole()` - Writes generated files with dry-run support
- `displayRoleTree()` - Visual tree display of created structure
- Conflict handling: prompts user or uses --force
- Removes existing directory before writing (after confirmation)

### 2. New Role Command (src/cli/commands/new.ts)
- Full generation flow: config -> plan -> review -> generate -> validate -> write
- Plan preview shows: role name, description, tasks, variables, handlers, templates, platforms
- Interactive workflow: Accept, Modify (regenerate with feedback), or Reject
- Options: --dry-run, --force, --output, --name, --no-interactive

### 3. CLI Registration (src/cli/program.ts)
- `newCommand` registered in program
- `ansible-craft new role "description"` now available

## Generation Flow

```
User: ansible-craft new role "install nginx with SSL"
         |
         v
    [Load Config] -> Check API key configured
         |
         v
    [Infer Name] -> "nginx-ssl" (or use --name)
         |
         v
    [Phase 1: Plan] -> AI generates structured plan
         |
         v
    [Display Preview] -> Tasks, Variables, Handlers, Templates
         |
         v
    [User Decision] -> Accept / Modify / Reject
         |                    |
         |               [Feedback]
         |                    |
         v                    v
    [Phase 2: Generate] <- [Regenerate Plan]
         |
         v
    [Validate] -> YAML syntax, FQCN, Idempotency
         |
         v
    [Write Files] -> (or dry-run preview)
         |
         v
    [Success] -> Show tree + next steps
```

## Key Code Patterns

### Conflict Handling
```typescript
try {
  await access(roleDir);
  // Directory exists - prompt or force
  if (!options.force) {
    const overwrite = await confirm({ message: '...' });
    if (!overwrite) throw new Error('Operation cancelled by user');
  }
  if (!options.dryRun) await rm(roleDir, { recursive: true });
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
}
```

### Plan Modification Loop
```typescript
while (!confirmed) {
  const action = await select({
    choices: [
      { value: 'accept', name: 'Accept - Generate the role' },
      { value: 'modify', name: 'Modify - Provide feedback' },
      { value: 'reject', name: 'Reject - Cancel' },
    ],
  });
  if (action === 'modify') {
    const feedback = await input({ message: 'What changes?' });
    currentPlan = await generateRolePlan(client, `${description}\n\nUser feedback: ${feedback}`);
  }
}
```

## Command Options

| Option | Description |
|--------|-------------|
| `-o, --output <dir>` | Output directory (default: cwd) |
| `-n, --name <name>` | Override inferred role name |
| `--dry-run` | Preview without writing |
| `--force` | Overwrite without prompting |
| `--no-interactive` | Skip clarifying questions |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `bun run typecheck` equivalent passes for new files
- [x] `ansible-craft new role --help` shows all options
- [x] Plan preview displays tasks, variables, handlers, templates, platforms
- [x] User can Accept, Modify, or Reject the plan
- [x] Validation runs before writing
- [x] Existing directories prompt unless --force
- [x] --dry-run shows what would be created

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | dccb4c2 | Create file writer with conflict handling |
| 2 | 67e15df | Create new role command with full generation flow |
| 3 | 1c85806 | Register new command in CLI program |

## Next Phase Readiness

Phase 4 (Role Generation) is now **COMPLETE**. The system can:
1. Generate plan preview from natural language
2. Allow user to review and modify plans
3. Generate complete role code
4. Validate YAML, FQCN, and idempotency
5. Write files with conflict handling

Ready to proceed to Phase 5 (Playbook Generation) which will follow the same patterns.
