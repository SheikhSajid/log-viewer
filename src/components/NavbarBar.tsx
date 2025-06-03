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
  onlyShowMatching: boolean;
  setOnlyShowMatching: (val: boolean) => void;
}

const NavbarBar: React.FC<NavbarBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedTimezone,
  setSelectedTimezone,
  timezones,
  onLogsLoaded,
  onlyShowMatching,
  setOnlyShowMatching
}) => (
  <Navbar style={{ height: 65 }}>
    <NavbarGroup align={Alignment.START} style={{ height: 65, width: '100%' }}>
      <NavbarHeading>Log Viewer</NavbarHeading>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: 12 }}>
        <InputGroup
          leftIcon="search"
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          fill={false}
          id="searchBox"
          data-testid="searchBox"
        />
        <label style={{ marginTop: 4, display: 'flex', alignItems: 'center', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={onlyShowMatching}
            onChange={e => setOnlyShowMatching(e.target.checked)}
            style={{ marginRight: 6 }}
            id="onlyShowMatching"
            data-testid="onlyShowMatching"
          />
          only show logs that match search term
        </label>
      </div>
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
