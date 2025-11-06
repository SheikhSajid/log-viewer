import React from 'react';
import { z } from 'zod';
import { Text, Tag, Tooltip, Collapse, Pre, Button } from "@blueprintjs/core";
import { logSource } from './Sidebar';

// box log schema
export const logSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string(),
    stack: z.string()
  }).optional(),
  level: z.enum(['verbose', 'info', 'error', 'warn']),
  message: z.string(),
  meta: z.object({
    mac_address: z.string(),
    name: z.string(),
    org_id: z.string(),
    pid: z.number(),
    process: z.string(),
    time_logged: z.string().transform((str) => new Date(str)),
    version: z.string().optional(),
  }),
  payload: z.unknown().optional(),
});

// Logger message schema (for syslog Logger entries)
export const loggerJsonSchema = z.object({
  meta: z.object({
    box_guid: z.string().optional(),
    org_id: z.string().optional(),
    mac_address: z.string().optional(),
    name: z.string(),
  }),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  message: z.string(),
  params: z.unknown().optional()
});

export const ReceptionistParamsSchema = z.object({
  type: z.string().optional(),
  // payload: z.object({}).optional()
});

// syslog schema
export const syslogSchema = z.object({
  level: z.enum(['D', 'I', 'W', 'E', 'V']),
  message: z.string(),
  meta: z.object({
    name: z.string(),
    tid: z.string().transform((str) => parseInt(str, 10)),
    pid: z.string().transform((str) => parseInt(str, 10)),
    time_logged: z.string().transform((str) => new Date(str)),
  }),
});

export type BoxLogEntry = z.infer<typeof logSchema>;
export type SyslogEntry = z.infer<typeof syslogSchema>;
export type LogLevel = BoxLogEntry['level'] | SyslogEntry['level'];

export interface ValidatedLogLine {
  valid: boolean;
  line: string;
  parsedLog?: BoxLogEntry | SyslogEntry;
  error?: string;
  id: string; // Unique ID for React key
  src: logSource
}

export function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, function (m) {
    switch (m) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case "'": return '&#39;';
      default: return m;
    }
  });
}

export const levelProps: Record<LogLevel, { color: string; label: 'Verbose' | 'Info' | 'Error' | 'Warning' | 'Debug' }> = {
  // box logs
  verbose: { color: '#9e9e9e', label: 'Verbose' },
  info: { color: '#2196f3', label: 'Info' },
  error: { color: '#f44336', label: 'Error' },
  warn: { color: '#ff9800', label: 'Warning' },

  // syslog
  V: { color: '#9e9e9e', label: 'Verbose' },
  I: { color: '#2196f3', label: 'Info' },
  E: { color: '#f44336', label: 'Error' },
  W: { color: '#ff9800', label: 'Warning' },
  D: { color: '#9e9e9e', label: 'Debug' }
};

const SOCKET_SERVER_EVENT_TAG = 'Socket Server Event';
const SOCKET_SERVER_LOG_PREFIXES = [
  'update sockets connecting',
  'stream stop',
  'video stop',
  'widget stop',
  'port-check stop',
  'stop',
  'stream join',
  'video start',
  'widget start',
  'preview connect',
  'stream custom',
  'stream freeze',
  'stream hibernate',
  'stream hide',
  'stream move',
  'stream smoothness',
  'webrtc receive message',
  'timer adjust',
  'timer hide',
  'timer pause',
  'timer position',
  'timer reset',
  'timer show',
  'timer start',
  'local video pre response',
  'video custom',
  'video error_set',
  'video get_preview_url',
  'video next',
  'video pause',
  'video play',
  'video previous',
  'video seek',
  'video select',
  'video subtitles',
  'widget lap',
  'widget pause',
  'widget play',
  'widget reset',
  'screenshot',
  'screenshot fullscreen',
  'set mute',
  'set volume',
  'chain established',
  'chain broken',
  'announcements video init device',
  'announcements video setup transport and consumer',
  'announcements video stop',
  'first presenter id'
];

function isSocketServerEvent(logLine: ValidatedLogLine) {
  // Only for logs from manager
  if (!logLine.valid || !logLine.parsedLog) return false;
  const meta = logLine.parsedLog.meta;
  if (!meta || meta.name !== 'manager') return false;
  const msg = logLine.parsedLog.message;
  // Check if message starts with any known event handler log
  return SOCKET_SERVER_LOG_PREFIXES.some(prefix => msg.startsWith(prefix));
}

const TAG_COLORS: Record<string, string> = {
  'Multi Video Player': '#8e44ad',
  'Socket Server Event': '#16a085',
  'v': '#3498db',
  'process': '#2ecc71'
};

const DEFAULT_TAG_STYLE = {
  background: '#95a5a6',
  color: '#fff',
  border: 'none'
};

