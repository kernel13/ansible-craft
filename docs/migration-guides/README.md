# Migration Guides

Version upgrade guides and breaking changes documentation for ansible-craft.

## Overview

This section contains migration guides for upgrading between major versions of ansible-craft. Each guide details breaking changes, deprecated features, and step-by-step upgrade instructions.

## Current Version

ansible-craft follows [Semantic Versioning](https://semver.org/):
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features, backward compatible
- **Patch** (0.0.X): Bug fixes, backward compatible

## Version History

### 0.x.x (Current Development)

The project is currently in active development (0.x.x versions). APIs and features may change between minor versions.

**Current Focus:**
- Stabilizing core generation features
- Building out Claude Code integration
- Refining validation pipeline

### Future 1.0.0 (Planned)

The 1.0.0 release will mark API stability. After 1.0.0:
- Breaking changes only in major versions
- Deprecation warnings before removal
- Migration guides for all breaking changes

## Breaking Changes Log

### 0.2.0 (Planned)

Expected changes:
- Config file format changes (TOML structure)
- CLI flag renames for consistency

### 0.1.x (Current)

Initial release series:
- APIs are not stable
- Expect changes between minor versions
- Report issues if upgrades break your workflow

## Upgrade Checklist

When upgrading ansible-craft:

1. **Read the changelog** for the new version
2. **Check this guide** for migration steps
3. **Test in development** before production use
4. **Update CI/CD** scripts if using programmatic access
5. **Verify config** file compatibility

## Configuration Migration

### Environment Variables

Environment variables remain stable:
- `ANTHROPIC_API_KEY` - API key (unchanged)

### Config File

The config file location is stable:
```
~/.config/ansible-craft/config.toml
```

If the config format changes, migration will be documented here with before/after examples.

## CLI Changes

### Command Renames

None currently. Will be documented when they occur.

### Flag Changes

Recent additions:
- `--quick` / `-Q` - Skip wizard with saved defaults (added 0.1.x)
- `config defaults` - Configure wizard defaults (added 0.1.x)

### Deprecated Flags

None currently.

## JSON Output Changes

### Schema Versioning

JSON output includes a `format_version` field:

```json
{
  "format_version": "1.0",
  ...
}
```

When the schema changes:
1. `format_version` will increment
2. Old clients should check this field
3. Migration guide will document changes

## Handling Upgrades

### npm/yarn

```bash
# Check current version
ansible-craft --version

# Upgrade
npm update -g ansible-craft

# Verify
ansible-craft --version
```

### Claude Code Integration

After upgrading, reinstall Claude Code commands:

```bash
ansible-craft setup --force
```

This ensures slash commands match the new version.

## Reporting Upgrade Issues

If you encounter issues after upgrading:

1. Check this guide for known changes
2. Search [existing issues](https://github.com/ansible-craft/ansible-craft/issues)
3. Report new issues with:
   - Previous version
   - New version
   - Error messages
   - Steps to reproduce

## Future Migrations

Migration guides will be added here as new versions are released:

- `v0.2.0-migration.md` (planned)
- `v1.0.0-migration.md` (planned)

## Related

- **[CHANGELOG.md](../../CHANGELOG.md)** - Full changelog
- **[Installation](../user-guide/installation.md)** - Installation guide
- **[Configuration](../user-guide/configuration.md)** - Config options
