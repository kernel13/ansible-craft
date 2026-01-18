# Phase 3: AI Integration - Context

**Gathered:** 2026-01-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Foundation for all AI-powered features — Claude API client with rate limiting, streaming, and error handling. This phase builds the internal infrastructure that downstream phases (Role Generation, Playbook Generation, Error Commands) will use. Does not include generation prompts or commands — only the API communication layer.

</domain>

<decisions>
## Implementation Decisions

### Retry Behavior
- 3 retry attempts before giving up
- Retry on: network errors, 5xx errors, 429 rate limits (not 4xx auth/validation errors)
- Exponential backoff with jitter (1s → 2s → 4s + random jitter)
- Honor Retry-After header from API when present
- Maximum total wait time: 2 minutes across all retries
- Minimal retry indicator: "Retrying... (2/3)" on same line
- Ctrl+C cancels immediately — user is in control
- `--no-retry` flag available to fail fast

### Streaming Output
- Token-by-token streaming — show output as Claude generates it (like ChatGPT typing)
- Spinner with status message until first token arrives ("Connecting to Claude...")
- Raw as-generated output — show exactly what Claude outputs, authentic feel
- `--quiet` flag suppresses streaming output for scripts/CI

### Error Presentation
- Styled box with guidance (like missing API key error) — boxen with actionable steps
- Every error includes troubleshooting suggestions ("Try this:...")
- `--verbose` mode shows full API response on error (request_id, headers, raw body)
- Errors include docs link: "See: docs.example.com/errors/{error-type}"

### Rate Limit UX
- Auto-wait with animated countdown: "Rate limited. Waiting 30s..." with live updates
- Maximum wait time: 2 minutes (same as retry timeout)
- Ctrl+C cancels wait immediately
- Claude's discretion: whether quiet mode suppresses countdown

</decisions>

<specifics>
## Specific Ideas

- Error presentation should match the Phase 2 missing API key error style — professional boxen boxes
- Streaming should feel like watching Claude think — authentic AI experience
- Rate limit countdown should update in place, not spam new lines

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-ai-integration*
*Context gathered: 2026-01-18*
