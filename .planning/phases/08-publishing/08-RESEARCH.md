# Phase 8: Publishing - Research

**Researched:** 2026-01-21
**Domain:** npm CLI package publishing, ESM/CJS bundling, shell completions, JSON output
**Confidence:** HIGH

## Summary

Research focused on publishing a TypeScript CLI tool to npm in 2026 with professional UX features. The npm ecosystem has evolved significantly with trusted publishing (OIDC), automatic provenance attestation, and modern ESM/CJS dual publishing patterns. Key findings:

1. **npm Publishing (2026)**: Trusted publishing with OIDC is now the standard approach, eliminating long-lived tokens and automatically generating provenance attestations (requires npm CLI 11.5.1+)
2. **ESM/CJS Dual Publishing**: tsup is the recommended bundler for TypeScript CLI tools, providing zero-config dual format output with automatic shebang preservation
3. **Shell Completions**: commander-completion-carapace provides the most comprehensive solution supporting bash, zsh, fish, and nushell through Carapace integration
4. **Local Testing**: `npm pack` is strongly preferred over `npm link` for pre-publication testing as it exactly mimics the publish process
5. **JSON Output**: Machine-readable output requires stable contracts, versioning, and stderr separation for spinners/progress

**Primary recommendation:** Use tsup for bundling with dual ESM/CJS output, test with `npm pack` before publishing, implement trusted publishing in CI/CD, and add commander-completion-carapace for comprehensive shell completion support.

## Standard Stack

The established libraries/tools for CLI publishing in 2026:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | 8.x | TypeScript bundler | Zero-config, esbuild-powered, automatic shebang handling, dual ESM/CJS |
| npm CLI | 11.5.1+ | Package publishing | Required for trusted publishing and automatic provenance |
| @gutenye/commander-completion-carapace | 1.x | Shell completions | Modern, supports all shells (bash/zsh/fish/nushell), integrates with Commander.js |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| publint.dev | - | Package validation | Pre-publish validation of package structure and exports |
| Are the Types Wrong? | Latest | TypeScript types validation | Verify type declarations work correctly for ESM/CJS |
| yalc | Latest | Local package testing | Alternative to npm pack for complex multi-package testing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tsup | bunup | Faster but less mature, less documentation |
| tsup | esbuild directly | More control but requires manual configuration |
| commander-completion-carapace | commander-completion | Only bash/zsh, no fish/nushell support |
| npm pack | npm link | Link doesn't test actual publish behavior |

**Installation:**
```bash
npm install --save-dev tsup publint
npm install @gutenye/commander-completion-carapace
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── cli/
│   ├── index.ts              # Entry point with shebang
│   ├── program.ts            # Commander setup
│   ├── commands/             # Command implementations
│   │   ├── new.ts
│   │   ├── explain.ts
│   │   └── fix.ts
│   └── output.ts             # Output formatting (stdout/stderr separation)
├── generation/               # Core logic
└── ai/                       # AI integration
dist/                         # Built output (not committed)
├── cli/
│   └── index.cjs             # CJS executable with shebang
└── index.js                  # ESM entry point
```

### Pattern 1: Dual ESM/CJS Publishing with tsup
**What:** Bundle TypeScript to both ESM and CJS formats with single build command
**When to use:** All modern npm packages needing broad compatibility

**Example tsup configuration:**
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts'  // CLI entry point
  },
  format: ['esm', 'cjs'],
  dts: true,                    // Generate TypeScript declarations
  clean: true,                  // Clean output directory before build
  sourcemap: true,
  splitting: false,             // Single file output for CLI
  treeshake: true,
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs' : '.js'
    }
  }
});
```

**package.json configuration:**
```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": {
    "ansible-craft": "./dist/cli/index.cjs"
  },
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": [
    "dist"
  ]
}
```

**Key points:**
- tsup automatically preserves shebangs in CLI entry files
- Use `.cjs` extension for CommonJS to avoid module resolution issues
- CJS format for bin executables ensures npm/npx/bunx compatibility
- `files` field whitelists only dist/ directory

### Pattern 2: Shell Completion Integration
**What:** Add tab completion for subcommands and flags using Carapace
**When to use:** Professional CLI tools with multiple commands

**Example:**
```typescript
// Source: https://github.com/gutenye/commander-completion-carapace
import { program, Option } from '@gutenye/commander-completion-carapace';

