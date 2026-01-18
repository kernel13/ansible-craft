#!/usr/bin/env node
import { program } from './program.ts';

try {
  await program.parseAsync(process.argv);
} catch (error) {
  process.exitCode = 1;
}
