import React from 'react';
import { Navbar, NavbarGroup, NavbarHeading, Alignment, InputGroup } from "@blueprintjs/core";
import FileInput from './FileInput';
import { ValidatedLogLine } from './LogMessage';

interface NavbarBarProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedTimezone: string;
  setSelectedTimezone: (tz: string) => void;
  timezones: string[];
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
}

const NavbarBar: React.FC<NavbarBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedTimezone,
  setSelectedTimezone,
  timezones,
  onLogsLoaded
}) => (
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
        <FileInput onLogsLoaded={onLogsLoaded} />
      </div>
    </NavbarGroup>
  </Navbar>
);

export default NavbarBar;
