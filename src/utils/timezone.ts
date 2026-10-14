// Timezone options offered in the navbar dropdown, in addition to a detected one
export const FIXED_TIMEZONES = ['UTC', 'Australia/Melbourne'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildTimezoneOptions(detected: string | null): string[] {
  return detected && !FIXED_TIMEZONES.includes(detected) ? [detected, ...FIXED_TIMEZONES] : FIXED_TIMEZONES;
}

function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Detect the timezone the device is configured with from the raw text of box and syslog files.
 *
 * 1. Box logs: the "time zone has been set" event carries an IANA name (latest one wins).
 * 2. Syslog: "Kernel timezone updated to N minutes west of GMT" only gives an offset, so it is
 *    mapped to a fixed-offset Etc/GMT zone when it is a whole number of hours.
 */
export function detectTimezone(boxTexts: string[], syslogTexts: string[]): string | null {
  let latestTime = -Infinity;
  let detected: string | null = null;
  const eventRegex = /^.*"time zone has been set".*$/gm;
  for (const text of boxTexts) {
    for (const [line] of text.matchAll(eventRegex)) {
      try {
        const entry = JSON.parse(line);
        const time = new Date(entry?.meta?.time_logged).getTime();
        if (isValidTimezone(entry.time_zone) && (!isNaN(time) ? time : 0) >= latestTime) {
          latestTime = isNaN(time) ? 0 : time;
          detected = entry.time_zone;
        }
      } catch {
        // not a JSON line, ignore
      }
    }
  }
  if (detected) return detected;

  const offsetRegex = /Kernel timezone updated to (-?\d+) minutes west of GMT/;
  for (const text of syslogTexts) {
    const match = offsetRegex.exec(text);
    if (match) {
      const hoursWest = parseInt(match[1], 10) / 60;
      if (Number.isInteger(hoursWest)) {
        if (hoursWest === 0) return 'UTC';
        // Etc/GMT signs are inverted: Etc/GMT+5 is UTC-5
        const tz = `Etc/GMT${hoursWest > 0 ? '+' : '-'}${Math.abs(hoursWest)}`;
        if (isValidTimezone(tz)) return tz;
      }
    }
  }
  return null;
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Convert a `dmesg -T` wall-clock time such as "Tue Sep 22 05:42:22 2026" recorded in `timeZone`
 * to an ISO UTC string. Returns null if the text is not a valid date.
 */
export function dmesgWallTimeToIso(text: string, timeZone: string): string | null {
  const match = /^[A-Za-z]{3} ([A-Za-z]{3}) +(\d{1,2}) (\d{2}):(\d{2}):(\d{2}) (\d{4})$/.exec(text);
  if (!match) return null;
  const month = MONTHS.indexOf(match[1]);
  if (month < 0) return null;
  const wall = Date.UTC(+match[6], month, +match[2], +match[3], +match[4], +match[5]);
  // Two passes so the offset is taken at the resulting instant (handles DST boundaries)
  let utc = wall - zoneOffsetMs(wall, timeZone);
  utc = wall - zoneOffsetMs(utc, timeZone);
  const date = new Date(utc);
  return isNaN(date.getTime()) ? null : date.toISOString();
}
