# Domain Pitfalls: TypeScript CLI + AI Code Generation for Ansible

**Project:** Ansible Craft
**Domain:** TypeScript CLI with Claude API integration for Ansible role/playbook generation
**Researched:** 2026-01-18
**Confidence:** HIGH (verified with official docs, multiple authoritative sources)

---

## Critical Pitfalls

Mistakes that cause major rewrites, production failures, or project abandonment.

### P1: Unhandled Rate Limiting Cascade

**What goes wrong:** CLI makes API calls without proper rate limit handling. When 429 errors occur, naive retry logic fires multiple immediate retries, creating a cascade of 14+ additional 429 errors. Users see cryptic failures, lose trust in the tool.

**Why it happens:**
- Developers test with low volume, never hitting rate limits
- Claude API has complex limits: RPM (requests/min), ITPM (input tokens/min), OTPM (output tokens/min)
- Short bursts can exceed limits even when average usage is fine (60 RPM can be enforced as 1 request/second)

**Consequences:**
- Tool becomes unusable during peak times
- Users get charged for failed requests
- Reputation damage from unreliable CLI

**Prevention:**
- Implement exponential backoff with jitter for 429 errors
- Read `retry-after` header from 429 responses
- Use exponential backoff starting at 1 second for 529 (overloaded) errors
- Add request queuing to smooth out burst traffic
- Monitor rate limit headers (X-RateLimit-*) proactively

**Detection:** Monitor for 429/529 errors in telemetry; test with rate limit simulation.

**Phase to address:** Phase 1 (Core API Integration) - Build this into foundation, not retrofitted.

