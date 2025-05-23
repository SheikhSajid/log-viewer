import React from 'react';
import LogMessage, { ValidatedLogLine } from './LogMessage';

interface LogContainerProps {
  filteredLogs: ValidatedLogLine[];
  onLogClick: (log: ValidatedLogLine) => void;
  selectedTimezone: string;
}

const LogContainer: React.FC<LogContainerProps> = ({ filteredLogs, onLogClick, selectedTimezone }) => {
  return (
    <div id="logDisplayReact">
      {filteredLogs.map((logLine) => (
        <div key={logLine.id} onClick={() => onLogClick(logLine)} style={{ cursor: 'pointer' }}>
          <LogMessage logLine={logLine} selectedTimezone={selectedTimezone} />
        </div>
      ))}
    </div>
  );
};

export default LogContainer;
