export interface GeneratedFile {
  path: string; // e.g., "tasks/main.yml"
  content: string; // YAML or text content
}

/** Regex to match file markers in generated output */
const FILE_MARKER_REGEX = /=== PATH: (.+?) ===([\s\S]*?)=== END ===/g;

/**
 * Parse generated content using file markers.
 *
 * Format:
 * === PATH: tasks/main.yml ===
 * ---
 * [content]
 * === END ===
 *
 * @param output - Raw generated output from Claude
 * @returns Array of parsed files
 */
export function parseGeneratedFiles(output: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];

  // Reset regex state (global flag keeps lastIndex)
  FILE_MARKER_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = FILE_MARKER_REGEX.exec(output)) !== null) {
    const path = match[1].trim();
    const content = match[2].trim();

    // Skip malformed blocks
    if (!path) {
      console.warn('Skipping file block with empty path');
      continue;
    }

    // Validate path doesn't try to escape role directory
    if (path.includes('..') || path.startsWith('/')) {
      console.warn(`Skipping potentially unsafe path: ${path}`);
      continue;
    }

    files.push({
      path,
      content,
    });
  }

  if (files.length === 0 && output.length > 0) {
    console.warn(
      'No file markers found in output. Expected format: === PATH: <path> === ... === END ===',
    );
  }

  return files;
}

/**
 * Check if the output contains file markers.
 * Useful for detecting if generation produced expected format.
 */
export function hasFileMarkers(output: string): boolean {
  return /=== PATH: .+? ===/s.test(output);
}

/**
 * Count the number of files in the output without fully parsing.
 */
export function countFiles(output: string): number {
  const matches = output.match(/=== PATH: .+? ===/g);
  return matches ? matches.length : 0;
}