// Enable completion on the root program
program
  .name('ansible-craft')
  .description('Generate production-ready Ansible roles')
  .enableCompletion();

// Add completion metadata to commands
program.command('new <type>')
  .description('Create new role or playbook')
  .option('--dry-run', 'Show what would be generated')
  .option('--json', 'Output results in JSON format')
  .completion({
    positional: [['role', 'playbook']],  // Completion values for <type>
  })
  .action(async (type, options) => {
    // Implementation
  });

// Generate completion spec file on startup
await program.installCompletion();
```

**Installation command for users:**
```bash
# Bash
ansible-craft completion bash >> ~/.bashrc

# Zsh
ansible-craft completion zsh >> ~/.zshrc

# Fish
ansible-craft completion fish >> ~/.config/fish/config.fish
```

### Pattern 3: JSON Output Mode
**What:** Machine-readable output with stable schema and proper stdout/stderr separation
**When to use:** Generation commands that CI/CD systems need to parse

**Example:**
```typescript
// Source: CLI best practices from Heroku CLI Style Guide
interface GenerationResult {
  format_version: '1.0';
  success: boolean;
  files: Array<{
    path: string;
    type: 'file' | 'directory';
    bytes: number;
  }>;
  warnings: Array<{
    code: string;
    message: string;
    file?: string;
    line?: number;
  }>;
  metadata: {
    command: string;
    timestamp: string;
    duration_ms: number;
  };
}

