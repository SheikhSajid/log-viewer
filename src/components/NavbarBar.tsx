import React from 'react';
import { Navbar, NavbarGroup, NavbarHeading, Alignment, InputGroup, Button } from "@blueprintjs/core";
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
  matchCount?: number;
  onPrevMatch?: () => void;
  onNextMatch?: () => void;
  showNavButtons?: boolean;
  matchIndex?: number;
  isFileUploadModalOpen: boolean;
  onFileUploadModalOpenChange: (isOpen: boolean) => void;
}

const NavbarBar: React.FC<NavbarBarProps> = ({
  searchTerm,
  setSearchTerm,
  selectedTimezone,
  setSelectedTimezone,
  timezones,
  onLogsLoaded,
  onlyShowMatching,
  setOnlyShowMatching,
  matchCount,
  onPrevMatch,
  onNextMatch,
  showNavButtons,
  matchIndex,
  isFileUploadModalOpen,
  onFileUploadModalOpenChange
}) => (
  <Navbar style={{ height: 65 }}>
    <NavbarGroup align={Alignment.LEFT} style={{ width: '100%', alignItems: 'flex-start' }}>
      <NavbarHeading>Log Viewer</NavbarHeading>
      <div style={{ display: 'flex', flexDirection: 'column', marginRight: 12, paddingTop: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <InputGroup
            leftIcon="search"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
            fill={false}
            id="searchBox"
            data-testid="searchBox"
          />
          {typeof matchCount === 'number' && (
            <span style={{ marginLeft: 8, color: '#aaa', fontSize: '0.95em', minWidth: 60 }}>
              {matchCount} match{matchCount === 1 ? '' : 'es'}
            </span>
          )}
          {showNavButtons && (
            <span style={{ display: 'flex', alignItems: 'center', marginLeft: 8, gap: 4 }}>
              <Button
                icon="chevron-left"
                minimal
                small
                onClick={onPrevMatch}
                disabled={typeof matchIndex !== 'number' || matchIndex <= 0}
                data-testid="prevMatchBtn"
              />
              <Button
                icon="chevron-right"
                minimal
                small
                onClick={onNextMatch}
                disabled={
                  typeof matchCount !== 'number' ||
                  typeof matchIndex !== 'number' ||
                  matchCount === 0 ||
                  matchIndex >= matchCount - 1
                }
                data-testid="nextMatchBtn"
              />
              {typeof matchIndex === 'number' && typeof matchCount === 'number' && matchCount > 0 && (
                <span style={{ fontSize: '0.95em', color: '#888', marginLeft: 2 }}>
                  {matchIndex + 1}/{matchCount}
                </span>
              )}
            </span>
          )}
        </div>
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
        <FileInput 
        onLogsLoaded={onLogsLoaded} 
        isModalOpen={isFileUploadModalOpen}
        onModalOpenChange={onFileUploadModalOpenChange}
      />
      </div>
    </NavbarGroup>
  </Navbar>
);

export default NavbarBar;
