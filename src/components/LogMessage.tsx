import React, { useState } from 'react';
import { z } from 'zod';

// Zod schema for log validation
export const logSchema = z.object({
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

type LogEntry = z.infer<typeof logSchema>;
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

const LogMessage: React.FC<{ logLine: ValidatedLogLine; selectedTimezone: string }> = ({ logLine, selectedTimezone }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!logLine.line.trim()) return null;

  if (!logLine.valid || !logLine.parsedLog) {
    return (
      <div className="log-message log-invalid">
        <span className="log-invalid-label">[UNSUPPORTED FORMAT]</span> {escapeHtml(logLine.line)}
        {logLine.error && <span className="log-error-detail"> Error: {logLine.error}</span>}
      </div>
    );
  }

  const log = logLine.parsedLog;
  const levelColors: Record<LogEntry['level'], string> = {
    verbose: '#9e9e9e',
    info: '#2196f3',
    error: '#f44336',
  };
  const levelColor = levelColors[log.level] || '#fff'; // Fallback color

  let formattedTime = '';
  if (log.meta?.time_logged) {
    try {
      const date = new Date(log.meta.time_logged);
      formattedTime = new Intl.DateTimeFormat('default', {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: selectedTimezone,
      }).format(date);
    } catch (e) {
      console.error("Error formatting time: ", e);
    }
  }

  const time = formattedTime ? <span className='log-time'>{escapeHtml(formattedTime)}</span> : null;
  const name = log.meta?.name ? <span className='log-name'>{escapeHtml(log.meta.name)}</span> : null;
  const message = <span className='log-message-main' data-level={log.level} style={{ color: levelColor }}>{escapeHtml(log.message)}</span>;
  const commonMeta = <> <span className='log-meta-label'>pid:</span><span className='log-meta'>{escapeHtml(String(log.meta.pid))}</span> <span className='log-meta-label'>ver:</span><span className='log-meta'>{escapeHtml(log.meta.version)}</span></>;

  const toggleExpand = () => {
    if (log.payload) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div
      className={`log-message log-valid log-level-${log.level} ${log.payload ? 'log-collapsible' : ''}`}
      onClick={toggleExpand}
      data-expanded={isExpanded}
    >
      {time} {name} {message}{commonMeta}
      {log.payload && isExpanded && (
        <div className="log-payload-container">
          <span className='log-payload-label'> payload:</span>
          <pre className='log-payload'>{escapeHtml(JSON.stringify(log.payload, null, 2))}</pre>
        </div>
      )}
    </div>
  );
};

export default LogMessage;
