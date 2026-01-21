# Feature Landscape: Plan Mode (Interactive Wizard)

**Domain:** CLI interactive wizard for Ansible role/playbook configuration
**Researched:** 2026-01-21
**Confidence:** HIGH (verified against CLI UX guidelines and @inquirer/prompts documentation)
**Mode:** Subsequent Milestone - Adding to existing CLI tool

## Context: Existing Features

ansible-craft v1.0 already has:
- `new role "description"` - two-phase generation (plan preview -> code)
- `new playbook "description"` - same two-phase pattern
- Plan preview with accept/modify/reject flow
- @inquirer/prompts already in use (select, input, confirm)
- Configuration system (TOML-based, ~/.config/ansible-craft/)
- Progress indicators (ora spinners)
- Dry-run preview

**Key insight:** The plan preview interaction already exists. "Plan mode" extends this with a **front-loaded wizard** before the AI generates anything.

## Table Stakes

Features users expect from any CLI wizard. Missing = wizard feels incomplete.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Step-by-step prompts** | Core wizard pattern - one question at a time | Low | Uses existing @inquirer/prompts |
| **Progress indicator** | "Step 2 of 5" - users need orientation | Low | Simple counter, no new deps |
| **Keyboard navigation** | Arrow keys, Enter, Tab | Built-in | @inquirer/prompts provides this |
| **Clear exit pathway** | Ctrl+C cancellation with confirmation | Low | Handle SIGINT gracefully |
| **Input validation** | Reject invalid values with clear error | Low | @inquirer/prompts validation |
| **Default values** | Sensible pre-filled answers | Low | Infer from context |
| **Skip flag (--quick)** | Bypass wizard for scripts/power users | Low | CLI flag + defaults |
| **Non-interactive mode** | Full bypass with all defaults | Low | --no-interactive flag exists |

### Ansible-Specific Table Stakes

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| **Role structure selection** | Choose what directories to include | Low | Checkbox prompt |
| **Platform targeting** | RHEL/Ubuntu/Debian/generic | Low | Select prompt |
| **Variable collection** | Define key variables upfront | Medium | Dynamic input prompts |
| **Handler definition** | Specify restart/reload handlers | Low | Multi-input prompt |
| **Template specification** | Identify config files to template | Low | Input with suggestions |

## Differentiators

Features that set ansible-craft apart. Not expected, but valued.

### High-Impact Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Save defaults option** | "Remember my choices" for future runs | Medium | Extend config system |
| **Context detection** | Auto-detect existing project structure | Medium | File system analysis |
| **Conditional prompts** | Show/hide prompts based on previous answers | Low | @inquirer/prompts when() |
| **Description enhancement** | Wizard augments user description with collected details | Low | String concatenation |
| **Preview before generation** | Show what will be asked of AI before API call | Low | Summary display |
| **Wizard profiles** | --profile=minimal, --profile=full, --profile=testing | Medium | Profile definitions |

### Medium-Impact Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Suggested values from description** | AI-assisted defaults based on initial description | High | Extra API call |
| **Role complexity selector** | Simple/standard/advanced templates | Low | Predefined structures |
| **Group vars wizard** | Collect environment-specific variables | Medium | Nested wizard flow |
| **Multi-play wizard** | Playbook-specific: define multiple plays | Medium | Repeatable prompt groups |
| **Import existing role** | Parse existing role to pre-fill wizard | High | YAML parsing + inference |

### Lower-Impact Differentiators

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| **Wizard history** | Recall last wizard session answers | Medium | Session storage |
| **Undo/back navigation** | Go back to previous question | Medium | State machine |
| **Autocomplete for modules** | Suggest Ansible modules while typing | Medium | Module database |
| **Dry-run wizard** | Show what prompts will be asked | Low | Separate command |

## Anti-Features

