import type { ValidatedLogLine } from '../components/LogMessage';

// Plain-English explanations for CEC / HDMI log lines from the Android receiver
// (Vivi Power.java, Amlogic hdmicecd, Android HdmiControlService, kernel hdmitx/aocec)
// and the box app's CEC IPC messages.

export type CecIntent = 'none' | 'success' | 'warning' | 'danger';

export interface CecAnnotation {
  label: string;
  detail: string;
  intent: CecIntent;
}

const LOGICAL_ADDRESSES: Record<number, string> = {
  0x0: 'TV',
  0x1: 'Recorder 1',
  0x2: 'Recorder 2',
  0x3: 'Tuner 1',
  0x4: 'Box',
  0x5: 'Audio System',
  0x6: 'Tuner 2',
  0x7: 'Tuner 3',
  0x8: 'Playback 2',
  0x9: 'Recorder 3',
  0xa: 'Tuner 4',
  0xb: 'Playback 3',
  0xe: 'Specific Use',
  0xf: 'Broadcast'
};

const OPCODES: Record<number, string> = {
  0x00: 'Feature Abort',
  0x04: 'Image View On',
  0x0d: 'Text View On',
  0x36: 'Standby',
  0x44: 'User Control Pressed',
  0x45: 'User Control Released',
  0x46: 'Give OSD Name',
  0x47: 'Set OSD Name',
  0x71: 'Give Audio Status',
  0x7a: 'Report Audio Status',
  0x80: 'Routing Change',
  0x82: 'Active Source',
  0x83: 'Give Physical Address',
  0x84: 'Report Physical Address',
  0x85: 'Request Active Source',
  0x86: 'Set Stream Path',
  0x87: 'Device Vendor ID',
  0x8c: 'Give Device Vendor ID',
  0x8f: 'Give Device Power Status',
  0x90: 'Report Power Status',
  0x91: 'Get Menu Language',
  0x9d: 'Inactive Source',
  0x9e: 'CEC Version',
  0x9f: 'Get CEC Version'
};

const POWER_STATUS: Record<number, string> = {
  0x00: 'On',
  0x01: 'Standby',
  0x02: 'Turning on',
  0x03: 'Turning off'
};

const ABORT_REASONS: Record<number, string> = {
  0: 'unrecognized opcode',
  1: 'not in a state to respond',
  2: 'cannot provide source',
  3: 'invalid operand',
  4: 'refused',
  5: 'unable to determine'
};

// Result codes from Android's hdmi_cec.h
const SEND_RESULT_LABELS: Record<number, string> = {
  1: 'no ACK',
  2: 'bus busy',
  3: 'failed'
};

const SEND_RESULTS: Record<number, string> = {
  1: 'no device acknowledged it (NACK)',
  2: 'the CEC bus was busy',
  3: 'the send failed'
};

const OPCODE_DETAILS: Record<number, string> = {
  0x04: 'Asks the display to turn on and show this input. Power.java only sends it after the display reported Standby or did not answer Give Device Power Status.',
  0x36: 'Asks the display to go into standby. Power.java only sends it when the display did not report Standby first.',
  0x8f: 'Asks the display for its power state. Power.java reads the reply (Report Power Status, 0x90) straight from the CEC registers about 200ms later.',
  0x8c: 'Asks the display for its CEC vendor ID.',
  0x90: 'Reply to Give Device Power Status.'
};

function addressName(address: number) {
  return LOGICAL_ADDRESSES[address] ?? `Device ${address}`;
}

function opcodeName(opcode: number) {
  return OPCODES[opcode] ?? `Opcode 0x${opcode.toString(16).padStart(2, '0')}`;
}

function formatPhysicalAddress(high: number, low: number) {
  return `${high >> 4}.${high & 0xf}.${low >> 4}.${low & 0xf}`;
}

