import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { Drawer, Card, H4, Callout, Code, Divider } from "@blueprintjs/core";
import LogMessage, { LogLevel, ValidatedLogLine } from './components/LogMessage';
import Sidebar, { logSource } from './components/Sidebar';
import NavbarBar from './components/NavbarBar';

import './index.css';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/datetime2/lib/css/blueprint-datetime2.css";

console.log('👋 This message is being logged by "renderer.tsx", included via Vite');

const App: React.FC = () => {
  const [allLogs, setAllLogs] = useState<ValidatedLogLine[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ValidatedLogLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezones, setTimezones] = useState<string[]>([]);
  const [selectedLog, setSelectedLog] = useState<ValidatedLogLine | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [logSources, setLogSources] = useState<Record<logSource, boolean>>({ Box: false, Syslog: false, Dmesg: false });
  const [severity, setSeverity] = useState<Record<LogLevel, boolean>>({ error: false, warn: false, info: false, verbose: false });

  useEffect(() => {
    const availableTimezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [selectedTimezone];
    setTimezones(availableTimezones);
  }, [selectedTimezone]);

  useEffect(() => {
    let currentLogs = allLogs;
    if (searchTerm.trim()) {
      currentLogs = allLogs.filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredLogs(currentLogs);
  }, [allLogs, searchTerm]);

  const handleLogClick = (log: ValidatedLogLine) => {
    setSelectedLog(log);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedLog(null);
  };

  // Sidebar filter handlers
  const handleSourceChange = (source: logSource) => setLogSources(s => ({ ...s, [source]: !s[source] }));
  const handleSeverityChange = (level: LogLevel) => setSeverity(s => ({ ...s, [level]: !s[level] }));

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f8f9fa' }}>
      <Sidebar
        dateRange={dateRange}
        setDateRange={setDateRange}
        logSources={logSources}
        handleSourceChange={handleSourceChange}
        severity={severity}
        handleSeverityChange={handleSeverityChange}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <NavbarBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedTimezone={selectedTimezone}
          setSelectedTimezone={setSelectedTimezone}
          timezones={timezones}
          onLogsLoaded={setAllLogs}
        />
        <div id="logDisplayReact">
          {filteredLogs.map((logLine) => (
            <div key={logLine.id} onClick={() => handleLogClick(logLine)} style={{ cursor: 'pointer' }}>
              <LogMessage logLine={logLine} selectedTimezone={selectedTimezone} />
            </div>
          ))}
        </div>
        <Drawer
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
          position="right"
          size="60vw"
          title="Log Details"
        >
          {selectedLog && selectedLog.valid && selectedLog.parsedLog && (
            <Card style={{ margin: 0 }}>
              <H4>Log Details</H4>
              <Divider />
              <div style={{ marginBottom: 10 }}>
                <b>Timestamp:</b> {new Intl.DateTimeFormat('default', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: selectedTimezone }).format(new Date(selectedLog.parsedLog.meta.time_logged))}
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Level:</b> <Callout intent={selectedLog.parsedLog.level === 'error' ? 'danger' : selectedLog.parsedLog.level === 'warn' ? 'warning' : selectedLog.parsedLog.level === 'info' ? 'primary' : 'none'}>{selectedLog.parsedLog.level}</Callout>
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Source:</b> {selectedLog.parsedLog.meta.name}
              </div>
              <div style={{ marginBottom: 10 }}>
                <b>Message:</b> <Code style={{ whiteSpace: 'pre-wrap' }}>{selectedLog.parsedLog.message}</Code>
              </div>
              <Divider />
              {/* <div style={{ marginBottom: 10 }}>
                <b>Stack Trace:</b>
                {selectedLog.parsedLog.payload && (selectedLog.parsedLog.payload as any).stack ? (
                  <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{(selectedLog.parsedLog.payload as any).stack}</pre>
                ) : (
                  <span style={{ color: '#888' }}>N/A</span>
                )}
              </div> */}
              <Divider />
              <div style={{ marginBottom: 10 }}>
                <b>Additional Data:</b>
                <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{JSON.stringify(selectedLog.parsedLog.payload, null, 2)}</pre>
              </div>
              <Divider />
              <div style={{ marginBottom: 10 }}>
                <b>Meta:</b>
                <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{JSON.stringify(selectedLog.parsedLog.meta, null, 2)}</pre>
              </div>
              <Divider />
              <div style={{ marginBottom: 10 }}>
                <b>Raw Line:</b>
                <pre style={{ background: '#1a1a1a', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4, overflowX: 'auto' }}>{selectedLog.line}</pre>
              </div>
            </Card>
          )}
          {selectedLog && (!selectedLog.valid || !selectedLog.parsedLog) && (
            <Callout intent="danger">Invalid log format</Callout>
          )}
        </Drawer>
      </div>
    </div>
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
