import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

import { LogLevel, ValidatedLogLine } from './components/LogMessage';
import Sidebar, { logSource } from './components/Sidebar';
import NavbarBar from './components/NavbarBar';
import LogDrawer from './components/LogDrawer';
import LogContainer from './components/LogContainer';

import './index.css';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/datetime2/lib/css/blueprint-datetime2.css";

const App: React.FC = () => {
  // State for all logs and filtered logs
  const [allLogs, setAllLogs] = useState<ValidatedLogLine[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ValidatedLogLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for timezone selection
  const [selectedTimezone, setSelectedTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [timezones, setTimezones] = useState<string[]>([]);
  
  // State for log details drawer
  const [selectedLog, setSelectedLog] = useState<ValidatedLogLine | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // State for sidebar filters
  const [dateRange, setDateRange] = useState<{ start: Date | null, end: Date | null }>({ start: null, end: null });
  const [logSources, setLogSources] = useState<Record<logSource, boolean>>({ Box: false, Syslog: false, Dmesg: false });
  const [severity, setSeverity] = useState<Record<LogLevel, boolean>>({ error: false, warn: false, info: false, verbose: false });

  useEffect(() => {
    const availableTimezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [selectedTimezone];
    setTimezones(availableTimezones);
  }, [selectedTimezone]);

  useEffect(() => {
    let currentLogs = allLogs;

    // Date filtering
    if (dateRange.start || dateRange.end) {
      currentLogs = currentLogs.filter(log => {
        if (!log.valid || !log.parsedLog) return false;
        
        const logDate = log.parsedLog.meta.time_logged;
        if (dateRange.start && logDate < dateRange.start) return false;
        if (dateRange.end && logDate > dateRange.end) return false;

        return true;
      });
    }

    // Search filtering
    if (searchTerm.trim()) {
      currentLogs = currentLogs.filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFilteredLogs(currentLogs);
  }, [allLogs, searchTerm, dateRange]);

  // Set dateRange to oldest/newest log timestamps after logs are loaded
  useEffect(() => {
    if (allLogs.length > 0) {
      const validLogs = allLogs.filter(l => l.valid && l.parsedLog && l.parsedLog.meta.time_logged);
      if (validLogs.length > 0) {
        const times = validLogs.map(l => l.parsedLog.meta.time_logged.getTime());
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        setDateRange(() => ({
          start: new Date(minTime),
          end: new Date(maxTime)
        }));
      }
    }
  }, [allLogs]);

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
        <LogContainer
          logLines={filteredLogs}
          onLogClick={handleLogClick}
          selectedTimezone={selectedTimezone}
        />
        <LogDrawer
          isOpen={drawerOpen}
          onClose={handleDrawerClose}
          selectedLog={selectedLog}
          selectedTimezone={selectedTimezone}
        />
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