// Decode a raw frame such as "0x40 0x04" or "0x4f 0x82  0x20 0x00"
function describeFrame(frame: string): CecAnnotation | null {
  const bytes = (frame.match(/0x[0-9a-f]{1,2}/gi) ?? []).map(byte => parseInt(byte, 16));
  if (bytes.length < 2) return null;

  const [header, opcode, ...params] = bytes;
  const from = addressName(header >> 4);
  const to = addressName(header & 0xf);
  const label = `${frame.trim().replace(/\s+/g, ' ')} = ${opcodeName(opcode)}, ${from} → ${to}`;

  if (opcode === 0x82 && params.length >= 2) {
    const physicalAddress = formatPhysicalAddress(params[0], params[1]);
    return {
      label,
      detail: `Tells every device the box (physical address ${physicalAddress}, HDMI input ${params[0] >> 4}) is the active source, so the display switches to it.`,
      intent: 'none'
    };
  }

  return {
    label,
    detail: OPCODE_DETAILS[opcode] ?? `Raw CEC frame sent by the box to ${to}.`,
    intent: 'none'
  };
}

// Android's "<Name> src: 0, dst: 4, params: 8C 05" format (addresses decimal, params hex)
function describeAndroidMessage(name: string, src: string, dst: string, params: string) {
  const from = addressName(parseInt(src, 10));
  const to = addressName(parseInt(dst, 10));
  const rawParams = params.trim().split(/\s+/).filter(Boolean);
  const paramBytes = rawParams.map(byte => parseInt(byte, 16));
  let decodedParams = '';
  let meaning = '';

  if (name === 'Report Power Status' && paramBytes.length > 0) {
    const status = POWER_STATUS[paramBytes[0]] ?? 'unknown';
    decodedParams = `: ${rawParams[0]} = ${status}`;
    meaning = ` ${from} says its power status is ${status}.`;
  } else if (name === 'Feature Abort' && paramBytes.length >= 2) {
    const reason = ABORT_REASONS[paramBytes[1]] ?? 'unknown reason';
    decodedParams = `: ${rawParams[0]} = ${opcodeName(paramBytes[0])}, ${rawParams[1]} = ${reason}`;
    meaning = ` ${from} rejected ${opcodeName(paramBytes[0])}: ${reason}.`;
  }

  return { label: `${name}, ${from} → ${to}${decodedParams}`, meaning };
}

const RECEPTIONIST_DETAILS = new Map<string, CecAnnotation>(Object.entries({
  'receive message powerOnCec': {
    label: 'Power on requested',
    detail: 'The box app asked the receiver to turn the display on over CEC. Power.java checks the power status first and only sends Image View On if the display is not on.',
    intent: 'none'
  },
  'send message powerOnCecOk': {
    label: 'Power on succeeded',
    detail: 'The display is on and Active Source was sent so it switches to the box input.',
    intent: 'success'
  },
  'send message powerOnCecFailed': {
    label: 'Power on failed',
    detail: 'Usually because the display never answered (asleep with CEC off, or still booting) and the physical address was undefined, so Active Source could not be sent. Check the Power lines just before this.',
    intent: 'danger'
  },
  'receive message powerOffCec': {
    label: 'Power off requested',
    detail: 'The box app asked the receiver to put the display into standby over CEC.',
    intent: 'none'
  },
  'send message powerOffCecOk': {
    label: 'Power off succeeded',
    detail: 'The display reported Standby after the Standby command.',
    intent: 'success'
  },
  'send message powerOffCecFailed': {
    label: 'Power off failed',
    detail: 'The display never reported Standby within the polling window. If it never answers CEC at all, it may already be in a standby that turns CEC off.',
    intent: 'danger'
  }
}));

