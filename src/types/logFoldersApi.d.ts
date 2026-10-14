// API exposed to the renderer by src/preload.ts
export interface LogFoldersApi {
  /** Sub-folders of the downloaded box logs folder with their creation time, or an error code if it could not be read. */
  listFolders: () => Promise<{ folders: { name: string; createdMs: number }[]; error?: string }>;
  /** Names of the files inside one of those folders. */
  listFiles: (folder: string) => Promise<string[]>;
  /** Raw contents of one file inside one of those folders. */
  readFile: (folder: string, file: string) => Promise<Uint8Array>;
}

declare global {
  interface Window {
    logFolders?: LogFoldersApi;
  }
}