const LogMessage: React.FC<{ logLine: ValidatedLogLine; selectedTimezone: string; highlight?: boolean; isCurrentMatch?: boolean }> = ({ logLine, selectedTimezone, highlight, isCurrentMatch }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  if (!logLine.line.trim()) return null;

  if (!logLine.valid || !logLine.parsedLog) {
    return (
      <div style={{ padding: '12px 0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 14, maxWidth: '100%', overflowX: 'auto' }}>
        <Tag minimal intent="danger" style={{ marginRight: 8, minWidth: 8, height: 16, background: '#e53935', flexShrink: 0 }} />
        <Text style={{ fontWeight: 600, color: '#d9534f', whiteSpace: 'nowrap' }}>[UNSUPPORTED FORMAT]</Text>
        <Text style={{ marginLeft: 8, whiteSpace: 'pre', fontFamily: 'monospace' }}>{escapeHtml(logLine.line)}</Text>
        {logLine.parsedLog && 'error' in logLine.parsedLog && logLine.parsedLog.error?.stack && (
          <div style={{ marginTop: 8, marginLeft: 28 }}>
            <Button
              small
              minimal
              rightIcon={isExpanded ? 'chevron-up' : 'chevron-down'}
              onClick={() => setIsExpanded(!isExpanded)}
              style={{ padding: 0, color: '#8a9ba8' }}
            >
              {isExpanded ? 'Hide stack trace' : 'Show stack trace'}
            </Button>
            <Collapse isOpen={isExpanded}>
              <Pre style={{
                background: '#f5f8fa',
                padding: '8px',
                borderRadius: '4px',
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                color: '#5c7080',
                fontFamily: 'monospace',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                {logLine.parsedLog.error.stack}
              </Pre>
            </Collapse>
          </div>
        )}
      </div>
    );
  }

  const log = logLine.parsedLog;
  const level = levelProps[log.level];

  // Tag computation logic
  const tags: string[] = [];
  if (logLine.valid && logLine.parsedLog) {
    const service = logLine.parsedLog.meta.name;
    if ('version' in log.meta) {
      tags.push(`v${log.meta.version}`);
    }
    if ('process' in log.meta && log.meta.process !== 'box') {
      tags.push(log.meta.process);
    }
    if (service === 'manager' && logLine.parsedLog.message.startsWith('video event')) {
      tags.push('Multi Video Player');
    }
    if (isSocketServerEvent(logLine)) {
      tags.push(SOCKET_SERVER_EVENT_TAG);
    }
  }

  // Table-like row layout
  return (
    <>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 220px 220px 1fr',
        alignItems: 'center',
        fontFamily: 'monospace',
        fontSize: 14,
        padding: '0 0',
        minHeight: 32,
        borderBottom: '1px solid #eee',
        background: isCurrentMatch ? 'rgba(255,165,0,0.3)' : (highlight ? 'rgba(255,255,0,0.18)' : '#fff'),
        cursor: 'pointer',
      }}>
        {/* Level indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Tooltip content={level.label} position="right">
            <Tag minimal style={{ background: level.color, minWidth: 8, height: 16, borderRadius: 4, marginRight: 0, padding: 0 }} />
          </Tooltip>
        </div>
        {/* Date/time */}
        <div style={{ color: '#222', whiteSpace: 'pre', fontWeight: 500 }}>{log.meta && log.meta.time_logged ? new Date(log.meta.time_logged).toLocaleString('en-CA', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: selectedTimezone }) + '.' + String(new Date(log.meta.time_logged).getMilliseconds()).padStart(3, '0') : ''}</div>
        {/* Host */}
        <div style={{ color: '#222', overflow: 'hidden', textOverflow: 'ellipsis' }} title={log.meta.name}>{log.meta.name}</div>
        {/* Message/Content + Tags */}
        <div style={{ color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}>
          {tags.length > 0 && (
            <span style={{ display: 'flex', gap: 4 }}>
              {tags.map((tag, idx) => (
                <Tag
                  key={idx}
                  minimal
                  style={{
                    marginLeft: 0,
                    marginRight: 4,
                    opacity: 0.8,
                    fontSize: 11,
                    height: 18,
                    lineHeight: '16px',
                    padding: '0 6px',
                    ...(TAG_COLORS[tag] 
                      ? { 
                          background: TAG_COLORS[tag],
                          color: '#fff',
                          ...(tag.startsWith('v') ? { fontSize: '10px', padding: '0 4px' } : {})
                        }
                      : {
                          // For version and process tags
                          ...(tag.startsWith('v') 
                            ? { 
                                background: TAG_COLORS['v'], 
                                color: '#fff',
                                fontSize: '10px',
                                padding: '0 4px'
                              }
                            : tag === 'process' 
                              ? { 
                                  background: TAG_COLORS['process'], 
                                  color: '#fff' 
                                }
                              : DEFAULT_TAG_STYLE)
                        })
                  }}
                >
                  {tag}
                </Tag>
              ))}
            </span>
          )}
          <span
            style={{
              color: level.color,
              ...(isCurrentMatch
                ? {
                    fontWeight: 700,
                    color: '#d2691e',
                    borderRadius: 3,
                    padding: '0 2px'
                  }
                : highlight
                ? {
                    fontWeight: 700,
                    borderRadius: 3,
                    padding: '0 2px'
                  }
                : {})
            }}
          >
            {'error' in log && log.error ? (
              <>
                <Tag minimal intent="danger" style={{ marginRight: 8, height: 18, lineHeight: '16px' }}>
                  {log.error.message}
                </Tag>
                {log.message}
              </>
            ) : (
              log.message
            )}
          </span>
        </div>
      </div>
    </>
  );
};

export default LogMessage;
