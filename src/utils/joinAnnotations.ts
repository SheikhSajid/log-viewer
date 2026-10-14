import type { ValidatedLogLine } from '../components/LogMessage';
import type { CecAnnotation } from './cecAnnotations';

// Pills for the box log messages produced while a client (app/browser) joins a box:
// socket connects, handshakes (app/features/handshake*.ts), then socket-server registers the client.

export type JoinAnnotation = CecAnnotation;

const FAILURES: Record<string, JoinAnnotation> = {
  'failed: room code missing or wrong': {
    label: 'Join failed: room code',
    detail: 'The box needs a room code and the client sent none, or a wrong one. The client then asks the user for it and retries.',
    intent: 'danger'
  },
  'failed: user not authenticated': {
    label: 'Join failed: not authenticated',
    detail: 'The cloud rejected the user\'s token (401), or the box is offline and the client did not pass the offline challenge. The box disconnects the client.',
    intent: 'danger'
  },
  'failed: offline challenge failed': {
    label: 'Join failed: offline challenge',
    detail: 'The box has no internet, so it relies on the client signing a challenge, and the client did not pass it. The box disconnects the client.',
    intent: 'danger'
  },
  'failed: chain is broken': {
    label: 'Join failed: box chain broken',
    detail: 'The box is part of a chain of boxes and a link is down, so it refuses new clients until the chain recovers.',
    intent: 'danger'
  },
  'failed: remote but box is not containerised': {
    label: 'Join failed: remote not allowed',
    detail: 'A remote client (not on the box\'s network) tried to join, but this box only accepts remote clients when it runs containerised.',
    intent: 'danger'
  },
  'failed: session_id is taken': {
    label: 'Join failed: session id taken',
    detail: 'The client claimed a session id that is already in use by a client on a different IP address, so the box refused it.',
    intent: 'danger'
  },
  'failed: bad client data': {
    label: 'Join failed: bad handshake data',
    detail: 'The handshake data from the client could not be processed. The error is in the raw line.',
    intent: 'danger'
  },
  'failed: unable to handshake': {
    label: 'Join failed: handshake error',
    detail: 'Something threw while the box was handling the handshake. The error is in the raw line.',
    intent: 'danger'
  },
  'failed: client disconnected before callback': {
    label: 'Client left during handshake',
    detail: 'The client dropped its connection before the box could answer the handshake, so no reply was sent.',
    intent: 'warning'
  }
};

const HANDSHAKE_STEPS: Record<string, JoinAnnotation> = {
  'using handshake V2': {
    label: 'Handshake received',
    detail: 'A client sent its handshake. It is sent twice per join: the first attempt gets a challenge back, the second one carries the signed challenge.',
    intent: 'none'
  },
  'creating handshake challenge': {
    label: 'Challenge issued',
    detail: 'The first handshake had no signed challenge, so the box asked the client to sign one and try again.',
    intent: 'none'
  },
  'successful online user check': {
    label: 'User verified (online)',
    detail: 'The cloud confirmed the user\'s token. The client is registered right after this.',
    intent: 'success'
  },
  'using user offline authentication': {
    label: 'User verified (offline)',
    detail: 'The box could not use the cloud (no internet, or it was unreachable), so it accepted the client\'s signed challenge and identity instead.',
    intent: 'none'
  },
  'successful online guest check': {
    label: 'Guest verified (online)',
    detail: 'The cloud confirmed the guest. The client is registered right after this.',
    intent: 'success'
  },
  'using guest offline authentication': {
    label: 'Guest verified (offline)',
    detail: 'The box could not use the cloud, so it accepted the guest\'s signed challenge and identity instead.',
    intent: 'none'
  }
};

// The extra fields passed to the logger. Box logs have them at the top level, syslog "Logger"
// lines wrap them in "params" inside the JSON message.
function getFields(logLine: ValidatedLogLine): Record<string, any> {
  try {
    if (logLine.src === 'Box') return JSON.parse(logLine.line);
    const start = logLine.line.indexOf('{');
    return start >= 0 ? JSON.parse(logLine.line.slice(start)).params ?? {} : {};
  } catch {
    return {};
  }
}

export function getJoinAnnotation(logLine: ValidatedLogLine): JoinAnnotation | null {
  if (!logLine.valid || !logLine.parsedLog) return null;
  const { message } = logLine.parsedLog;
  const name = logLine.parsedLog.meta.name;

  if (name === 'handshake') {
    return FAILURES[message] ?? HANDSHAKE_STEPS[message] ?? null;
  }

  if (name !== 'socket-server') return null;

  if (message === 'connection') {
    const fields = getFields(logLine);
    const where = [fields.connectionType, fields.ip].filter(Boolean).join(', ');
    return {
      label: where ? `Client connecting (${where})` : 'Client connecting',
      detail: 'A client opened a socket to the box. It still has to pass the handshake before it counts as joined. "remote" connections come in from outside the box\'s network.',
      intent: 'none'
    };
  }

  if (message === 'registered') {
    const client = getFields(logLine).client ?? {};
    const role = client.guest ? 'guest' : client.presenter ? 'presenter' : 'student';
    const traits = [client.platform, role, client.remote ? 'remote' : null].filter(Boolean).join(', ');
    const who = client.name || client.user_id;
    const identity = [
      client.user_id ? `user ${client.user_id}` : null,
      client.id ? `session ${client.id}` : null,
      client.ip ? `from ${client.ip}` : null
    ].filter(Boolean).join(', ');
    return {
      label: who ? `${who} joined${traits ? ` (${traits})` : ''}` : 'Client joined',
      detail: `The handshake passed and the box registered the client${identity ? ` (${identity})` : ''}. This is logged again every time the same client reconnects, so on its own it does not tell a new arrival from a reconnect: look for the same session id.`,
      intent: 'success'
    };
  }

  if (message === 'disconnect') {
    return {
      label: 'Client disconnected',
      detail: 'A client\'s socket closed. Match the socket_id with the "connection" and "registered" lines to see which client left.',
      intent: 'none'
    };
  }

  return null;
}
