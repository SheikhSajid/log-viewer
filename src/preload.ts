// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
import { contextBridge, ipcRenderer } from 'electron';
import type { LogFoldersApi } from './types/logFoldersApi';

const logFolders: LogFoldersApi = {
  listFolders: () => ipcRenderer.invoke('log-folders:list-folders'),
  listFiles: (folder) => ipcRenderer.invoke('log-folders:list-files', folder),
  readFile: (folder, file) => ipcRenderer.invoke('log-folders:read-file', folder, file),
};

contextBridge.exposeInMainWorld('logFolders', logFolders);
