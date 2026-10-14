import { wallTimeToUtcMs } from './timezone';

// Root folder (inside the user's home directory) that downloaded box logs are saved to
export const LOG_FOLDERS_ROOT_NAME = 'Downloads/Downloaded Box Logs';
export const MAX_RECENT_FOLDERS = 10;

// The download tool names its time ranges in Melbourne local time
export const LOG_FOLDER_TIMEZONE = 'Australia/Melbourne';

export interface LogFolderEntry {
  name: string;
  /** When the folder was created on this machine (epoch ms) */
  createdMs: number;
  boxId: string;
  start: Date;
  end: Date;
}

// "<box-guid>_DD-MM-YYYY-HHMM_DD-MM-YYYY-HHMM", e.g. 5a1951ba-..._22-09-2026-2200_30-09-2026-0159
const FOLDER_NAME_REGEX = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(\d{2})-(\d{2})-(\d{4})-(\d{2})(\d{2})_(\d{2})-(\d{2})-(\d{4})-(\d{2})(\d{2})$/i;

function parseStamp(day: string, month: string, year: string, hour: string, minute: string): Date | null {
  const [d, mo, y, h, mi] = [day, month, year, hour, minute].map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate() || h > 23 || mi > 59) return null;
  const date = new Date(wallTimeToUtcMs(y, mo, d, h, mi, 0, LOG_FOLDER_TIMEZONE));
  return isNaN(date.getTime()) ? null : date;
}

export function parseLogFolderName(name: string, createdMs: number = 0): LogFolderEntry | null {
  const m = FOLDER_NAME_REGEX.exec(name);
  if (!m) return null;
  const start = parseStamp(m[2], m[3], m[4], m[5], m[6]);
  const end = parseStamp(m[7], m[8], m[9], m[10], m[11]);
  if (!start || !end || end < start) return null;
  return { name, createdMs, boxId: m[1], start, end };
}

/** Drop anything that is not a log folder, then most recently created first, capped at `limit`. */
export function recentLogFolders(folders: { name: string; createdMs: number }[], limit: number = MAX_RECENT_FOLDERS): LogFolderEntry[] {
  return folders
    .map(f => parseLogFolderName(f.name, f.createdMs))
    .filter((entry): entry is LogFolderEntry => entry !== null)
    .sort((a, b) => b.createdMs - a.createdMs || b.end.getTime() - a.end.getTime())
    .slice(0, limit);
}

// e.g. "22 Sep 2026, 22:00"
function formatStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: LOG_FOLDER_TIMEZONE,
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')}`;
}

// e.g. "AEST" or "AEDT", depending on the date
function zoneAbbreviation(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-AU', { timeZone: LOG_FOLDER_TIMEZONE, timeZoneName: 'short' }).formatToParts(date);
  return parts.find(p => p.type === 'timeZoneName')?.value ?? LOG_FOLDER_TIMEZONE;
}

export function formatLogFolderRange(entry: LogFolderEntry): string {
  return `${formatStamp(entry.start)} to ${formatStamp(entry.end)} (${zoneAbbreviation(entry.end)})`;
}
