import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: false, // Skip type declarations for CLI-only package
  clean: true,
  sourcemap: false, // Not needed for CLI distribution
  splitting: false, // Single file output for CLI
  treeshake: true,
  target: 'node18',
  platform: 'node',
  shims: true, // Enables __dirname/__filename shims for ESM
  // Note: Source already has shebang, so no banner needed
  // Note: CJS format not supported due to top-level await in codebase
});