const POWER_MESSAGES = new Map<string, CecAnnotation>(Object.entries({
  'power response not received by TV': {
    label: 'No power status reply',
    detail: 'The display did not answer Give Device Power Status within 200ms. Power.java treats this as unknown: during power on it sends Image View On, during power off it sends Standby.',
    intent: 'warning'
  },
  'not powering on, already on': {
    label: 'Display already on',
    detail: 'The display reported On, so Image View On is skipped and only Active Source is sent.',
    intent: 'none'
  },
  'not powering off, already off': {
    label: 'Display already off',
    detail: 'The display reported Standby, so no Standby command is sent.',
    intent: 'none'
  },
  'powered on successfully': {
    label: 'Display reported On',
    detail: 'A power status poll after Image View On came back On.',
    intent: 'success'
  },
  'powered off successfully': {
    label: 'Display reported Standby',
    detail: 'A power status poll after Standby came back Standby.',
    intent: 'success'
  },
  'power status polling finished without success': {
    label: 'Polling gave up',
    detail: 'All 15 power status polls ran without the display reaching the wanted state. During power on, Active Source is still attempted afterwards.',
    intent: 'warning'
  },
  'physical address is undefined': {
    label: 'No HDMI physical address',
    detail: '/sys/class/cec/physical_addr is 0000 because the box has no EDID from the display (display asleep with HDMI off, or still booting). Active Source cannot be built, so power on is reported as failed even if the display came on.',
    intent: 'danger'
  },
  'TV turning on': {
    label: 'Display turning on',
    detail: 'The display replied with power status "Turning on". Polling continues.',
    intent: 'none'
  },
  'TV turning off': {
    label: 'Display turning off',
    detail: 'The display replied with power status "Turning off". Polling continues.',
    intent: 'none'
  },
  'could not write to cec device': {
    label: 'CEC write failed',
    detail: 'Writing the frame to /sys/class/cec/cmd failed, so nothing was sent.',
    intent: 'danger'
  },
  'error while detecting HDMI port': {
    label: 'Could not read physical address',
    detail: 'Reading /sys/class/cec/physical_addr threw an error, so Active Source cannot be sent.',
    intent: 'danger'
  },
  'failed to get vendor id': {
    label: 'Vendor ID failed',
    detail: 'Could not get the display\'s CEC vendor ID.',
    intent: 'warning'
  }
}));

// Cheap pre-check so rows that cannot match skip the rule list
const CANDIDATE_REGEX = /cec|hdmi|hotplug|plug|physical|power|vendor|tv |Rx Manufacturer|policy|timed out/i;

