#!/usr/bin/env node
import { handleNoArguments, handleSpecialFlags, program } from './program.ts';

// Handle version flag before parsing (custom styled version display)
if (handleSpecialFlags()) {
  process.exit(0);
}

try {
  await program.parseAsync(process.argv);

  // Show help when no arguments provided
  handleNoArguments();
} catch (error) {
  process.exitCode = 1;
}
