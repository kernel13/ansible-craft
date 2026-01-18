#!/usr/bin/env node
import { CLIError } from '../errors/cli-error.ts';
import { displayError } from './output.ts';
import { handleNoArguments, handleSpecialFlags, program } from './program.ts';

// Handle version flag before parsing (custom styled version display)
if (handleSpecialFlags()) {
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);

  // Show help when no arguments provided
  handleNoArguments();
} catch (err) {
  if (err instanceof CLIError) {
    displayError(err);
    process.exitCode = err.exitCode;
  } else if (err instanceof Error) {
    displayError(err);
    process.exitCode = 1;
  }
}