export function getCecAnnotation(logLine: ValidatedLogLine): CecAnnotation | null {
  if (!logLine.valid || !logLine.parsedLog) return null;
  const { line } = logLine;
  if (!CANDIDATE_REGEX.test(line)) return null;

  const { message } = logLine.parsedLog;
  const name = logLine.parsedLog.meta.name;
  let match: RegExpExecArray | null;

  // --- Vivi receiver Power.java (syslog "Logger" lines unwrapped to their inner name)
  if (name === 'Power') {
    match = /^sending CEC command (.+)$/.exec(message);
    if (match) return describeFrame(match[1]);
    if (message.startsWith('vendor ID not received from TV')) {
      return {
        label: 'No vendor ID reply',
        detail: 'The display did not answer Give Device Vendor ID. The number at the end is the last opcode the box received.',
        intent: 'warning'
      };
    }
    const powerMessage = POWER_MESSAGES.get(message);
    if (powerMessage) return powerMessage;
  }

  // CommandUtil's shell write behind each CEC frame. The Power line already labels the frame,
  // so only the result is annotated. The command is JSON-escaped in the raw line.
  const unescapedLine = name === 'CommandUtil' && message === 'shell completed' ? line.replace(/\\/g, '') : '';
  if (unescapedLine.includes('/sys/class/cec/cmd')) {
    match = /echo ((?:0x[0-9a-f]{1,2}\s*)+)>/i.exec(unescapedLine);
    const frame = match ? describeFrame(match[1]) : null;
    const exitCode = /"exitCode":\s*"?(-?\d+)/.exec(unescapedLine)?.[1];
    if (frame) {
      return exitCode === '0'
        ? {
            ...frame,
            detail: `Frame written to /sys/class/cec/cmd. Exit code 0 only means the kernel accepted it, not that the display received or answered it. ${frame.detail}`
          }
        : {
            label: `Write failed: ${frame.label}`,
            detail: `Writing the frame to /sys/class/cec/cmd exited with code ${exitCode ?? 'unknown'}, so it was never sent.`,
            intent: 'danger'
          };
    }
  }

  const receptionistMessage = name === 'ReceptionistInternal' ? RECEPTIONIST_DETAILS.get(message) : undefined;
  if (receptionistMessage) return receptionistMessage;

  // --- Box app JSON logs: IPC to the receiver / supervisor
  match = /"messageType":\s*"(\w*Cec)"/.exec(line);
  if (match && message === 'message timed out') {
    return {
      label: `${match[1]} timed out`,
      detail: 'The box app stopped waiting after 10s. A CEC power on can take about 40s (15 polls), so the receiver keeps going and its reply arrives later as "could not find reply policy".',
      intent: 'warning'
    };
  }
  if (message === 'could not find reply policy for reply message') {
    match = /"type":\s*"(\w*Cec\w*)"/.exec(line);
    if (match) {
      return {
        label: `Late reply: ${match[1]}`,
        detail: 'The receiver answered after the box app had already timed out, so the reply was dropped. The result here is the real outcome of the CEC command.',
        intent: match[1].endsWith('Failed') ? 'danger' : 'none'
      };
    }
  }

  // --- Amlogic CEC HAL / daemon. Event types come from Android's hdmi_cec.h:
  // 1 = HDMI_EVENT_CEC_MESSAGE (a message was received), 2 = HDMI_EVENT_HOT_PLUG
  match = name === 'CEC' || name === 'hdmicecd-client'
    ? /event type\s*[:=]\s*([12])\b/.exec(message)
    : null;
  if (match) {
    const isMessage = match[1] === '1';
    const relay = name === 'CEC'
      ? 'The CEC HAL is forwarding it up to Android\'s CEC service ("send" means forwarding to Android, not transmitting on the bus).'
      : 'This is hdmicecd\'s client handing the event to Android. It pairs with the CEC "[onEventUpdate]" line logged at the same moment.';
    return isMessage
      ? {
          label: 'event type 1 = received CEC message',
          detail: `Event type 1 is HDMI_EVENT_CEC_MESSAGE in Android's hdmi_cec.h: the box received a CEC message. ${relay} Sender and contents are not logged unless Android fails to handle it.`,
          intent: 'none'
        }
      : {
          label: 'event type 2 = HDMI hotplug',
          detail: `Event type 2 is HDMI_EVENT_HOT_PLUG in Android's hdmi_cec.h: the HDMI connection changed. ${relay} The hdmicecd "connect status changed" line nearby gives the direction.`,
          intent: 'none'
        };
  }
  if (name === 'hdmicecd') {
    match = /connect status changed, now:(\d+), prevStatus:(\d+)/.exec(message);
    if (match) {
      const connected = match[1] === '1';
      return {
        label: `now:${match[1]} = ${connected ? 'HDMI connected' : 'HDMI disconnected'}`,
        detail: connected
          ? 'The CEC daemon sees the display\'s hotplug-detect line go high.'
          : 'The CEC daemon sees the display\'s hotplug-detect line go low (display into standby, booting, or unplugged).',
        intent: connected ? 'none' : 'warning'
      };
    }
    // Printed as hex digits, e.g. "2000" is 2.0.0.0
    match = /getPhysicalAddress, physical addr: ([0-9a-f]+)/i.exec(message);
    if (match) {
      const value = parseInt(match[1], 16);
      return value === 0
        ? {
            label: `${match[1]} = no physical address`,
            detail: 'No valid EDID from the display, so the box has no HDMI address. CEC power on will fail at Active Source.',
            intent: 'warning'
          }
        : {
            label: `${match[1]} = physical address ${formatPhysicalAddress(value >> 8, value & 0xff)} (HDMI ${value >> 12})`,
            detail: `The box is on HDMI input ${value >> 12} of the display.`,
            intent: 'none'
          };
    }
  }

  // --- Android HdmiControlService
  match = /Unhandled cec command:<([^>]+)> src: (\d+), dst: (\d+), params:\s*(.*)$/.exec(message);
  if (match) {
    const { label, meaning } = describeAndroidMessage(match[1], match[2], match[3], match[4]);
    const isViviReply = match[1] === 'Report Power Status' && match[3] === '4';
    return {
      label,
      detail: `Received by the box. Android's CEC service has no handler for it.${meaning}${isViviReply ? ' This is usually the reply to Vivi\'s own Give Device Power Status, which Power.java reads from the CEC registers, so the warning is harmless.' : ''}`,
      intent: 'none'
    };
  }
  match = /Failed to send <([^>]+)> src: (\d+), dst: (\d+).*errorCode=(\d+)/.exec(message);
  if (match) {
    const from = addressName(parseInt(match[2], 10));
    const to = addressName(parseInt(match[3], 10));
    const code = parseInt(match[4], 10);
    return {
      label: `errorCode ${code} = ${SEND_RESULT_LABELS[code] ?? 'error'}, ${match[1]} not delivered`,
      detail: `Android's own CEC service (not Vivi) tried to send ${match[1]} from ${from} to ${to}, but ${SEND_RESULTS[code] ?? `error code ${code}`}.`,
      intent: 'warning'
    };
  }

  // --- Display hotplug / EDID (Android display stack)
  if (name === 'MesonHwc') {
    match = /^Hotplug handle value ([01])\./.exec(message);
    if (match) {
      return match[1] === '0'
        ? {
            label: 'value 0 = HDMI plug out',
            detail: 'Hotplug-detect from the display dropped. Seen when the display goes into standby, reboots its main board, or is unplugged.',
            intent: 'warning'
          }
        : {
            label: 'value 1 = HDMI plug in',
            detail: 'Hotplug-detect from the display is back and the EDID is read next (SystemControl "Rx Manufacturer Name").',
            intent: 'none'
          };
    }
  }
  if (name === 'SystemControl') {
    match = /^Rx Manufacturer Name:\s*(.*)$/.exec(message);
    if (match) {
      const manufacturer = match[1].trim();
      return manufacturer
        ? {
            label: `Display EDID: ${manufacturer}`,
            detail: 'Manufacturer code from the display\'s EDID. The lines that follow give product code, size and the box\'s physical address.',
            intent: 'none'
          }
        : {
            label: 'Empty EDID',
            detail: 'Hotplug is high but the display gave no real EDID. Typical of a display in standby: CEC will not answer and the physical address will be 0000.',
            intent: 'warning'
          };
    }
    match = /^Source Physical Address\[a\.b\.c\.d\]:\s*(\d)\.\d\.\d\.\d/.exec(message);
    if (match && match[1] === '0') {
      return {
        label: 'No physical address',
        detail: 'The display\'s EDID gave the box no HDMI address (0.0.0.0), usually because the display is in standby. CEC power on will fail at Active Source.',
        intent: 'warning'
      };
    }
    if (match) {
      return {
        label: `HDMI input ${match[1]}`,
        detail: 'Physical address the display assigned to the box from its EDID. Used by Active Source.',
        intent: 'none'
      };
    }
  }

  // --- Kernel (dmesg)
  if (logLine.src === 'Dmesg') {
    match = /hdmitx: system: (plugout|plugin)/.exec(message);
    if (match) {
      return match[1] === 'plugout'
        ? {
            label: 'HDMI plug out',
            detail: 'Kernel HDMI driver saw hotplug-detect drop. Seen when the display goes into standby, reboots its main board, or is unplugged. dmesg can miss some of these, logcat MesonHwc lines have them all.',
            intent: 'warning'
          }
        : {
            label: 'HDMI plug in',
            detail: 'Kernel HDMI driver saw hotplug-detect come back.',
            intent: 'none'
          };
    }
    if (/aocec.*bus confl?ict too long/i.test(message)) {
      return {
        label: 'CEC bus conflict',
        detail: 'The CEC line stayed busy too long for the box to transmit. Frames sent at this time may not have reached the display.',
        intent: 'warning'
      };
    }
  }

  // --- vivi-box supervisor (iMX, libcec)
  if (/^(powerOnCec|powerOffCec|setVolumeCec) failed$/.test(message)) {
    return {
      label: message,
      detail: 'libcec reported failure. powerOnCec covers both Image View On (with status polling) and Active Source.',
      intent: 'danger'
    };
  }

  return null;
}
