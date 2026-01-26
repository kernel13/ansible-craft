# Claude Code Integration

This directory contains all Claude Code integration files for ansible-craft. These files enable AI-assisted Ansible development through slash commands and specialized agents.

## Installation

Install skills and agents using the CLI:

```bash
# Install to ~/.claude/ (global - recommended)
bun run src/cli/index.ts setup

# Install to ./.claude/ (project-local)
bun run src/cli/index.ts setup --project

# Force overwrite existing files
bun run src/cli/index.ts setup --force
```

Or run the installer directly:

```bash
bun run cc/scripts/install-skills.ts [--global|--project] [--force]
```

After installation:
- Skills are available as `/ac:role`, `/ac:playbook`, `/ac:explain`, `/ac:fix`
- Agents are available for Task tool invocation with `subagent_type: "ac-*"`

## Directory Structure

```
cc/
├── agents/                         # Specialized agents for Task tool
│   ├── ac-planner.md               # Plans role/playbook structure
│   ├── ac-generator.md             # Generates playbook files
│   ├── ac-generator-core.md        # Generates role core files
│   ├── ac-generator-tasks.md       # Generates role task files
│   ├── ac-generator-templates.md   # Generates role templates
│   ├── ac-generator-molecule.md    # Generates Molecule tests
│   ├── ac-validator.md             # Static code validation
│   ├── ac-linter.md                # Runs ansible-lint
│   └── ac-fixer.md                 # Auto-fixes lint violations
├── common/
│   └── references/                 # Shared reference documentation
│       ├── fqcn.md                 # FQCN module mappings
│       ├── lint-fixes.md           # Lint fix patterns
│       ├── molecule.md             # Molecule testing guide
│       ├── patterns.md             # Ansible best practices
│       ├── playbook-structure.md   # Playbook conventions
│       └── role-structure.md       # Galaxy role structure
├── scripts/
│   └── install-skills.ts           # Installation script
└── skills/
    └── ac/                         # Slash command definitions
        ├── role.md                 # /ac:role command
        ├── playbook.md             # /ac:playbook command
        ├── explain.md              # /ac:explain command
        └── fix.md                  # /ac:fix command
```

## Skills (Slash Commands)

Skills are user-invocable slash commands that orchestrate agents to complete tasks.

| Command | Description | Use Case |
|---------|-------------|----------|
| `/ac:role` | Generate Ansible roles | "Create a role for nginx with SSL" |
| `/ac:playbook` | Generate Ansible playbooks | "Create a LAMP stack deployment playbook" |
| `/ac:explain` | Explain Ansible code | "Explain this role's tasks" |
| `/ac:fix` | Fix Ansible errors | "Fix this ansible-lint error" |

### Role Generation Workflow

```
/ac:role → AskUserQuestion → ac-planner → User Approval
                                              ↓
         ┌──────────────────┬─────────────────┼─────────────────┬──────────────────┐
         ↓                  ↓                 ↓                 ↓                  │
  ac-generator-core  ac-generator-tasks  ac-generator-templates  ac-generator-molecule
         │                  │                 │                 │                  │
         └──────────────────┴─────────────────┼─────────────────┴──────────────────┘
                                              ↓
                              ac-validator + ac-linter (parallel)
                                              ↓
                                    ac-fixer (if needed)
```

### Playbook Generation Workflow

```
/ac:playbook → AskUserQuestion → ac-planner → User Approval
                                                  ↓
                                            ac-generator
                                                  ↓
                              ac-validator + ac-linter (parallel)
                                                  ↓
                                        ac-fixer (if needed)
```

## Agents

Agents are specialized workers invoked via the Task tool with `subagent_type`.

| Agent | Purpose | Tools |
|-------|---------|-------|
| `ac-planner` | Generate structured plans from requirements | Read, Grep, Glob, WebSearch |
| `ac-generator` | Generate playbook files from plans | Read, Write, Grep, Glob |
| `ac-generator-core` | Generate role core files (defaults, vars, handlers, meta, README) | Read, Write, Grep, Glob |
| `ac-generator-tasks` | Generate role task files (tasks/*.yml) | Read, Write, Grep, Glob |
| `ac-generator-templates` | Generate role templates (templates/*.j2) | Read, Write, Grep, Glob |
| `ac-generator-molecule` | Generate Molecule test files (molecule/**/*) | Read, Write, Grep, Glob |
| `ac-validator` | Static validation (YAML, FQCN, idempotency) | Read, Grep, Glob |
| `ac-linter` | Run ansible-lint and parse results | Read, Bash, Grep, Glob |
| `ac-fixer` | Auto-fix lint violations | Read, Edit, Grep, Glob |

### Agent Invocation Example

```json
{
  "tool": "Task",
  "parameters": {
    "subagent_type": "ac-planner",
    "description": "Plan nginx role",
    "prompt": "Generate a role plan for nginx with SSL support..."
  }
}
```

## References

Reference documents provide shared knowledge for agents. Agents read these files during generation and validation.

| File | Description |
|------|-------------|
| `fqcn.md` | Fully Qualified Collection Name mappings (short → FQCN) |
| `lint-fixes.md` | Common ansible-lint violations and their fixes |
| `molecule.md` | Molecule testing configuration patterns |
| `patterns.md` | Ansible best practices and idempotency patterns |
| `playbook-structure.md` | Playbook directory conventions and structure |
| `role-structure.md` | Galaxy-standard role directory structure |

## Development

### Adding a New Skill

1. Create a markdown file in `cc/skills/ac/` with YAML frontmatter:
   ```yaml
   ---
   name: ac:new-skill
   description: What this skill does
   allowed-tools:
     - Task
     - Read
     # ... other tools
   ---
   ```

2. Define the workflow and agent orchestration in the markdown body

3. Run `bun run src/cli/index.ts setup --force` to reinstall

### Adding a New Agent

1. Create a markdown file in `cc/agents/` with YAML frontmatter:
   ```yaml
   ---
   name: ac-new-agent
   description: What this agent does
   tools: Read, Write, Grep, Glob
   color: blue
   ---
   ```

2. Define the agent's role, philosophy, and process in the markdown body

3. Run `bun run src/cli/index.ts setup --force` to reinstall

### Adding a Reference Document

1. Create a markdown file in `cc/common/references/`

2. Update skills and agents to reference it:
   ```
   Read cc/common/references/new-reference.md for guidance on...
   ```

### File Naming Conventions

- **Skills**: `cc/skills/ac/{name}.md` → becomes `/ac:{name}` command
- **Agents**: `cc/agents/ac-{name}.md` → becomes `ac-{name}` subagent_type
- **References**: `cc/common/references/{topic}.md` → descriptive topic name
