import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';

import { BoxLogEntry, levelProps, LogLevel, SyslogEntry, ValidatedLogLine } from './components/LogMessage';
import Sidebar, { logSource } from './components/Sidebar';
import NavbarBar from './components/NavbarBar';
import LogDrawer from './components/LogDrawer';
import LogContainer from './components/LogContainer';

import './index.css';
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/datetime2/lib/css/blueprint-datetime2.css";

const uiLabelToLogLevel: Record<
  (typeof levelProps)[LogLevel]['label'],
  [BoxLogEntry['level'] | null, SyslogEntry['level']]
> = {
  Verbose: ['verbose', 'V'],
  Info: ['info', 'I'],
  Error: ['error', 'E'],
  Warning: ['warn', 'W'],
  Debug: [null, 'D'] // syslog only
};

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          color: '#721c24',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          margin: '20px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap'
        }}>
          <h2>Something went wrong</h2>
          <p>{this.state.error?.toString()}</p>
          <p>Component stack:</p>
          <pre>{this.state.error?.stack}</pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const [severity, setSeverity] = useState<Record<LogLevel, boolean>>({ error: false, warn: false, info: false, verbose: false, D: false, I: false, W: false, E: false, V: false });
  const [onlyShowMatching, setOnlyShowMatching] = useState(true);
  const [scrollToIndex, setScrollToIndex] = useState<number | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [matchIndex, setMatchIndex] = useState<number>(0);
  const [matchIndexes, setMatchIndexes] = useState<number[]>([]);

  useEffect(() => {
    const availableTimezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [selectedTimezone];
    setTimezones(availableTimezones);
  }, [selectedTimezone]);

  useEffect(() => {
    let currentLogs = allLogs;

    /* 
     * Log source filtering
     * 
     * TODO: Fix types for Object.entries
     */
    const selectedSources = Object.entries(logSources)
      .filter(([_, isSelected]) => isSelected)
      .map(([source]) => source as logSource);

    if (selectedSources.length > 0) {
      currentLogs = currentLogs.filter(log => selectedSources.includes(log.src));
    }

    // Date filtering
    if (dateRange.start || dateRange.end) {
      currentLogs = currentLogs.filter(log => {
        if (!log.parsedLog) return false;
        
        const logDate = log.parsedLog.meta.time_logged;
        if (dateRange.start && logDate < dateRange.start) return false;
        if (dateRange.end && logDate > dateRange.end) return false;

        return true;
      });
    }

    /* 
     * Severity level filtering
     * 
     * TODO: Fix types
     */
    const selectedSeverityLabels = Object.entries(severity)
      .filter(([_, isSelected]) => isSelected)
      .map(([level]) => levelProps[level as LogLevel].label);

    if (selectedSeverityLabels.length > 0) {
      const selectedLogLevels = new Set<LogLevel>();
      selectedSeverityLabels.forEach(label => {
        const levels = uiLabelToLogLevel[label] || [];

        // ! FIXME: level is `never` for some reason
        levels.forEach(level => level !== null && selectedLogLevels.add(level));
      });

      if (selectedLogLevels.size > 0) {
        currentLogs = currentLogs.filter(log => {
          return log.parsedLog && selectedLogLevels.has(log.parsedLog.level);
        });
      }
    }

    // Search filtering
    let matches = 0;
    let indexes: number[] = [];
    if (searchTerm.trim()) {
      indexes = currentLogs
        .map((log, idx) => log.line.toLowerCase().includes(searchTerm.toLowerCase()) ? idx : -1)
        .filter(idx => idx !== -1);
      matches = indexes.length;
      setMatchIndexes(indexes);

      if (onlyShowMatching) {
        currentLogs = currentLogs.filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()));
        setScrollToIndex(null);
        setMatchIndex(0);
      } else {
        // Find first matching index in filtered logs
        const idx = indexes[0];
        setScrollToIndex(idx >= 0 ? idx : null);
        setMatchIndex(0);
      }
    } else {
      setScrollToIndex(null);
      setMatchIndexes([]);
      setMatchIndex(0);
    }
    setMatchCount(matches);
    setFilteredLogs(currentLogs);
  }, [allLogs, logSources, searchTerm, severity, dateRange, onlyShowMatching]);

  // When matchIndex changes, scroll to the new match (only when not onlyShowMatching)
  useEffect(() => {
    if (!onlyShowMatching && matchIndexes.length > 0 && typeof matchIndex === 'number') {
      setScrollToIndex(matchIndexes[matchIndex] ?? matchIndexes[0]);
    }
  }, [matchIndex, matchIndexes, onlyShowMatching]);

  // Set dateRange to oldest/newest log timestamps after logs are loaded
  // useEffect(() => {
  //   if (allLogs.length > 0) {
  //     const validLogs = allLogs.filter(l => l.valid && l.parsedLog && l.parsedLog.meta.time_logged);
  //     if (validLogs.length > 0) {
  //       const times = validLogs.map(l => l.parsedLog.meta.time_logged.getTime());
  //       const minTime = Math.min(...times);
  //       const maxTime = Math.max(...times);
  //       setDateRange(() => ({
  //         start: new Date(minTime),
  //         end: new Date(maxTime)
  //       }));
  //     }
  //   }
  // }, [allLogs]);

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

  const handlePrevMatch = () => {
    setMatchIndex(idx => {
      if (!matchIndexes.length) return 0;
      return idx > 0 ? idx - 1 : 0;
    });
  };

  const handleNextMatch = () => {
    setMatchIndex(idx => {
      if (!matchIndexes.length) return 0;
      return idx < matchIndexes.length - 1 ? idx + 1 : idx;
    });
  };

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
          onlyShowMatching={onlyShowMatching}
          setOnlyShowMatching={setOnlyShowMatching}
          matchCount={searchTerm.trim() ? matchCount : undefined}
          onPrevMatch={handlePrevMatch}
          onNextMatch={handleNextMatch}
          showNavButtons={!!searchTerm.trim() && !onlyShowMatching && matchCount > 0}
          matchIndex={matchIndex}
        />
        <LogContainer
          logLines={filteredLogs}
          onLogClick={handleLogClick}
          selectedTimezone={selectedTimezone}
          scrollToIndex={scrollToIndex}
          searchTerm={searchTerm}
          onlyShowMatching={onlyShowMatching}
          matchIndex={matchIndex}
          matchIndexes={matchIndexes}
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
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element");
}
