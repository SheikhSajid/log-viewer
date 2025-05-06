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
import { z } from 'zod';

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// Zod schema for log validation
const logSchema = z.object({
  level: z.string(), // Accept any string, can refine for specific values
  message: z.string(),
  meta: z.object({
    mac_address: z.string(),
    name: z.string(),
    org_id: z.string(),
    pid: z.number(),
    process: z.literal('box'),
    time_logged: z.string().transform((str) => new Date(str)),
    version: z.string(),
  }),
  payload: z.unknown().optional(),
});

// --- Log Viewer Logic ---
const logFileInput = document.getElementById('logFileInput') as HTMLInputElement;
const logDisplay = document.getElementById('logDisplay') as HTMLPreElement;
const searchBox = document.getElementById('searchBox') as HTMLInputElement;

let logLines: string[] = [];
let validatedLines: { valid: boolean; line: string; error?: string }[] = [];

if (logFileInput) {
  logFileInput.addEventListener('change', (event) => {
    const file = logFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      logLines = text.split(/\r?\n/);
      validatedLines = logLines.map((line) => {
        if (!line.trim()) return { valid: false, line };
        try {
          const parsed = JSON.parse(line);
          logSchema.parse(parsed);
          return { valid: true, line };
        } catch (err: any) {
          return { valid: false, line, error: err.message };
        }
      });
      displayLogs(validatedLines);
    };
    reader.readAsText(file);
  });
}

if (searchBox) {
  searchBox.addEventListener('input', (event) => {
    const query = searchBox.value.trim().toLowerCase();
    let filtered = validatedLines;
    if (query) {
      filtered = validatedLines.filter(({ line }) => line.toLowerCase().includes(query));
    }
    displayLogs(filtered);
  });
}

function displayLogs(lines: { valid: boolean; line: string; error?: string }[]) {
  if (!logDisplay) return;
  logDisplay.innerHTML = lines
    .map(({ valid, line, error }) => {
      if (!line.trim()) return '';
      if (valid) {
        return `<span style="color:#8f8">${escapeHtml(line)}</span>`;
      } else {
        console.warn(line);
        console.warn(error);
        return `<span style="color:#f88">${escapeHtml(line)}</span>`;
      }
    })
    .join('<br>');
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}
