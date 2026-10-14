import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { LOG_FOLDERS_ROOT_NAME } from './utils/logFolders';
// import started from 'electron-squirrel-startup';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// if (started) {
//   app.quit();
// }

const createWindow = async () => {
    // Install React DevTools in development
  if (!app.isPackaged) {
    try {
      const { default: installExtension, REACT_DEVELOPER_TOOLS } = await import('electron-devtools-installer');
      await installExtension(REACT_DEVELOPER_TOOLS);
      console.log('React DevTools installed successfully');
    } catch (error) {
      console.error('Failed to install React DevTools:', error);
    }
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox for React DevTools to work
      webSecurity: false, // Disable web security for local file access
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  session.defaultSession.getAllExtensions().map(e => {
  if (e.name === 'React Developer Tools') {
    session.defaultSession.loadExtension(e.path);
  }
});
};

// Downloaded box logs: the renderer is sandboxed from the file system, so it asks the main process
const logFoldersRoot = path.join(os.homedir(), LOG_FOLDERS_ROOT_NAME);

// Only plain names are accepted so the renderer cannot reach outside the logs folder
function resolveInRoot(...names: string[]): string {
  for (const name of names) {
    if (!name || name !== path.basename(name) || name === '.' || name === '..') {
      throw new Error(`Invalid name: ${name}`);
    }
  }
  return path.join(logFoldersRoot, ...names);
}

ipcMain.handle('log-folders:list-folders', async () => {
  try {
    const entries = await fs.readdir(logFoldersRoot, { withFileTypes: true });
    const folders = await Promise.all(
      entries.filter(e => e.isDirectory()).map(async e => ({
        name: e.name,
        createdMs: (await fs.stat(path.join(logFoldersRoot, e.name))).birthtimeMs,
      }))
    );
    return { folders };
  } catch (error) {
    // A missing folder just means nothing has been downloaded yet; anything else (e.g. EPERM from
    // macOS blocking access to Downloads) is worth telling the user about
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { folders: [] };
    console.error(`Could not read ${logFoldersRoot}:`, error);
    return { folders: [], error: (error as NodeJS.ErrnoException).code ?? 'unknown error' };
  }
});

ipcMain.handle('log-folders:list-files', async (_event, folder: string) => {
  const entries = await fs.readdir(resolveInRoot(folder), { withFileTypes: true });
  return entries.filter(e => e.isFile()).map(e => e.name);
});

ipcMain.handle('log-folders:read-file', async (_event, folder: string, file: string) => {
  return fs.readFile(resolveInRoot(folder, file));
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