**Sources:**
- [Claude API Errors Documentation](https://platform.claude.com/docs/en/api/errors)
- [Claude Rate Limits](https://platform.claude.com/docs/en/api/rate-limits)

---

### P2: LLM Output Parsing Fragility

**What goes wrong:** AI generates Ansible YAML that looks correct but fails parsing. JSON extraction from Claude responses breaks on edge cases. Tool crashes or produces invalid output 20-40% of the time.

**Why it happens:**
- LLMs produce inconsistent formatting even with strict prompts
- Missing closing braces, extra markdown wrapping, type mismatches
- "Return valid JSON only" instructions are unreliable
- AI-generated code has 1.75x more logic/correctness errors than human code

**Consequences:**
- Users lose confidence after repeated failures
- Silent corruption: YAML looks valid but has subtle errors
- Production Ansible runs fail with confusing errors

**Prevention:**
- Use Claude's tool_use/structured outputs API instead of raw JSON prompting
- Define strict JSON schemas for all output types
- Always validate output with Ajv or Zod even with structured outputs
- Implement repair logic for common formatting issues (json_repair library)
- Use Pydantic-style schemas that infer TypeScript types

**Detection:**
- Track parsing success rate in metrics
- Integration tests with malformed response mocks
- Fuzz testing with varied prompt variations

**Phase to address:** Phase 2 (Prompt Engineering & Output) - Core to code generation quality.

**Sources:**
- [Structured Output AI Reliability Guide](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/)
- [State of AI Code Quality 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/)

---

### P3: YAML/Jinja2 Template Corruption

**What goes wrong:** Generated Ansible roles have subtle YAML formatting issues or broken Jinja2 templates. Works in development but fails in production with cryptic errors like "could not find expected ':'".

**Why it happens:**
- AI doesn't understand YAML's whitespace sensitivity
- Jinja2 `{{ variable }}` conflicts with YAML parsing
- AI generates "false" (string) instead of `false` (boolean)
- Template logic complexity: AI puts `{% if %}` blocks that change basic structure

**Consequences:**
- Ansible runs fail silently or with unhelpful errors
- Hours of debugging generated code
- Users copy-paste generated content and propagate errors

**Prevention:**
- Quote all Jinja2 expressions in generated YAML (sanitize post-generation)
- Use `true/false` booleans, not strings
- Validate with `ansible-lint` before output
- Test with `ansible-playbook --syntax-check`
- Keep Jinja2 logic simple - make decisions in Ansible, not templates
- Test edge cases: empty lists, boolean strings, multiline strings

**Detection:**
- Run `ansible-lint` on all generated content
- Test with `ansible-playbook --syntax-check`
- Integration tests covering Jinja2 edge cases

**Phase to address:** Phase 2 (Prompt Engineering) + Phase 3 (Validation) - Critical for quality.

**Sources:**
- [Ansible Templating Documentation](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating.html)
- [Ansible Lint Documentation](https://ansible-lint.readthedocs.io)

---

### P4: ESM/CJS Module System Hell

**What goes wrong:** Published npm package works in some environments but fails with "Cannot use import statement outside a module" or "require is not defined" errors. TypeScript builds succeed but runtime fails.

**Why it happens:**
- TypeScript in 2025 still has ESM/CJS friction
- Different Node.js versions have different module resolution
- `package.json` configuration is complex and error-prone
- Dependencies may be ESM-only or CJS-only

**Consequences:**
- Package unusable for significant portion of users
- Support burden from environment-specific failures
- Delayed launch while debugging module issues

**Prevention:**
- Use `tsup` or `tshy` for dual ESM/CJS publishing
- Configure package.json with proper `exports` field for both formats
- Set `"type": "module"` in package.json
- Provide separate `main` (CJS), `module` (ESM), and `types` fields
- Enable `shims: true` in tsup for CJS compatibility
- Test installation in both ESM and CJS projects in CI

**Detection:**
- Test installation in both ESM and CJS projects
- CI matrix with Node.js 18, 20, 22
- `npm pack` + local install testing before publish

**Phase to address:** Phase 1 (Project Setup) - Get module system right from the start.

**Sources:**
- [TypeScript ESM/CJS Publishing in 2025](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)
- [Node.js TypeScript Publishing Guide](https://nodejs.org/en/learn/typescript/publishing-a-ts-package)

---

### P5: Token Cost Explosion

**What goes wrong:** Development costs $5, production costs $5,000/month. Users generate massive playbooks and hit unexpected bills. Context accumulation in multi-turn conversations burns tokens exponentially.

**Why it happens:**
- By message 10, you're sending 40,000 tokens to get a 100-token response
- Retry logic without token awareness: failed request = wasted tokens
- Full documents fed as context instead of relevant chunks
- No spending limits or user quotas

**Consequences:**
- Project becomes financially unsustainable
- Users abandon tool after unexpected bills
- Enterprise customers reject due to unpredictable costs

**Prevention:**
- Track tokens per request using response.usage fields
- Calculate cost per operation (input tokens * rate + output tokens * rate)
- Implement context windowing - truncate old history to stay within budget
- Cache responses for common patterns (target >60% hit rate)
- Set hard spending limits with graduated responses
- Consider model routing: use cheaper models for simpler tasks

**Detection:**
- Log cost per operation
- Set up billing alerts
- Monitor cache hit rate (target: >60%)

**Phase to address:** Phase 1 (Core) + Phase 4 (Optimization) - Foundation + ongoing improvement.

**Sources:**
- [Monitor and Optimize LLM Costs](https://www.helicone.ai/blog/monitor-and-optimize-llm-costs)
- [LLM Cost Management Guide](https://www.kosmoy.com/post/llm-cost-management-stop-burning-money-on-tokens)

---

## Common Mistakes

Frequently made errors that cause delays or technical debt but are recoverable.

### M1: Non-FQCN Module References

**What goes wrong:** Generated Ansible content uses short module names (`copy`, `file`) instead of FQCNs (`ansible.builtin.copy`). Works locally but fails in stricter environments or causes ambiguity.

**Why it happens:**
- Training data includes legacy Ansible patterns
- Short names feel "cleaner" to AI
- Pre-2.10 Ansible patterns dominate examples

**Prevention:**
- Include FQCN requirement in system prompt explicitly
- Post-process with `ansible-lint --fix` (has auto-fix for FQCN)
- Validate: `ansible-lint -r fqcn`
- Avoid `collections:` keyword in generated playbooks (deprecated approach)

**Detection:** Search generated output for module names without dots - all modules should match `namespace.collection.module` pattern.

**Phase to address:** Phase 2 (Prompt Engineering)

**Sources:**
- [Ansible Lint FQCN Rule](https://docs.ansible.com/projects/lint/rules/fqcn/)
- [Ansible 2.10 Porting Guide](https://docs.ansible.com/ansible/latest/porting_guides/porting_guide_2.10.html)

---

### M2: Silent Progress During Long Operations

**What goes wrong:** CLI hangs with no output while generating complex roles. Users kill the process thinking it's stuck. No indication of progress or what's happening.

**Why it happens:**
- Developers test with fast responses
- Claude API calls for complex generation take 30-60+ seconds
- Default behavior is wait-for-completion

**Prevention:**
- Use spinners (ora) for operations 2-10 seconds
- Use progress bars for multi-step operations (cli-progress)
- Stream responses for long operations and show token count progress
- Clear spinners/progress bars when complete
- Support `--no-color` / `NO_COLOR` environment variable
- Consider `--plain` flag for machine-readable output

**Detection:**
- Manual testing with --verbose flag
- User feedback collection
- Operation timing telemetry

**Phase to address:** Phase 3 (CLI UX)

**Sources:**
- [CLI UX Best Practices for Progress Displays](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)
- [ora npm package comparison](https://npm-compare.com/cli-progress,cli-spinners,ora,progress)

---

### M3: TypeScript `any` Creep

**What goes wrong:** API responses, parsed YAML, and user inputs gradually become `any` typed. Type safety erodes. Bugs that TypeScript should catch slip through.

**Why it happens:**
- AI response shapes are complex
- YAML parsing returns `unknown`
- Pressure to ship faster than type correctly
- "I'll fix the types later" (never happens)

**Prevention:**
- Enable strict mode in tsconfig.json from day one
- Set `noImplicitAny: true` and `strictNullChecks: true`
- Use Zod for runtime validation + type inference
- Validate at boundaries: all external data gets parsed through schemas
- ESLint rule: `@typescript-eslint/no-explicit-any`

**Detection:**
- Count `any` occurrences: should be <10 in entire codebase
- ESLint enforcement in CI

**Phase to address:** Phase 1 (Project Setup) - Configure strict TypeScript from start.

**Sources:**
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052)
- [Common TypeScript Mistakes](https://lakin-mohapatra.medium.com/top-30-mistakes-typescript-developers-make-and-how-to-avoid-them-59899f95615a)

---

### M4: Unhelpful Error Messages

**What goes wrong:** Users see "Error: Request failed" instead of actionable messages. They can't tell if it's their API key, rate limit, invalid input, or server issue.

**Why it happens:**
- Generic catch blocks
- API errors not translated to user language
- No distinction between user errors and system errors

**Prevention:**
- Create custom error classes with code, message, and suggestion fields
- Map all API error types to user-friendly messages
- Include actionable suggestions (e.g., "Run `ansible-craft config` to set your API key")
- Distinguish retryable vs non-retryable errors
- Use color coding: red for errors, yellow for suggestions

**Detection:** User support requests mentioning unclear errors

**Phase to address:** Phase 3 (CLI UX)

---

### M5: Generated Code Without Validation

**What goes wrong:** Tool outputs Ansible code directly without running any validation. Users run generated playbooks that fail immediately with syntax errors.

**Why it happens:**
- Validation feels like overkill in early development
- "AI doesn't make syntax errors" (it does, 1.7x more than humans)
- No easy way to run Ansible tools headlessly

**Prevention:**
- Run multi-layer validation on all generated output:
  1. YAML syntax check
  2. ansible-lint validation
  3. ansible-playbook --syntax-check
  4. Custom checks (undefined variables, naming conventions)
- Write generated roles to temp directory for validation
- Report validation issues with line numbers and fix suggestions
- Allow `--skip-validation` flag for advanced users

**Detection:** Track ratio of generated roles that pass validation on first attempt

**Phase to address:** Phase 3 (Validation Layer)

---

### M6: npm Publishing Without .npmignore

**What goes wrong:** Source TypeScript files, test fixtures, and development artifacts get published. Package is 10x larger than needed. Users download unnecessary files.

**Why it happens:**
- Default npm behavior uses .gitignore if no .npmignore exists
- Developers forget to configure publishing explicitly
- Test runs create artifacts that get included

**Prevention:**
- Use package.json `files` field (allowlist approach - safer than .npmignore)
- Only include: dist/, README.md, LICENSE
- Use `npm pack --dry-run` before every publish
- CI check: package size < 500KB
- Never use .gitignore as implicit .npmignore

**Detection:**
- `npm pack --dry-run` before every publish
- Automated package size check in CI

**Phase to address:** Phase 5 (Publishing)

**Sources:**
- [30-Second Guide to Publishing TypeScript to npm](https://cameronnokes.com/blog/the-30-second-guide-to-publishing-a-typescript-package-to-npm/)

---

### M7: Prompt Decay in System Prompts

**What goes wrong:** Long system prompts lose effectiveness as conversation continues. AI "forgets" Ansible-specific rules and starts generating generic code.

**Why it happens:**
- LLMs have attention decay over long contexts
- System prompt gets diluted by conversation history
- "Prompt decay" - gradual loss of initial directive effectiveness

**Prevention:**
- Reinforce key rules in every request (not just system prompt)
- Truncate conversation history to keep prompts focused
- Use tool definitions to enforce structure (more reliable than prose)
- Keep system prompts concise - focus on critical rules
- Test rule compliance across long conversations

**Detection:** Track rule compliance rate across conversation length

**Phase to address:** Phase 2 (Prompt Engineering)

**Sources:**
- [AI Coding Degrades: Silent Failures Emerge](https://spectrum.ieee.org/ai-coding-degrades)

---

## Warning Signs

How to detect problems early before they become critical.

### Early Warning Indicators

| Metric | Warning Threshold | Critical Threshold | Action |
|--------|-------------------|-------------------|--------|
| Parse failure rate | >5% | >15% | Review prompts, add validation |
| 429 error rate | >1% | >5% | Implement backoff, check tier |
| Average tokens/request | >10K | >25K | Review context management |
| Validation failure rate | >10% | >25% | Improve prompts, add post-processing |
| User error reports | >3/week | >10/week | UX review, error message audit |
| npm install failures | Any | - | Module system debugging |

### Code Smell Detection

Run these checks regularly:

- **TypeScript any leakage:** Count occurrences of `: any` - should be <10
- **Missing error handling:** Find files without catch blocks
- **Hardcoded API keys (CRITICAL):** Search for `sk-ant-` - must return nothing
- **Console.log in production:** Find console.log outside test files
- **TODO/FIXME debt:** Track and limit accumulation

### User Feedback Patterns

Watch for these phrases in support/issues:
- "The tool just hangs" - Progress indicator issue (M2)
- "Error message doesn't help" - Error UX issue (M4)
- "Works on my machine but not CI" - Module system issue (P4)
- "Generated playbook fails" - Validation issue (P3, M5)
- "Unexpected charges" - Token management issue (P5)

---

## Prevention Strategies Summary

### Architecture-Level Prevention

1. **Validate at boundaries**: All external data (AI responses, user input, YAML) validated at entry points
2. **Fail fast with helpful messages**: Every error path includes user-actionable guidance
3. **Observable by default**: Token usage, error rates, latencies logged from day one
4. **Progressive enhancement**: Basic functionality works; advanced features degrade gracefully

### Development Process Prevention

1. **Strict TypeScript from start**: `strict: true`, no `any` exceptions without explicit justification
2. **Integration tests with mocks**: Mock Claude API responses including error cases
3. **Test matrix for Node.js**: 18, 20, 22 in both ESM and CJS modes
4. **Ansible validation in CI**: Generated examples validated with `ansible-lint`

### Release Process Prevention

1. **Canary releases**: Test with small user group before full release
2. **Semantic versioning**: Breaking changes = major version bump
3. **npm pack verification**: Check package contents before every publish
4. **Changelog automation**: Track what changed for user communication

---

## Phase Recommendations

| Phase | Pitfalls to Address | Why This Phase |
|-------|---------------------|----------------|
| **Phase 1: Foundation** | P4 (Module System), P1 (Rate Limiting foundation), P5 (Token tracking foundation), M3 (Strict TypeScript) | These are architectural - hard to fix later |
| **Phase 2: Prompt & Generation** | P2 (Output Parsing), P3 (YAML/Jinja2), M1 (FQCN), M7 (Prompt Decay) | Core code generation quality |
| **Phase 3: CLI & Validation** | M2 (Progress), M4 (Errors), M5 (Validation) | User-facing quality |
| **Phase 4: Optimization** | P5 (Token cost full), P1 (Rate limiting refined) | Performance and cost |
| **Phase 5: Publishing** | M6 (.npmignore), P4 (Module system verification) | Distribution quality |

---

## Sources

### Official Documentation
- [Claude API Errors](https://platform.claude.com/docs/en/api/errors)
- [Claude Rate Limits](https://platform.claude.com/docs/en/api/rate-limits)
- [Ansible Templating (Jinja2)](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_templating.html)
- [Ansible Lint Documentation](https://ansible-lint.readthedocs.io)
- [Ansible FQCN Rules](https://docs.ansible.com/projects/lint/rules/fqcn/)

### Research & Analysis
- [State of AI Code Quality 2025](https://www.qodo.ai/reports/state-of-ai-code-quality/)
- [AI vs Human Code Generation Report](https://www.coderabbit.ai/blog/state-of-ai-vs-human-code-generation-report)
- [AI Coding Degrades: Silent Failures](https://spectrum.ieee.org/ai-coding-degrades)

### Best Practices
- [TypeScript ESM/CJS Publishing 2025](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing)
- [CLI UX Progress Displays](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)
- [LLM Cost Optimization](https://www.helicone.ai/blog/monitor-and-optimize-llm-costs)
- [Structured Output Reliability](https://www.cognitivetoday.com/2025/10/structured-output-ai-reliability/)
- [TypeScript Best Practices 2025](https://medium.com/@nikhithsomasani/best-practices-for-using-typescript-in-2025-a-guide-for-experienced-developers-4fca1cfdf052)