interface ErrorResult {
  format_version: '1.0';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

// Implementation
async function executeCommand(options: { json?: boolean }) {
  const spinner = !options.json ? ora('Generating...').start() : null;

  try {
    const result = await generate();

    if (options.json) {
      // JSON to stdout only
      console.log(JSON.stringify({
        format_version: '1.0',
        success: true,
        files: result.files,
        warnings: result.warnings,
        metadata: {
          command: 'new role',
          timestamp: new Date().toISOString(),
          duration_ms: result.duration
        }
      } satisfies GenerationResult, null, 2));
    } else {
      // Human-readable output
      spinner?.succeed('Generated successfully');
      console.log(formatHumanOutput(result));
    }
  } catch (err) {
    spinner?.fail('Generation failed');

    if (options.json) {
      console.log(JSON.stringify({
        format_version: '1.0',
        error: {
          code: err.code || 'UNKNOWN_ERROR',
          message: err.message,
          details: err.details
        }
      } satisfies ErrorResult, null, 2));
    } else {
      displayError(err);
    }
    process.exit(1);
  }
}
```

**Key principles:**
- Spinners/progress → stderr, JSON → stdout
- Include `format_version` for schema evolution
- Structured error format with error codes
- Timestamp and metadata for debugging
- Use `satisfies` for type safety

### Pattern 4: npx/bunx Compatibility
**What:** Ensure CLI works identically via global install, npx, bunx, or pnpx
**When to use:** All CLI tools (no special handling needed if done right)

**Example:**
```typescript
// No special code needed - works automatically if:
// 1. bin field points to CJS file with shebang
// 2. Dependencies are in "dependencies" not "devDependencies"
// 3. Config is checked at runtime, not import-time

// Check for config at runtime
async function loadConfig() {
  try {
    return await readConfig();
  } catch (err) {
    if (err.code === 'CONFIG_NOT_FOUND') {
      // Guide user to create config
      console.error('No config found. Run: ansible-craft config');
      process.exit(1);
    }
    throw err;
  }
}
```

**Testing all package runners:**
```bash
# Test with npm pack first
npm pack
npm install -g ./ansible-craft-0.1.0.tgz
ansible-craft --version

# Test npx
npx ansible-craft@0.1.0 --version

# Test bunx
bunx ansible-craft@0.1.0 --version

# Test pnpm
pnpm dlx ansible-craft@0.1.0 --version
```

### Anti-Patterns to Avoid

- **Using .gitignore alone**: Create explicit `.npmignore` or use `files` field - `.gitignore` may include dev files you want published (like dist/)
- **Building with Bun, expecting Node compatibility**: Use tsup/esbuild for cross-runtime compatibility, not Bun's native bundler
- **ESM bin executables**: Use CJS format for bin executables to maximize compatibility across package managers
- **Secrets in package**: Never include .env, credentials, or API keys - they're permanent once published
- **npm link for testing**: npm link doesn't test the actual publish behavior - use `npm pack` instead

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shell completions | Custom bash/zsh/fish completion scripts | commander-completion-carapace | Supports 4+ shells, handles edge cases, generates from Commander schema |
| Dual module format | Manual tsconfig with multiple targets | tsup | Handles exports field, extensions, shebangs, type declarations automatically |
| Package validation | Manual testing checklist | publint.dev + "Are the Types Wrong?" | Catches module resolution issues, broken type declarations |
| Local package testing | Copy files to node_modules | npm pack → npm install ./pkg.tgz | Tests actual publish artifact, not symlinked development files |
| JSON output schema | Ad-hoc JSON.stringify | Typed interfaces + format_version | Prevents breaking changes, enables evolution, provides type safety |
| npm authentication | Manual token management | Trusted publishing (OIDC) | No token storage, automatic provenance, industry standard |

**Key insight:** CLI publishing has many subtle gotchas (module formats, executable permissions, completion generation) - use battle-tested tools rather than custom solutions.

## Common Pitfalls

### Pitfall 1: npm pack Doesn't Match .gitignore
**What goes wrong:** Published package includes unwanted development files or excludes needed files
**Why it happens:** If `.npmignore` exists, npm ignores `.gitignore` completely - easy to miss files
**How to avoid:**
- Use explicit `files` field in package.json (whitelist approach - safest)
- OR maintain `.npmignore` in sync with `.gitignore`
- Always run `npm pack` and inspect the `.tgz` before publishing
**Warning signs:**
```bash
# Check what will be published
npm pack --dry-run
tar -tzf ansible-craft-0.1.0.tgz  # Inspect actual contents
```

### Pitfall 2: Bin Executable Missing Shebang
**What goes wrong:** CLI installed but won't execute - "command not found" or "cannot execute binary file"
**Why it happens:** Build tool strips shebang, or developer forgets to add it to source
**How to avoid:**
- Add `#!/usr/bin/env node` to top of CLI entry file (src/cli/index.ts)
- Use tsup which automatically preserves shebangs
- Test with `npm pack` → global install → execute command
**Warning signs:**
```bash
# File should be executable and have shebang
head -1 dist/cli/index.cjs  # Should show "#!/usr/bin/env node"
ls -l dist/cli/index.cjs    # Should have execute permission
```

### Pitfall 3: ESM/CJS Module Resolution Errors
**What goes wrong:** Package works in development but fails in some environments - "Cannot find module" or "require() of ES Module"
**Why it happens:** Incorrect exports field, wrong file extensions, or missing conditional exports
**How to avoid:**
- Use tsup with proper config (see Pattern 1)
- Test package with both `import` and `require` after building
- Use publint.dev to validate exports field
- Follow extension conventions: `.cjs` for CommonJS, `.js` or `.mjs` for ESM
**Warning signs:**
```bash
# Validate exports
npx publint ./
npx @arethetypeswrong/cli --pack ./
```

### Pitfall 4: Dependencies in Wrong Field
**What goes wrong:** CLI works locally but fails after npm install - missing runtime dependencies
**Why it happens:** Runtime dependencies accidentally placed in `devDependencies`
**How to avoid:**
- Put ALL runtime dependencies in `dependencies` (not `devDependencies`)
- `devDependencies` is ONLY for build tools (tsup, biome, typescript, @types/*)
- Test with `npm pack` → fresh install in empty directory
**Warning signs:**
```bash
# Test in isolated environment
mkdir /tmp/test-cli
cd /tmp/test-cli
npm install ./path/to/ansible-craft-0.1.0.tgz
ansible-craft new role test  # Should work without npm install
```

### Pitfall 5: JSON Output Mixes stdout/stderr
**What goes wrong:** JSON output is corrupted with spinners, progress bars, or debug messages
**Why it happens:** Spinners/logs write to stdout instead of stderr
**How to avoid:**
- ALL human-readable output (spinners, progress, logs) → stderr
- JSON output ONLY → stdout
- Use ora spinner with proper stream configuration
- Check `options.json` flag before creating spinners
**Warning signs:**
```bash
# JSON output should be valid, parseable
ansible-craft new role test --json | jq .
# If jq fails, stdout is contaminated
```

### Pitfall 6: Trusted Publishing Not Set Up
**What goes wrong:** Manual token management, security risks, no automatic provenance
**Why it happens:** Using old publish workflow with classic npm tokens
**How to avoid:**
- Set up trusted publishing in npm organization settings
- Configure OIDC in GitHub Actions / GitLab CI
- Requires npm CLI 11.5.1+ in CI
- Remove NPM_TOKEN secrets from CI after migration
**Warning signs:** CI still uses `NPM_TOKEN` environment variable

## Code Examples

Verified patterns from official sources:

### Local Testing Workflow
```bash
# Source: https://blog.rnsloan.com/2025/01/11/local-npm-package-testing-made-simple-a-guide-to-npm-pack/

# 1. Build the package
npm run build

# 2. Create tarball (mimics publish)
npm pack
# Outputs: ansible-craft-0.1.0.tgz

# 3. Inspect contents
tar -tzf ansible-craft-0.1.0.tgz
# Verify:
# - dist/ is included
# - src/ is NOT included
# - node_modules/ is NOT included
# - .env files are NOT included

# 4. Test in fresh directory
cd /tmp
npm install /path/to/ansible-craft-0.1.0.tgz
npx ansible-craft --version

# 5. Test global install
npm install -g /path/to/ansible-craft-0.1.0.tgz
ansible-craft --version
ansible-craft new role test

# 6. Clean up
npm uninstall -g ansible-craft
```

### Trusted Publishing Setup (GitHub Actions)
```yaml
# Source: https://docs.npmjs.com/trusted-publishers/
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write  # Required for OIDC
      contents: read
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci
      - run: npm test
      - run: npm run build

      # No --provenance flag needed - automatic with trusted publishing
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      # Verify provenance was generated
      - run: npm view ansible-craft --json | jq .provenance
```

### Pre-Publish Validation
```bash
# Source: Multiple npm best practices articles

# 1. Validate package structure
npx publint ./

# 2. Check TypeScript types
npx @arethetypeswrong/cli --pack ./

# 3. Test ESM import
node -e "import('./dist/index.js').then(m => console.log(m))"

# 4. Test CJS require
node -e "const m = require('./dist/index.cjs'); console.log(m)"

# 5. Test CLI executable
npm pack
npm install -g ./ansible-craft-0.1.0.tgz
ansible-craft --help
ansible-craft new role test --dry-run

# 6. Check package size
npm pack --dry-run | grep "unpacked size"
# Should be < 5MB for CLI tools
```

### Shell Completion Command Implementation
```typescript
// Source: https://github.com/gutenye/commander-completion-carapace
import { program } from '@gutenye/commander-completion-carapace';

const completionCommand = program
  .command('completion <shell>')
  .description('Generate shell completion script')
  .argument('<shell>', 'Shell type', ['bash', 'zsh', 'fish'])
  .action(async (shell: string) => {
    try {
      // Carapace handles completion generation
      const script = await program.generateCompletion(shell);
      console.log(script);
      console.error(`
✓ Completion script generated

To install, run:
  ansible-craft completion ${shell} >> ~/.${shell}rc

Then restart your shell or run:
  source ~/.${shell}rc
`);
    } catch (err) {
      console.error(`Failed to generate ${shell} completion`);
      process.exit(1);
    }
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| npm tokens in CI | Trusted publishing (OIDC) | 2025 GA | Eliminates token management, automatic provenance |
| ESM or CJS only | Dual ESM/CJS with exports field | 2023-2024 | Broad compatibility across Node versions and bundlers |
| manual completions | Carapace-based generation | 2024-2025 | Multi-shell support with single integration |
| npm link testing | npm pack testing | Always recommended | Actually tests publish artifact, not dev symlinks |
| separate build configs | tsup zero-config | 2023+ | Single config for dual format, types, shebangs |
| --provenance flag | Automatic with trusted publishing | 2025 | No manual flag needed, always generated |

**Deprecated/outdated:**
- Classic npm tokens: Replaced by OIDC trusted publishing (more secure, no token management)
- pnpx command: Deprecated in favor of `pnpm dlx` (though many still use pnpx)
- .npmignore only: Use explicit `files` field for better control and safety
- esbuild --shebang flag: tsup handles automatically, no manual configuration

## Open Questions

Things that couldn't be fully resolved:

1. **tsup vs bunup for Bun-first projects**
   - What we know: bunup is 100x faster but less mature, tsup is proven and well-documented
   - What's unclear: Whether bunup produces npm-compatible output for all edge cases
   - Recommendation: Use tsup for now (proven, stable), monitor bunup development

2. **Carapace external dependency requirement**
   - What we know: commander-completion-carapace requires Carapace installed on user's system
   - What's unclear: Whether this is acceptable UX burden or should embed completions
   - Recommendation: Require manual installation, document clearly in README

3. **JSON format_version evolution strategy**
   - What we know: Should include format_version for schema evolution
   - What's unclear: When to bump major vs minor version, backward compatibility guarantees
   - Recommendation: Follow semantic versioning - minor for additions, major for breaking changes

4. **Provenance verification by end users**
   - What we know: npm automatically generates provenance with trusted publishing
   - What's unclear: Whether end users actually verify provenance, what tools they use
   - Recommendation: Generate provenance automatically, document how to verify in README

## Sources

### Primary (HIGH confidence)
- [Trusted publishing for npm packages - npm Docs](https://docs.npmjs.com/trusted-publishers/) - OIDC authentication and provenance
- [Generating provenance statements - npm Docs](https://docs.npmjs.com/generating-provenance-statements/) - Automatic provenance with trusted publishing
- [commander-completion-carapace GitHub](https://github.com/gutenye/commander-completion-carapace) - Modern shell completion solution
- [npm package.json docs](https://docs.npmjs.com/cli/v7/configuring-npm/package-json/) - bin, files, exports fields
- [Local npm Package Testing - blog.rnsloan.com](https://blog.rnsloan.com/2025/01/11/local-npm-package-testing-made-simple-a-guide-to-npm-pack/) - npm pack workflow

### Secondary (MEDIUM confidence)
- [TypeScript in 2025 with ESM and CJS npm publishing](https://lirantal.com/blog/typescript-in-2025-with-esm-and-cjs-npm-publishing) - Current state of dual publishing
- [Dual Publishing ESM and CJS Modules with tsup](https://johnnyreilly.com/dual-publishing-esm-cjs-modules-with-tsup-and-are-the-types-wrong) - tsup configuration patterns
- [Best practices for building CLI and publishing to npm](https://webbylab.com/blog/best-practices-for-building-cli-and-publishing-it-to-npm/) - General CLI best practices
- [CLI Style Guide - Heroku](https://devcenter.heroku.com/articles/cli-style-guide) - JSON output mode patterns
- [Building a TypeScript CLI with Node.js and Commander](https://blog.logrocket.com/building-typescript-cli-node-js-commander/) - Commander.js patterns

### Tertiary (LOW confidence)
- [npm trusted publishing with OIDC GA announcement](https://github.blog/changelog/2025-07-31-npm-trusted-publishing-with-oidc-is-generally-available/) - Timeline and availability
- [Package Manager comparison](https://dev.to/vsnikhilvs/package-manager-fight-npm-vs-pnpm-vs-npx-vs-yarn-vs-bun-569) - npx/bunx/pnpx differences
- [Files & Ignores - npm/cli Wiki](https://github.com/npm/cli/wiki/Files-&-Ignores) - files field and .npmignore interaction

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - tsup and trusted publishing are current industry standards
- Architecture: HIGH - All patterns verified through official docs and recent articles
- Pitfalls: HIGH - Based on documented issues and best practices from multiple sources

**Research date:** 2026-01-21
**Valid until:** ~60 days (ecosystem is stable, but npm features evolving - revalidate provenance and OIDC status)
