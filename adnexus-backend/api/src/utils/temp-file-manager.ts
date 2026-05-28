/** Stub temp file manager. */
const tempFiles = new Map<string, string>();
export const tempFileManager = {
  create: async (_content: string, _ext?: string) => '',
  delete: async (_path: string) => {},
  cleanup: async () => tempFiles.clear(),
};
