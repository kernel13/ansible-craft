# Phase 5: Playbook Generation - Context

**Gathered:** 2026-01-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Generate Ansible playbooks from natural language descriptions. Users can run `ansible-craft new playbook "deploy LAMP stack"` and get a complete playbook project with proper YAML structure, FQCN compliance, and idempotency patterns.

</domain>

<decisions>
## Implementation Decisions

### Output structure
- Generate a project structure, not a single file
- Include: playbook.yml + group_vars/ + inventory.example
- group_vars/ organized by inventory group (webservers.yml, databases.yml, etc.)
- Include README.md with usage instructions and ansible-playbook command examples

### Play organization
- Multiple plays in one playbook.yml for different host groups/stages
- Inline tasks (self-contained) + comments suggesting which could be extracted to roles
- Handlers section at the end of each play
- Use pre_tasks for fact gathering/validation, post_tasks for verification when appropriate

### Content depth
- Production-ready output with full error handling, validation, and idempotency
- Comments on non-obvious tasks explaining purpose and decisions
- group_vars files grouped by purpose with section headers (# Network settings)
- Include assert/fail tasks in pre_tasks for input validation (fail fast)

### Multi-host handling
- hosts: patterns use group names matching inventory (webservers, databases)
- serial: shown as commented example with explanation of when to use
- Each task explicitly specifies become: when privilege escalation needed
- Delegation (delegate_to, run_once) included only when request clearly needs it

### Claude's Discretion
- Delegation usage based on playbook requirements
- Complexity level based on request (simple request = simpler output within production-ready constraints)
- Which tasks warrant inline comments vs self-documenting names
- Role extraction suggestions based on reusability patterns

</decisions>

<specifics>
## Specific Ideas

- Project structure mirrors role generation pattern but with playbook-specific files
- README should include prerequisites, variable overrides, and example commands
- Validation in pre_tasks prevents cryptic failures downstream
- Comments should explain "why" not "what" - task names handle the what

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-playbook-generation*
*Context gathered: 2026-01-19*
