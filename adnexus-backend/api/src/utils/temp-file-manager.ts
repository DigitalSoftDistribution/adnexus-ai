/** Stub temp file manager — full interface for services that need one. */
const tempFiles = new Map<string, string>();
let _initialized = false;

export const tempFileManager = {
  /** Initialize the temp file manager (create temp dir, set up cleanup hooks) */
  initialize: async (_config?: { tempDir?: string; maxAge?: number }) => {
    _initialized = true;
  },

  /** Create a temporary file and return its path */
  create: async (_content: string, _ext?: string): Promise<string> => '',

  /** Create a temp path without writing a file (synchronous for chart/export services) */
  createTempPath: (_ext?: string): string => '',

  /** Track a file for later cleanup */
  trackFile: (_path: string) => {},

  /** Get the file size in bytes */
  getFileSize: async (_path: string): Promise<number> => 0,

  /** Delete a specific temp file */
  delete: async (_path: string) => {},

  /** Clean up all tracked temp files */
  cleanup: async () => {
    tempFiles.clear();
    _initialized = false;
  },
};
