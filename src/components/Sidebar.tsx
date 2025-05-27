import React, { useState, useEffect } from 'react';
import { H5, Button, Checkbox } from "@blueprintjs/core";
import { DateInput3 } from "@blueprintjs/datetime2";
import { LogLevel } from './LogMessage';

type logSource = 'Box' | 'Syslog' | 'Dmesg';

interface SidebarProps {
  dateRange: { start: Date | null, end: Date | null };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: Date | null, end: Date | null }>>;
  logSources: Record<logSource, boolean>;
  handleSourceChange: (source: logSource) => void;
  severity: Record<LogLevel, boolean>;
  handleSeverityChange: (level: LogLevel) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  dateRange,
  setDateRange,
  logSources,
  handleSourceChange,
  severity,
  handleSeverityChange
}) => {
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: Date | null, end: Date | null }>({ ...dateRange });

  // Keep selectedDateRange in sync with dateRange prop
  useEffect(() => { setSelectedDateRange({ ...dateRange }); }, [dateRange]);

  return (
    <div style={{ background: '#fff', borderRight: '1px solid #eee', padding: 20, boxSizing: 'border-box', minHeight: '100vh' }}>
      <H5 style={{ marginBottom: 20 }}>Filters</H5>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Date Range</div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>Start Date/Time</div>
        <DateInput3
          closeOnSelection={false}
          formatDate={(date: Date) => date.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          parseDate={(str: string) => new Date(str)}
          placeholder="Start Date/Time"
          showActionsBar={true}
          showTimezoneSelect={false}
          timePickerProps={{ useAmPm: true }}
          value={selectedDateRange.start ? selectedDateRange.start.toISOString() : ""}
          onChange={(dateStr: string) => { setSelectedDateRange({ ...selectedDateRange, start: new Date(dateStr)})}}
          timePrecision="minute"
          popoverProps={{ minimal: true }}
          fill
        />
        <div style={{ fontSize: 13, margin: '8px 0 4px 0' }}>End Date/Time</div>
        <DateInput3
          closeOnSelection={false}
          formatDate={(date: Date) => date.toLocaleString('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          parseDate={(str: string) => new Date(str)}
          placeholder="End Date/Time"
          showActionsBar={true}
          showTimezoneSelect={false}
          timePickerProps={{ useAmPm: true }}
          value={selectedDateRange.end ? selectedDateRange.end.toISOString() : ""}
          onChange={(dateStr: string) => { setSelectedDateRange({ ...selectedDateRange, end: new Date(dateStr)})}}
          timePrecision="minute"
          popoverProps={{ minimal: true }}
          fill
        />
        <Button
          intent="primary"
          onClick={() => setDateRange(selectedDateRange)}
          style={{ width: '100%', marginTop: 10, marginBottom: 10 }}
        >
          Apply Range
        </Button>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <Button small minimal>Last 24h</Button>
          <Button small minimal>Last 7d</Button>
          <Button small minimal>Last 30d</Button>
        </div>
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Log Source</div>
        <Checkbox checked={logSources.Box} label="Box" onChange={() => handleSourceChange('Box')} />
        <Checkbox checked={logSources.Syslog} label="Syslog" onChange={() => handleSourceChange('Syslog')} />
        <Checkbox checked={logSources.Dmesg} label="Dmesg" onChange={() => handleSourceChange('Dmesg')} />
      </div>
      <div>
        <div style={{ fontWeight: 500, marginBottom: 6 }}>Severity Level</div>
        <Checkbox checked={severity.error} label="Error" onChange={() => handleSeverityChange('error')} />
        <Checkbox checked={severity.warn} label="Warning" onChange={() => handleSeverityChange('warn')} />
        <Checkbox checked={severity.info} label="Info" onChange={() => handleSeverityChange('info')} />
        <Checkbox checked={severity.verbose} label="Debug" onChange={() => handleSeverityChange('verbose')} />
      </div>
    </div>
  );
};

export default Sidebar;
export type { logSource };
