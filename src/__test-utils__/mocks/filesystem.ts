import { mock } from 'bun:test';

/**
 * Mock file system state for testing file operations.
 */
export interface MockFileSystem {
  /** Directories that exist in the mock file system */
  existingDirs: Set<string>;
  /** Directories created during test */
  createdDirs: string[];
  /** Files written during test (path -> content) */
  writtenFiles: Map<string, string>;
  /** Files that exist with their content */
  existingFiles: Map<string, string>;
  /** Directories removed during test */
  removedDirs: string[];
  /** Mock functions */
  mockAccess: ReturnType<typeof mock>;
  mockMkdir: ReturnType<typeof mock>;
  mockWriteFile: ReturnType<typeof mock>;
  mockRm: ReturnType<typeof mock>;
  mockReadFile: ReturnType<typeof mock>;
  mockReaddir: ReturnType<typeof mock>;
  mockStat: ReturnType<typeof mock>;
}

/**
 * Create a mock file system for testing.
 */
export function createMockFileSystem(options?: {
  existingDirs?: string[];
  existingFiles?: Record<string, string>;
}): MockFileSystem {
  const existingDirs = new Set<string>(options?.existingDirs ?? []);
  const existingFiles = new Map<string, string>(Object.entries(options?.existingFiles ?? {}));
  const createdDirs: string[] = [];
  const writtenFiles = new Map<string, string>();
  const removedDirs: string[] = [];

  const mockAccess = mock(async (path: string) => {
    if (existingDirs.has(path) || existingFiles.has(path) || createdDirs.includes(path)) {
      return;
    }
    const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  });

  const mockMkdir = mock(async (path: string, _options?: { recursive?: boolean }) => {
    createdDirs.push(path);
    existingDirs.add(path);
    return path;
  });

  const mockWriteFile = mock(async (path: string, content: string) => {
    writtenFiles.set(path, content);
  });

  const mockRm = mock(async (path: string, _options?: { recursive?: boolean; force?: boolean }) => {
    removedDirs.push(path);
    existingDirs.delete(path);
    // Remove all files in the directory
    for (const filePath of existingFiles.keys()) {
      if (filePath.startsWith(path)) {
        existingFiles.delete(filePath);
      }
    }
  });

  const mockReadFile = mock(async (path: string) => {
    if (existingFiles.has(path)) {
      return existingFiles.get(path);
    }
    if (writtenFiles.has(path)) {
      return writtenFiles.get(path);
    }
    const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  });

  const mockReaddir = mock(async (path: string) => {
    const entries: string[] = [];
    for (const filePath of existingFiles.keys()) {
      if (filePath.startsWith(path) && filePath !== path) {
        const relativePath = filePath.slice(path.length + 1);
        const firstPart = relativePath.split('/')[0];
        if (!entries.includes(firstPart)) {
          entries.push(firstPart);
        }
      }
    }
    return entries;
  });

  const mockStat = mock(async (path: string) => {
    if (existingDirs.has(path) || createdDirs.includes(path)) {
      return {
        isFile: () => false,
        isDirectory: () => true,
      };
    }
    if (existingFiles.has(path) || writtenFiles.has(path)) {
      return {
        isFile: () => true,
        isDirectory: () => false,
      };
    }
    const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
    (error as NodeJS.ErrnoException).code = 'ENOENT';
    throw error;
  });

  return {
    existingDirs,
    createdDirs,
    writtenFiles,
    existingFiles,
    removedDirs,
    mockAccess,
    mockMkdir,
    mockWriteFile,
    mockRm,
    mockReadFile,
    mockReaddir,
    mockStat,
  };
}

/**
 * Reset a mock file system to its initial state.
 */
export function resetMockFileSystem(fs: MockFileSystem): void {
  fs.createdDirs.length = 0;
  fs.writtenFiles.clear();
  fs.removedDirs.length = 0;
  fs.mockAccess.mockClear();
  fs.mockMkdir.mockClear();
  fs.mockWriteFile.mockClear();
  fs.mockRm.mockClear();
  fs.mockReadFile.mockClear();
  fs.mockReaddir.mockClear();
  fs.mockStat.mockClear();
}
