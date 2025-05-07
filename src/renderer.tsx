import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LogMessage, { logSchema, ValidatedLogLine } from './components/LogMessage';

console.log('👋 This message is being logged by "renderer.tsx", included via Vite');

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
        } catch (err) {
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
