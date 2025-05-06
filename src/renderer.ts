/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// --- Log Viewer Logic ---
const logFileInput = document.getElementById('logFileInput') as HTMLInputElement;
const logDisplay = document.getElementById('logDisplay') as HTMLPreElement;
const searchBox = document.getElementById('searchBox') as HTMLInputElement;

let logLines: string[] = [];

if (logFileInput) {
  logFileInput.addEventListener('change', (event) => {
    const file = logFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      logLines = text.split(/\r?\n/);
      displayLogs(logLines);
    };
    reader.readAsText(file);
  });
}

if (searchBox) {
  searchBox.addEventListener('input', (event) => {
    const query = searchBox.value.trim().toLowerCase();
    if (!query) {
      displayLogs(logLines);
    } else {
      const filtered = logLines.filter(line => line.toLowerCase().includes(query));
      displayLogs(filtered);
    }
  });
}

function displayLogs(lines: string[]) {
  if (!logDisplay) return;
  logDisplay.textContent = lines.join('\n');
}
