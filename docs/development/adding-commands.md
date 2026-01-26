# Adding Commands

Guide to adding new CLI commands to ansible-craft.

## Overview

ansible-craft uses [Commander.js](https://github.com/tj/commander.js) for CLI parsing. Commands are defined in `src/cli/commands/`.

## Command Structure

```
src/cli/
├── program.ts          # Main program, registers commands
├── commands/
│   ├── new.ts          # new role, new playbook
│   ├── explain.ts      # explain command
│   ├── fix.ts          # fix command
│   ├── config.ts       # config command
│   └── setup.ts        # setup command
├── helpers/
│   └── context.ts      # Shared helpers
├── output.ts           # Output formatting
└── preview.ts          # Preview display
```

## Creating a New Command

### Step 1: Create Command File

```typescript
// src/cli/commands/my-command.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../../ai/client';
import { handleError } from '../helpers/context';

export function registerMyCommand(program: Command): void {
  program
    .command('my-command')
    .description('Description of what the command does')
    .argument('<input>', 'Description of the input argument')
    .option('-o, --output <dir>', 'Output directory', '.')
    .option('--dry-run', 'Preview without writing', false)
    .option('-q, --quiet', 'Suppress progress output', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (input: string, options: MyCommandOptions) => {
      try {
        await runMyCommand(input, options);
      } catch (error) {
        handleError(error, options);
      }
    });
}

interface MyCommandOptions {
  output: string;
  dryRun: boolean;
  quiet: boolean;
  json: boolean;
}

async function runMyCommand(input: string, options: MyCommandOptions): Promise<void> {
  // Implementation
  if (!options.quiet) {
    const spinner = ora('Processing...').start();
    // ...
    spinner.succeed('Done');
  }

  if (options.json) {
    console.log(JSON.stringify({ success: true, /* ... */ }));
  } else {
    console.log(chalk.green('Command completed successfully'));
  }
}
```

### Step 2: Register Command

Add to the main program:

```typescript
// src/cli/program.ts

import { Command } from 'commander';
import { registerNewCommand } from './commands/new';
import { registerExplainCommand } from './commands/explain';
import { registerFixCommand } from './commands/fix';
import { registerConfigCommand } from './commands/config';
import { registerSetupCommand } from './commands/setup';
import { registerMyCommand } from './commands/my-command'; // Add import

export function createProgram(): Command {
  const program = new Command();

  program
    .name('ansible-craft')
    .description('Generate production-ready Ansible roles and playbooks')
    .version(version);

  // Register all commands
  registerNewCommand(program);
  registerExplainCommand(program);
  registerFixCommand(program);
  registerConfigCommand(program);
  registerSetupCommand(program);
  registerMyCommand(program); // Add registration

  return program;
}
```

### Step 3: Add Tests

```typescript
// src/cli/commands/my-command.test.ts

import { describe, test, expect, mock } from 'bun:test';
import { Command } from 'commander';
import { registerMyCommand } from './my-command';

describe('my-command', () => {
  test('should register command', () => {
    const program = new Command();
    registerMyCommand(program);

    const cmd = program.commands.find(c => c.name() === 'my-command');
    expect(cmd).toBeDefined();
  });

  test('should have required options', () => {
    const program = new Command();
    registerMyCommand(program);

    const cmd = program.commands.find(c => c.name() === 'my-command');
    const options = cmd?.options.map(o => o.long);

    expect(options).toContain('--output');
    expect(options).toContain('--dry-run');
    expect(options).toContain('--json');
  });

  test('should execute successfully', async () => {
    // Mock dependencies
    mock.module('../../ai/client', () => ({
      createClient: () => mockClient
    }));

    // Test execution
    // ...
  });
});
```

## Command Patterns

### Subcommands

For commands with subcommands (like `new role`, `new playbook`):

```typescript
export function registerNewCommand(program: Command): void {
  const newCmd = program
    .command('new')
    .description('Generate new Ansible resources');

  newCmd
    .command('role')
    .description('Generate a new Ansible role')
    .argument('<description>', 'Role description')
    .action(handleNewRole);

  newCmd
    .command('playbook')
    .description('Generate a new Ansible playbook')
    .argument('<description>', 'Playbook description')
    .action(handleNewPlaybook);
}
```

### Common Options

Use shared option definitions for consistency:

```typescript
// src/cli/helpers/options.ts

export const commonOptions = {
  output: (cmd: Command) => cmd.option('-o, --output <dir>', 'Output directory', '.'),
  dryRun: (cmd: Command) => cmd.option('--dry-run', 'Preview without writing', false),
  quiet: (cmd: Command) => cmd.option('-q, --quiet', 'Suppress progress', false),
  json: (cmd: Command) => cmd.option('--json', 'JSON output format', false),
  force: (cmd: Command) => cmd.option('--force', 'Overwrite existing', false),
  complex: (cmd: Command) => cmd.option('--complex', 'Use Opus model', false),
};

// Usage
newRoleCmd
  .argument('<description>', 'Role description');
commonOptions.output(newRoleCmd);
commonOptions.dryRun(newRoleCmd);
commonOptions.quiet(newRoleCmd);
commonOptions.json(newRoleCmd);
```

### Progress Feedback

Use ora spinners for progress:

```typescript
import ora from 'ora';

async function runWithProgress(options: { quiet: boolean }): Promise<void> {
  if (options.quiet) {
    // No output
    await doWork();
    return;
  }

  const spinner = ora('Starting...').start();

  try {
    spinner.text = 'Phase 1: Planning';
    await planPhase();

    spinner.text = 'Phase 2: Generating';
    await generatePhase();

    spinner.succeed('Complete');
  } catch (error) {
    spinner.fail('Failed');
    throw error;
  }
}
```

### JSON Output

Support machine-readable output:

```typescript
interface CommandResult {
  format_version: string;
  success: boolean;
  // ... command-specific fields
}

function outputResult(result: CommandResult, options: { json: boolean }): void {
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Human-readable output
    console.log(`Success: ${result.success}`);
  }
}
```

### Error Handling

Use the standard error handler:

```typescript
import { handleError } from '../helpers/context';

program
  .command('my-command')
  .action(async (input, options) => {
    try {
      await runCommand(input, options);
    } catch (error) {
      handleError(error, options);
      process.exit(1);
    }
  });
```

## Adding Options

### Boolean Options

```typescript
.option('--dry-run', 'Preview without writing', false)
.option('--force', 'Overwrite existing', false)
```

### String Options

```typescript
.option('-n, --name <name>', 'Resource name')
.option('-o, --output <dir>', 'Output directory', '.')  // With default
```

### Choice Options

```typescript
.option('--format <type>', 'Output format', 'text')
.choices(['text', 'json', 'yaml'])
```

### Multiple Values

```typescript
.option('-t, --tag <tags...>', 'Tags to apply')
// Usage: --tag foo --tag bar
// Or: --tag foo bar
```

## Exit Codes

Use consistent exit codes:

```typescript
// Success
process.exit(0);

// General error
process.exit(1);

// User cancelled
process.exit(2);
```

## Documentation

### Help Text

Commander auto-generates help from descriptions:

```typescript
program
  .command('my-command')
  .description('Short description for help output')
  .argument('<input>', 'Description of input')
  .option('-o, --output <dir>', 'Where to write output')
```

### Update CLI Reference

Add your command to `docs/api-reference/cli-api.md`:

```markdown
### my-command

Description of the command.

```bash
ansible-craft my-command <input> [options]
```

#### Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `<input>` | Yes | Input description |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-o, --output <dir>` | string | `.` | Output directory |
```

## Example: Complete Command

```typescript
// src/cli/commands/validate.ts

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { readFile } from 'fs/promises';
import { runValidation } from '../../generation/validation';
import { handleError } from '../helpers/context';

export function registerValidateCommand(program: Command): void {
  program
    .command('validate')
    .description('Validate Ansible files')
    .argument('<path>', 'Path to file or directory')
    .option('--strict', 'Treat warnings as errors', false)
    .option('-q, --quiet', 'Suppress progress output', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (path: string, options: ValidateOptions) => {
      try {
        await runValidate(path, options);
      } catch (error) {
        handleError(error, options);
        process.exit(1);
      }
    });
}

interface ValidateOptions {
  strict: boolean;
  quiet: boolean;
  json: boolean;
}

async function runValidate(path: string, options: ValidateOptions): Promise<void> {
  const spinner = options.quiet ? null : ora('Validating...').start();

  try {
    const content = await readFile(path, 'utf-8');
    const result = await runValidation(content);

    spinner?.stop();

    const hasErrors = result.errors.length > 0;
    const hasWarnings = result.warnings.length > 0;
    const failed = hasErrors || (options.strict && hasWarnings);

    if (options.json) {
      console.log(JSON.stringify({
        format_version: '1.0',
        success: !failed,
        path,
        errors: result.errors,
        warnings: result.warnings
      }));
    } else {
      if (hasErrors) {
        console.log(chalk.red(`\nErrors (${result.errors.length}):`));
        for (const error of result.errors) {
          console.log(chalk.red(`  - ${error.message}`));
        }
      }

      if (hasWarnings) {
        console.log(chalk.yellow(`\nWarnings (${result.warnings.length}):`));
        for (const warning of result.warnings) {
          console.log(chalk.yellow(`  - ${warning.message}`));
        }
      }

      if (!hasErrors && !hasWarnings) {
        console.log(chalk.green('Validation passed'));
      }
    }

    if (failed) {
      process.exit(1);
    }
  } catch (error) {
    spinner?.fail('Validation failed');
    throw error;
  }
}
```

## Related

- **[CLI API Reference](../api-reference/cli-api.md)** - Command documentation
- **[Testing Guide](testing.md)** - Testing commands
- **[Code Style](code-style.md)** - Code conventions
