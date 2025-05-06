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
  level: z.enum(['verbose', 'info', 'error']),
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

// --- Timezone Dropdown Logic ---
const timezoneSelect = document.getElementById('timezoneSelect') as HTMLSelectElement;
let selectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function populateTimezones() {
  if (!timezoneSelect) return;
  const timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [selectedTimezone];
  for (const tz of timezones) {
    const option = document.createElement('option');
    option.value = tz;
    option.textContent = tz;
    if (tz === selectedTimezone) option.selected = true;
    timezoneSelect.appendChild(option);
  }
}

if (timezoneSelect) {
  populateTimezones();
  timezoneSelect.addEventListener('change', () => {
    selectedTimezone = timezoneSelect.value;
    displayLogs(validatedLines);
  });
}

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
    .map(({ valid, line }) => {
      if (!line.trim()) return '';
      if (!valid) {
        // Invalid JSON or schema
        return `<div class="log-message log-invalid">
          <span class="log-invalid-label">[UNSUPPORTED FORMAT]</span> ${escapeHtml(line)}
        </div>`;
      }
      try {
        const log = JSON.parse(line);
        type Level = z.infer<typeof logSchema>['level'];
        const levelColors: Record<Level, string> = {
          verbose: '#9e9e9e',
          info:    '#2196f3',
          error:   '#f44336',
        };
        const level: Level = log.level;
        const levelColor = levelColors[level] || '#fff';
        // Format time_logged in selected timezone
        let formattedTime = '';
        if (log.meta?.time_logged) {
          try {
            const date = new Date(log.meta.time_logged);
            formattedTime = new Intl.DateTimeFormat('default', {
              year: 'numeric', month: 'short', day: '2-digit',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
              hour12: true, timeZone: selectedTimezone
            }).format(date);
          } catch {}
        }
        const time = formattedTime ? `<span class='log-time'>${escapeHtml(formattedTime)}</span>` : '';
        const name = log.meta?.name ? `<span class='log-name'>${escapeHtml(log.meta.name)}</span>` : '';
        const message = `<span class='log-message-main' data-level='${level}'>${escapeHtml(log.message)}</span>`;
        let extra = '';
        if (log.payload) {
          extra += `<span class='log-payload-label'> payload:</span> <span class='log-payload'>${escapeHtml(JSON.stringify(log.payload))}</span>`;
        }
        extra += ` <span class='log-meta-label'>pid:</span><span class='log-meta'>${escapeHtml(String(log.meta.pid))}</span>`;
        extra += ` <span class='log-meta-label'>ver:</span><span class='log-meta'>${escapeHtml(log.meta.version)}</span>`;
        return `<div class="log-message log-valid log-level-${level}">
          ${time} ${name} ${message}${extra}
        </div>`;
      } catch (e) {
        return `<div class="log-message log-invalid">
          <span class="log-invalid-label">[UNSUPPORTED FORMAT]</span> ${escapeHtml(line)}
        </div>`;
      }
    })
    .join('');
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
