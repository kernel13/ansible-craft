# Stack Research: Ansible Craft CLI

**Project:** TypeScript CLI with Claude AI integration for Ansible code generation
**Researched:** 2026-01-18
**Overall Confidence:** HIGH

## Executive Summary

This stack research covers the 2025/2026 standard for building a TypeScript CLI that integrates with Claude API. The recommended stack leverages Bun's native TypeScript support and .env handling, Commander.js for CLI parsing, and the official Anthropic SDK for AI integration. Key insight: Bun eliminates the need for several traditional dependencies (dotenv, ts-node) while providing faster execution.

---

## Recommended Stack

### Core Runtime

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Bun** | ^1.3.6 | JavaScript/TypeScript runtime, bundler, package manager | HIGH |

**Why Bun over Node.js:**
- Native TypeScript execution (no transpilation step needed)
- Native .env file support (eliminates dotenv dependency)
- 6x faster package installation than npm
- Single-file executable compilation with `bun build --compile`
- Full Node.js API compatibility (100% target)
- Built-in test runner compatible with Jest API

**Source:** [Bun Official Documentation](https://bun.sh/), [Bun v1.3.6 Release](https://bun.com/blog/bun-v1.3.5)

---

### CLI Framework

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Commander.js** | ^14.0.2 | CLI argument parsing, subcommands, help generation | HIGH |

**Why Commander.js:**
- Most widely adopted CLI framework (100K+ dependents)
- First-class TypeScript support with included type definitions
- Clean subcommand pattern: `ansible-craft new role`, `ansible-craft fix`
- Automatic help generation
- Lightweight with zero dependencies
- Well-documented with active maintenance

**Alternative Considered:**
- **Oclif**: Enterprise-grade, but overkill for this project scope. Better for plugin architectures.
- **Yargs**: More declarative, but larger API surface. Commander is more intuitive for simple CLIs.

**Source:** [Commander.js GitHub](https://github.com/tj/commander.js), [npm commander](https://www.npmjs.com/package/commander)

---

### AI Integration

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@anthropic-ai/sdk** | ^0.71.2 | Claude API client with streaming support | HIGH |

**Why Official Anthropic SDK:**
- Official SDK with full TypeScript types
- Built-in streaming support via Server Sent Events (SSE)
- Token usage tracking (`message.usage`)
- Helper methods for streaming: `.stream()` with event callbacks
- Handles authentication via `ANTHROPIC_API_KEY` environment variable

**Key Patterns:**

```typescript
// Basic usage
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Streaming for real-time output (recommended for generation)
const stream = client.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
}).on('text', (text) => process.stdout.write(text));

await stream.finalMessage();
```

**Model Recommendation:**
- **claude-sonnet-4-5-20250929**: Best balance of speed/quality for code generation
- For complex tasks: Consider claude-opus-4-5-20251101

**Source:** [Anthropic SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript), [Claude API Docs](https://docs.anthropic.com/claude/reference/)

---

### Input Validation

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **Zod** | ^4.1.12 | Schema validation with TypeScript type inference | HIGH |

**Why Zod:**
- TypeScript-first with automatic type inference
- Zero dependencies
- Perfect for CLI input validation and config file parsing
- `.safeParse()` for graceful error handling
- Coercion support for CLI string inputs

**Use Cases in Ansible Craft:**
- Validate role names (no special chars, lowercase)
- Validate playbook structure
- Parse and validate config files
- Validate API responses

**Source:** [Zod Documentation](https://zod.dev/), [Zod GitHub](https://github.com/colinhacks/zod)

---

### User Interaction

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **@inquirer/prompts** | ^7.x | Interactive prompts (select, confirm, input) | HIGH |
| **ora** | ^8.x | Terminal spinners for async operations | HIGH |
| **chalk** | ^5.6.2 | Terminal string styling | MEDIUM |

**Why @inquirer/prompts (not inquirer):**
- Modern rewrite with smaller bundle size
- ESM-native
- Better TypeScript support
- Individual prompt imports reduce bundle

**Why ora:**
- Standard for CLI loading indicators
- Clean API: `ora('Generating role...').start()`
- Supports success/fail states

**Chalk Note:**
- Chalk 5 is ESM-only
- Already in most dependency trees (100K+ packages depend on it)
- Consider **picocolors** for smaller bundle if size matters

**Alternative for prompts:** **Enquirer** - faster (4ms load), lighter (one dependency), used by ESLint/webpack. Choose if bundle size is critical.

**Source:** [Inquirer GitHub](https://github.com/SBoudrias/Inquirer.js), [Ora GitHub](https://github.com/sindresorhus/ora), [Chalk GitHub](https://github.com/chalk/chalk)

---

### Development Tools

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **TypeScript** | ^5.5+ | Type safety and IDE support | HIGH |
| **Biome** | ^2.0 | Linting and formatting (replaces ESLint + Prettier) | HIGH |
| **Vitest** | ^4.0.8 | Unit testing with Bun compatibility | HIGH |

**Why Biome over ESLint + Prettier:**
- 10-25x faster than ESLint + Prettier
- Single tool replaces 127+ npm packages
- One config file (`biome.json`)
- 97% Prettier compatibility
- Type-aware linting in v2.0
- Zero-config for most projects

**Setup:**
```bash
bun add -D @biomejs/biome
bunx @biomejs/biome init
```

**Why Vitest:**
- Native ESM support
- Jest-compatible API (easy migration)
- Works with Bun (`bun test` also available as alternative)
- Built-in TypeScript support
- Coverage via v8 or Istanbul

**TypeScript Configuration for Bun:**
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"],
    "strict": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

**Source:** [Biome GitHub](https://github.com/biomejs/biome), [Vitest Docs](https://vitest.dev/), [TypeScript-ESLint](https://typescript-eslint.io/)

---

### Publishing & Distribution

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| **bun publish** | built-in | npm registry publishing | HIGH |
| **bun build --compile** | built-in | Optional single-file executables | MEDIUM |

**npm Package Setup:**

```json
{
  "name": "ansible-craft",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "ansible-craft": "./dist/cli.js"
  },
  "files": ["dist"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "bun build ./src/cli.ts --outdir ./dist --target node",
    "prepublishOnly": "bun run build"
  }
}
```

**bunx/npx Compatibility:**
- Both work with standard npm packages
- Use shebang: `#!/usr/bin/env node` (yes, node - for wider compatibility)
- Bun users get Bun speed, Node users get Node compatibility

**Single-File Executables (Optional):**
- Use `bun build --compile` for distribution without runtime
- Cross-compile: `--target=bun-linux-x64`, `--target=bun-darwin-arm64`
- Caveat: ~50-60MB per executable (includes Bun runtime)
- Better for: Desktop distribution, CI environments
- Skip for: npm-published CLI tools (bunx/npx handle runtime)

**Source:** [Bun Publish Docs](https://bun.sh/docs/pm/cli/publish), [NPX-Compatible CLI Tools with Bun](https://runspired.com/2025/01/25/npx-executables-with-bun.html)

---

## Complete Dependency List

### Production Dependencies

```bash
bun add commander @anthropic-ai/sdk zod @inquirer/prompts ora chalk
```

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| commander | ^14.0.2 | ~50KB | CLI framework |
| @anthropic-ai/sdk | ^0.71.2 | ~200KB | Claude API |
| zod | ^4.1.12 | ~60KB | Validation |
| @inquirer/prompts | ^7.x | ~100KB | Prompts |
| ora | ^8.x | ~20KB | Spinners |
| chalk | ^5.6.2 | ~15KB | Colors |

### Development Dependencies

```bash
bun add -D typescript @types/node bun-types @biomejs/biome vitest
```

| Package | Version | Purpose |
|---------|---------|---------|
| typescript | ^5.5 | Type checking |
| @types/node | ^22 | Node.js types |
| bun-types | ^1.3 | Bun-specific types |
| @biomejs/biome | ^2.0 | Lint + format |
| vitest | ^4.0.8 | Testing |

---

## NOT Recommended

### Avoid These Technologies

| Technology | Why Avoid | Use Instead |
|------------|-----------|-------------|
| **dotenv** | Bun has native .env support | `Bun.env` or `process.env` |
| **ts-node** | Bun runs TypeScript natively | Just use `bun run` |
| **ESLint + Prettier** | Slower, more config, multiple packages | Biome |
| **Jest** | Slower, more setup required | Vitest or `bun test` |
| **Yargs** | Larger API surface, more complex | Commander.js |
| **Oclif** | Overkill for simple CLI | Commander.js |
| **inquirer** (legacy) | Larger bundle, older API | @inquirer/prompts |
| **Node.js** | Requires more tooling for TypeScript | Bun |

### Patterns to Avoid

| Anti-Pattern | Why | Do Instead |
|--------------|-----|------------|
| CommonJS (`require`) | ESM is the standard | Use ESM imports |
| `any` types | Defeats TypeScript benefits | Use proper types or `unknown` |
| Global installs | Conflicts, version issues | Use `bunx`/`npx` |
| Single-file executables for npm | Huge package size | Standard npm distribution |

---

## Confidence Assessment

| Area | Confidence | Rationale |
|------|------------|-----------|
| **Bun Runtime** | HIGH | Verified v1.3.6 release, mature ecosystem, production-ready |
| **Commander.js** | HIGH | v14.0.2 verified, industry standard, TypeScript support |
| **Anthropic SDK** | HIGH | v0.71.2 verified Dec 2025, official SDK, streaming works |
| **Zod** | HIGH | v4.1.12 verified, TypeScript-first, widely adopted |
| **Biome** | HIGH | v2.0 with type-aware linting, significantly faster than alternatives |
| **Vitest** | HIGH | v4.0.8 verified, standard testing choice for modern TypeScript |
| **@inquirer/prompts** | MEDIUM | Modern rewrite, but less battle-tested than legacy inquirer |
| **bunx/npx compatibility** | MEDIUM | Works but some edge cases with multi-binary packages |

---

## Sources

### Official Documentation
- [Bun Documentation](https://bun.sh/docs)
- [Anthropic SDK GitHub](https://github.com/anthropics/anthropic-sdk-typescript)
- [Commander.js GitHub](https://github.com/tj/commander.js)
- [Zod Documentation](https://zod.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [Biome Documentation](https://biomejs.dev/)

### Articles & Guides
- [Creating NPX-Compatible CLI Tools with Bun](https://runspired.com/2025/01/25/npx-executables-with-bun.html)
- [Biome vs ESLint + Prettier 2025](https://medium.com/better-dev-nextjs-react/biome-vs-eslint-prettier-the-2025-linting-revolution-you-need-to-know-about-ec01c5d5b6c8)
- [Bun Environment Variables](https://bun.com/docs/runtime/environment-variables)

### Version Verification
- Bun v1.3.6: [GitHub Releases](https://github.com/oven-sh/bun/releases)
- @anthropic-ai/sdk v0.71.2: [GitHub Releases](https://github.com/anthropics/anthropic-sdk-typescript/releases)
- Commander v14.0.2: [npm](https://www.npmjs.com/package/commander)
- Zod v4.1.12: [npm](https://www.npmjs.com/package/zod)
- Vitest v4.0.8: [npm](https://www.npmjs.com/package/vitest)