Features to explicitly NOT build. Common mistakes in wizard design.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Too many prompts** | >7 prompts cause abandonment (research shows 5-7 optimal) | Group related questions, use smart defaults |
| **Mandatory wizard** | Frustrates power users | Always allow --quick or positional args |
| **No skip for optional prompts** | Users stuck on irrelevant questions | Allow Enter for default/skip |
| **Nested wizards within wizards** | Confusing, hard to track state | Flatten or use separate commands |
| **Verbose explanations per prompt** | Slows down experienced users | Brief hints, --verbose for details |
| **Auto-save without consent** | Unexpected persistence | Explicit "Save as default?" prompt |
| **Complex branching logic** | Combinatorial explosion of paths | Linear flow with skip conditions |
| **GUI-style forms** | Terminal limitations, accessibility | Sequential prompts, one at a time |
| **Required prompts for scriptable info** | Breaks CI/CD | Accept via flags or env vars |
| **Changing prompt order** | Confuses returning users | Consistent, predictable order |

## UX Patterns to Follow

### 1. First-Run Wizard Pattern
From [Lucas F. Costa's CLI UX guide](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html):
> "Your very first impression should be a guided setup that writes a config you can tweak later. Not a questionnaire - just a few, high-signal prompts with safe defaults and a clear escape hatch."

**Implementation:**
```
ansible-craft new role "nginx reverse proxy"

  Plan Mode (5 steps, press Ctrl+C to use defaults)

  Step 1/5: Role Structure
  > Which directories do you need?
    [x] tasks (required)
    [x] handlers
    [x] templates
    [ ] files
    [x] defaults
    [ ] vars
    [ ] meta

  Step 2/5: Target Platforms
  > Select target OS(es):
    [x] Ubuntu 20.04+
    [x] RHEL 8+
    [ ] Debian
    [ ] Generic (all)

  ...
```

### 2. Smart Prompting for Missing Information
From [clig.dev guidelines](https://clig.dev/):
> "Rather than throwing an error, your CLI should prompt the user to enter any outstanding information. Make sure to consider the cases where users provide some, none, and all of the required options."

**Implementation:**
```bash
# No flags: full wizard
ansible-craft new role "nginx"

# Partial flags: only missing prompts
ansible-craft new role "nginx" --platform=ubuntu

# All flags: skip wizard entirely
ansible-craft new role "nginx" --platform=ubuntu --structure=standard --quick
```

### 3. Progress Indication
From [Evil Martians CLI UX guide](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays):
> "Opt for the X of Y pattern whenever you're handling step-by-step processes."

**Implementation:**
```
Step 2 of 5: Target Platforms
```

### 4. Bypass for Scripts
From [clig.dev](https://clig.dev/):
> "The user cannot script the command if prompting is required to complete it. To avoid frustrating users, allow the user to override prompts always."

**Implementation:**
- `--quick` flag skips wizard, uses intelligent defaults
- `--no-interactive` completely disables prompts (existing flag)
- All wizard options available as CLI flags

### 5. Store Option Pattern
From [Yeoman documentation](https://yeoman.io/authoring/user-interactions.html):
> "When set to true, Yeoman will store/fetch the user's answers as defaults."

**Implementation:**
```
  Step 5/5: Save Preferences?
  > Save these choices as defaults for future roles?
    ( ) Yes, always use these settings
    ( ) Yes, but ask to confirm
    (x) No, ask me each time
```

### 6. Conditional Prompts
From [Enquirer documentation](https://github.com/enquirer/enquirer):
> "The when property receives previous answers as its parameter, allowing complex decision-making."

**Implementation:**
```typescript
{
  type: 'checkbox',
  name: 'handlers',
  message: 'Which handlers do you need?',
  when: (answers) => answers.structure.includes('handlers'),
  choices: ['restart service', 'reload config', 'custom']
}
```

## Wizard Flow Design

### Role Generation Wizard

```
1. Role Structure (checkbox)
   - tasks, handlers, templates, files, defaults, vars, meta
   - Default: tasks, handlers, defaults

2. Target Platforms (checkbox, conditional)
   - Show only if description doesn't specify
   - Ubuntu, RHEL, Debian, Generic
   - Default: Generic

3. Key Variables (dynamic input, optional)
   - "What variables should be configurable?"
   - Allow multiple entries or skip
   - Default: infer from description

4. Service Handlers (checkbox, conditional)
   - Show only if handlers selected in step 1
   - restart, reload, enable, custom
   - Default: restart + reload

5. Save Preferences (select, last step)
   - Save as default / Confirm each time / Never
   - Default: Never
```

### Playbook Generation Wizard

```
1. Play Count (number or select)
   - Single play / Multiple plays / Let AI decide
   - Default: Let AI decide

2. Inventory Groups (input)
   - "Which inventory groups will this target?"
   - Default: all

3. Become/Privileges (confirm)
   - "Requires privilege escalation (become: yes)?"
   - Default: infer from description

4. Include Handlers (confirm)
   - Default: yes

5. Group Variables (conditional, complex)
   - Show only if multiple groups
   - Collect per-group variables
   - Default: skip

6. Save Preferences (same as role)
```

## Feature Dependencies

```
Existing Features:
------------------
@inquirer/prompts (select, input, confirm) -----> Wizard prompts
Config system (TOML) --------------------------> Save defaults
Phase tracker (ora) ---------------------------> Step progress
--no-interactive flag -------------------------> Quick mode

New Feature Dependencies:
-------------------------
Wizard step counter --> ora spinner integration (update message format)

Save defaults --> Config schema extension
             --> Prompt history storage
             --> Re-read on next run

Conditional prompts --> Answer state tracking
                   --> when() function per prompt

Context detection --> File system reading
                 --> Existing code in src/explain/file-reader.ts

--quick flag --> Default value inference
           --> Skip wizard logic
           --> Command-line flag parsing
```

## Complexity Assessment

### Low Complexity (Hours to 1-2 Days)
- Step counter display ("Step 2 of 5")
- --quick flag to skip wizard
- Checkbox prompts for structure/platforms
- Basic input prompts for variables
- Exit/cancel handling
- Description enhancement with wizard answers

### Medium Complexity (Days)
- Save defaults to config (extend schema)
- Load saved defaults on next run
- Conditional prompts (when() logic)
- Dynamic prompt count based on conditions
- Profile system (--profile=minimal)
- Context detection from existing files

### High Complexity (Week+)
- AI-assisted default values (extra API call)
- Import existing role to pre-fill wizard
- Undo/back navigation in wizard
- Full wizard state machine with branching

## MVP Recommendation

### Phase 1: Basic Wizard (v1.1.0)
1. Step counter ("Step 2 of 5")
2. Role structure checkbox (tasks, handlers, templates, etc.)
3. Platform targeting select
4. --quick flag to skip
5. Enhance description with wizard answers

### Phase 2: Smart Defaults (v1.2.0)
1. Save defaults to config
2. Load defaults on next run
3. Conditional prompts
4. Playbook wizard (multi-play support)

### Phase 3: Advanced (v1.3.0+)
1. Wizard profiles
2. Context detection
3. AI-assisted suggestions
4. Import existing role

## Sources

### CLI UX Guidelines
- [Command Line Interface Guidelines](https://clig.dev/) - Comprehensive CLI design principles
- [UX Patterns for CLI Tools](https://lucasfcosta.com/2022/06/01/ux-patterns-cli-tools.html) - Lucas F. Costa's detailed patterns
- [Atlassian's 10 Design Principles for CLIs](https://www.atlassian.com/blog/it-teams/10-design-principles-for-delightful-clis) - Enterprise CLI best practices
- [Evil Martians CLI Progress Displays](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays) - Progress indicator patterns

### Prompt Libraries
- [@inquirer/prompts npm](https://www.npmjs.com/package/@inquirer/prompts) - Modern Inquirer.js API
- [Enquirer GitHub](https://github.com/enquirer/enquirer) - Alternative prompt library with when() support
- [Yeoman User Interactions](https://yeoman.io/authoring/user-interactions.html) - Store option pattern

### Wizard Design
- [NN/g Wizard Definition](https://www.nngroup.com/articles/wizards/) - When to use wizards
- [How to Design a Form Wizard](https://coyleandrew.medium.com/how-to-design-a-form-wizard-b85fe1cc665a) - Best practices
- [AWS CLI Wizards](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-wizard.html) - Enterprise wizard patterns
- [GitHub CLI Prompts](https://github.com/cli/cli/issues/1739) - Non-interactive mode discussion
