import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import LogMessage, { ValidatedLogLine } from './components/LogMessage';
import FileInput from './components/FileInput';
import { Navbar, NavbarGroup, NavbarHeading, Alignment, InputGroup } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";

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

  useEffect(() => {
    let currentLogs = allLogs;
    if (searchTerm.trim()) {
      currentLogs = allLogs.filter(({ line }) => line.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredLogs(currentLogs);
  }, [allLogs, searchTerm]);

  return (
    <>
      <Navbar>
        <NavbarGroup align={Alignment.LEFT} style={{ width: '100%' }}>
          <NavbarHeading>Log Viewer</NavbarHeading>
          <InputGroup
            leftIcon="search"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            fill={false}
            id="searchBox"
            data-testid="searchBox"
          />
          <div style={{ marginLeft: 20 }}>
            <label htmlFor="timezoneSelect" style={{ color: 'white', marginRight: 8 }}>Timezone:</label>
            <select
              id="timezoneSelect"
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              style={{ minWidth: 180 }}
            >
              {timezones.map(tz => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ marginLeft: 20 }}>
            <FileInput onLogsLoaded={setAllLogs} />
          </div>
        </NavbarGroup>
      </Navbar>
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
