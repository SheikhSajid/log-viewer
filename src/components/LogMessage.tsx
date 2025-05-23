import React from 'react';
import { z } from 'zod';
import { Text, Tag, Tooltip } from "@blueprintjs/core";

// Zod schema for log validation
export const logSchema = z.object({
  level: z.enum(['verbose', 'info', 'error', 'warn']),
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

type LogEntry = z.infer<typeof logSchema>;
export type LogLevel = LogEntry['level'];

export interface ValidatedLogLine {
  valid: boolean;
  line: string;
  parsedLog?: LogEntry;
  error?: string;
  id: string; // Unique ID for React key
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

const levelProps: Record<LogLevel, { color: string; label: string }> = {
  verbose: { color: '#9e9e9e', label: 'Verbose' },
  info: { color: '#2196f3', label: 'Info' },
  error: { color: '#f44336', label: 'Error' },
  warn: { color: '#ff9800', label: 'Warning' },
};

const LogMessage: React.FC<{ logLine: ValidatedLogLine; selectedTimezone: string }> = ({ logLine, selectedTimezone }) => {
  if (!logLine.line.trim()) return null;

  if (!logLine.valid || !logLine.parsedLog) {
    return (
      <div style={{ padding: '12px 0', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', fontFamily: 'monospace', fontSize: 14 }}>
        <Tag minimal intent="danger" style={{ marginRight: 8, minWidth: 8, height: 16, background: '#e53935' }} />
        <Text style={{ fontWeight: 600, color: '#d9534f' }}>[UNSUPPORTED FORMAT]</Text> <Text style={{ marginLeft: 8 }}>{escapeHtml(logLine.line)}</Text>
      </div>
    );
  }

  const log = logLine.parsedLog;
  const level = levelProps[log.level];

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
        background: '#fff',
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
        {/* Message/Content */}
        <div style={{ color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {log.message}
        </div>
      </div>
    </>
  );
};

export default LogMessage;
