import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { z } from 'zod';

console.log('👋 This message is being logged by "renderer.tsx", included via Vite');

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

type LogEntry = z.infer<typeof logSchema>;
interface ValidatedLogLine {
  valid: boolean;
  line: string;
  parsedLog?: LogEntry;
  error?: string;
  id: string; // Unique ID for React key
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, function (m) { // Removed unnecessary escapes for " and '
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

const App: React.FC = () => {
  const [allLogs, setAllLogs] = useState<ValidatedLogLine[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ValidatedLogLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezones, setTimezones] = useState<string[]>([]);

  useEffect(() => {
    const availableTimezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [selectedTimezone];
    setTimezones(availableTimezones);
  }, [selectedTimezone]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const processedLines = lines.map((line, index) => {
        const id = `log-${Date.now()}-${index}`; // Simple unique ID
        if (!line.trim()) return { valid: false, line, id };
        try {
          const parsed = JSON.parse(line);
          const validationResult = logSchema.safeParse(parsed);
          if (validationResult.success) {
            return { valid: true, line, parsedLog: validationResult.data, id };
          } else {
            // Log Zod error for debugging, but show generic error to user
            console.error("Zod validation error:", validationResult.error.flatten());
            return { valid: false, line, error: "Schema validation failed", id };
          }
        } catch (err) { // Changed type from any to unknown
          let errorMessage = "JSON parsing failed";
          if (err instanceof Error) {
            errorMessage = err.message;
          }
          return { valid: false, line, error: errorMessage, id };
        }
      });
      setAllLogs(processedLines);
    };
    reader.readAsText(file);
  }, []);

  useEffect(() => {
    let currentLogs = allLogs;
    if (searchTerm.trim()) {
      currentLogs = allLogs.filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredLogs(currentLogs);
  }, [allLogs, searchTerm]);


  return (
    <>
      <input type="file" id="logFileInput" accept=".txt,.log,.json" onChange={handleFileChange} />
      <div id="timezoneControls" style={{ marginBottom: '1em' }}>
        <label htmlFor="timezoneSelect">Timezone:</label>
        <select id="timezoneSelect" value={selectedTimezone} onChange={(e) => setSelectedTimezone(e.target.value)}>
          {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
        </select>
      </div>
      <div id="logControls">
        <input
          type="text"
          id="searchBox"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div id="logDisplayReact" style={{ background: '#222', color: '#eee', padding: '1em', minHeight: '400px', overflow: 'auto' }}>
        {filteredLogs.map((logLine) => (
          <LogMessage key={logLine.id} logLine={logLine} selectedTimezone={selectedTimezone} />
        ))}
      </div>
    </>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element");
}
