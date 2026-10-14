export interface BoxInfo {
  roomName: string | null;
  /** The org's subdomain from the box config, used as its display name (logs carry no real org name) */
  orgName: string | null;
  orgId: string | null;
  macAddress: string | null;
}

export interface LogsLoadedInfo {
  timezone: string | null;
  box: BoxInfo;
}

const MAC_REGEX = /"mac_address":"([0-9a-fA-F]{2}(?::[0-9a-fA-F]{2}){5})"/;
const ORG_ID_REGEX = /"org_id":"([0-9a-fA-F-]{36})"/;

/**
 * Work out which box (and room) the loaded files belong to.
 *
 * Room name: the box periodically logs its full config as a single JSON line starting with
 * `{"access_mode"`, whose top-level `name` is the room name. The latest dump wins.
 * Org name: the config's `subdomain`. Org id: `meta.org_id`, present on every box log.
 * MAC address: every box log carries it in `meta.mac_address`; syslog Logger lines carry it too.
 */
export function detectBoxInfo(boxTexts: string[], syslogTexts: string[]): BoxInfo {
  let roomName: string | null = null;
  let orgName: string | null = null;
  let orgId: string | null = null;
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
          orgName = typeof config.subdomain === 'string' && config.subdomain.trim() ? config.subdomain.trim() : null;
          orgId = config?.meta?.org_id ?? config?.organisations?.[0] ?? null;
          macAddress = config?.meta?.mac_address ?? macAddress;
        }
      } catch {
        // not a complete JSON line, ignore
      }
    }
  }

  for (const text of [...boxTexts, ...syslogTexts]) {
    if (macAddress && orgId) break;
    if (!macAddress) macAddress = MAC_REGEX.exec(text)?.[1].toLowerCase() ?? null;
    if (!orgId) orgId = ORG_ID_REGEX.exec(text)?.[1] ?? null;
  }

  return { roomName, orgName, orgId, macAddress };
}
