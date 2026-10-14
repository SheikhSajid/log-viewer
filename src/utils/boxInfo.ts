export interface BoxInfo {
  roomName: string | null;
  macAddress: string | null;
}

export interface LogsLoadedInfo {
  timezone: string | null;
  box: BoxInfo;
}

const MAC_REGEX = /"mac_address":"([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})"/;

/**
 * Work out which box (and room) the loaded files belong to.
 *
 * Room name: the box periodically logs its full config as a single JSON line starting with
 * `{"access_mode"`, whose top-level `name` is the room name. The latest dump wins.
 * MAC address: every box log carries it in `meta.mac_address`; syslog Logger lines carry it too.
 */
export function detectBoxInfo(boxTexts: string[], syslogTexts: string[]): BoxInfo {
  let roomName: string | null = null;
  let macAddress: string | null = null;
  let latestTime = -Infinity;

  const configRegex = /^\{"access_mode".*$/gm;
  for (const text of boxTexts) {
    for (const [line] of text.matchAll(configRegex)) {
      try {
        const config = JSON.parse(line);
        const time = new Date(config?.meta?.time_logged).getTime() || 0;
        if (typeof config.name === 'string' && config.name.trim() && time >= latestTime) {
          latestTime = time;
          roomName = config.name.trim();
          macAddress = config?.meta?.mac_address ?? macAddress;
        }
      } catch {
        // not a complete JSON line, ignore
      }
    }
  }

  if (!macAddress) {
    for (const text of [...boxTexts, ...syslogTexts]) {
      const match = MAC_REGEX.exec(text);
      if (match) {
        macAddress = match[1].toLowerCase();
        break;
      }
    }
  }

  return { roomName, macAddress };
}
