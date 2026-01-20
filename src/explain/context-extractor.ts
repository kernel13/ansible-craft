import { parse } from 'yaml';
import { readAnsiblePath, type RoleFile } from './file-reader.js';

export interface ContextExtraction {
  variables: Record<string, unknown>; // From defaults/, vars/
  handlers: string[]; // Handler names only
  taskContext: string; // ±5 lines around failing task
  roleStructure?: string; // Directory listing for role explanation
}

/**
 * Extract context from a playbook/role for the explain command.
 * Returns variables, handler names, and role structure.
 */
export async function extractContext(playbookPath: string): Promise<ContextExtraction> {
  const files = await readAnsiblePath(playbookPath);

  // Extract variables from defaults/main.yml and vars/main.yml
  const variables: Record<string, unknown> = {};
  const varFiles = files.filter(
    f => f.type === 'defaults' || f.type === 'vars'
  );

  for (const varFile of varFiles) {
    try {
      const parsed = parse(varFile.content);
      if (parsed && typeof parsed === 'object') {
        Object.assign(variables, parsed);
      }
    } catch {
      // Skip unparseable files
    }
  }

  // Extract handler names
  const handlers = extractHandlerNames(files);

  // Build role structure string if it's a role (has multiple file types)
  let roleStructure: string | undefined;
  const uniqueTypes = new Set(files.map(f => f.type));
  if (uniqueTypes.size > 1) {
    roleStructure = buildRoleStructure(files);
  }

  return {
    variables,
    handlers,
    taskContext: '', // Not used for explain command
    roleStructure,
  };
}

/**
 * Extract context for the fix command.
 * Finds the failing task and extracts surrounding context.
 */
export async function extractFixContext(
  errorMessage: string,
  playbookPath: string
): Promise<ContextExtraction> {
  const files = await readAnsiblePath(playbookPath);

  // Parse task name from error
  const taskName = parseTaskNameFromError(errorMessage);

  // Find the task in files
  let taskContext = '';
  if (taskName) {
    const taskLocation = findTaskInFiles(taskName, files);
    if (taskLocation) {
      taskContext = extractTaskContext(
        taskLocation.file.content,
        taskLocation.lineIndex
      );
    }
  }

  // Extract variables
  const variables: Record<string, unknown> = {};
  const varFiles = files.filter(
    f => f.type === 'defaults' || f.type === 'vars'
  );

  for (const varFile of varFiles) {
    try {
      const parsed = parse(varFile.content);
      if (parsed && typeof parsed === 'object') {
        Object.assign(variables, parsed);
      }
    } catch {
      // Skip unparseable files
    }
  }

  // Extract handler names
  const handlers = extractHandlerNames(files);

  return {
    variables,
    handlers,
    taskContext,
  };
}

/**
 * Parse task name from Ansible error message.
 * Tries multiple regex patterns for different error formats.
 */
export function parseTaskNameFromError(errorMessage: string): string | undefined {
  const patterns = [
    /TASK \[(.*?)\]/, // TASK [Install nginx]
    /"task":\s*"(.*?)"/, // JSON format: "task": "Install nginx"
    /The task includes an option with an undefined variable.*?"(.*?)"/, // Undefined var error
    /fatal:.*?TASK:\s+(.*?)\s*=>/, // Fatal error format
    /RUNNING HANDLER \[(.*?)\]/, // Handler execution
  ];

  for (const pattern of patterns) {
    const match = errorMessage.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return undefined;
}

/**
 * Find a task by name in role files.
 * Returns the file and line number if found.
 */
export function findTaskInFiles(
  taskName: string,
  files: RoleFile[]
): { file: RoleFile; lineIndex: number } | undefined {
  // Search through tasks and handlers files
  const searchFiles = files.filter(
    f => f.type === 'tasks' || f.type === 'handlers' || f.type === 'playbook'
  );

  for (const file of searchFiles) {
    const lines = file.content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match task name with or without quotes
      if (
        line.includes(`name: ${taskName}`) ||
        line.includes(`name: "${taskName}"`) ||
        line.includes(`name: '${taskName}'`)
      ) {
        return { file, lineIndex: i };
      }
    }
  }

  return undefined;
}

/**
 * Extract ±5 lines around a task.
 * If task spans >15 lines, include full task body.
 */
function extractTaskContext(content: string, lineIndex: number): string {
  const lines = content.split('\n');

  // Find the end of the task (next task or end of file)
  let taskEnd = lineIndex + 1;
  const taskIndent = lines[lineIndex].match(/^(\s*)/)?.[1].length || 0;

  for (let i = lineIndex + 1; i < lines.length; i++) {
    const currentLine = lines[i];

    // Empty line continues
    if (!currentLine.trim()) continue;

    // Check if this is a new task (same or less indentation with name: or -)
    const currentIndent = currentLine.match(/^(\s*)/)?.[1].length || 0;
    if (currentIndent <= taskIndent && (currentLine.includes('name:') || currentLine.trim().startsWith('- '))) {
      taskEnd = i;
      break;
    }
  }

  const taskLength = taskEnd - lineIndex;

  // If task is very long (>15 lines), include full task + 3 lines before/after
  if (taskLength > 15) {
    const start = Math.max(0, lineIndex - 3);
    const end = Math.min(lines.length, taskEnd + 3);
    return lines.slice(start, end).join('\n');
  }

  // Otherwise, ±5 lines
  const start = Math.max(0, lineIndex - 5);
  const end = Math.min(lines.length, lineIndex + 10);
  return lines.slice(start, end).join('\n');
}

/**
 * Extract handler names from handler files.
 */
function extractHandlerNames(files: RoleFile[]): string[] {
  const handlers: string[] = [];
  const handlerFiles = files.filter(f => f.type === 'handlers');

  for (const handlerFile of handlerFiles) {
    const matches = handlerFile.content.matchAll(/name:\s+([^\n]+)/g);
    for (const match of matches) {
      const handlerName = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      handlers.push(handlerName);
    }
  }

  return handlers;
}

/**
 * Build a role structure string showing directory tree.
 */
function buildRoleStructure(files: RoleFile[]): string {
  const structure = new Map<string, string[]>();

  for (const file of files) {
    const dir = file.path.split('/')[0];
    if (!structure.has(dir)) {
      structure.set(dir, []);
    }
    structure.get(dir)?.push(file.path);
  }

  const lines: string[] = [];
  for (const [dir, paths] of structure) {
    lines.push(`${dir}/`);
    for (const path of paths) {
      const fileName = path.split('/').slice(1).join('/');
      lines.push(`  ${fileName}`);
    }
  }

  return lines.join('\n');
}
