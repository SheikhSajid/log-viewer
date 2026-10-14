import React, { useState, useEffect } from 'react';
import { H5, Button, Checkbox, Collapse, Icon } from "@blueprintjs/core";
import { DateInput3 } from "@blueprintjs/datetime2";
import { LogLevel, CEC_INTENT_COLORS } from './LogMessage';
import { CecTag } from '../utils/cec';

type logSource = 'Box' | 'Syslog' | 'Dmesg';

interface SidebarProps {
  dateRange: { start: Date | null, end: Date | null };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: Date | null, end: Date | null }>>;
  logSources: Record<logSource, boolean>;
  handleSourceChange: (source: logSource) => void;
  severity: Record<LogLevel, boolean>;
  handleSeverityChange: (level: LogLevel) => void;
  cecTags: CecTag[];
  selectedCecTags: Set<string>;
  handleCecTagChange: (tag: string) => void;
}

// Section with a clickable header that shows/hides its content. Filters keep applying while collapsed,
// so the header shows how many are selected.
const CollapsibleSection: React.FC<{ title: string; activeCount: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ title, activeCount, children, style }) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div style={style}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(open => !open)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsOpen(open => !open); } }}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}
      >
        <Icon icon={isOpen ? 'chevron-down' : 'chevron-right'} size={14} />
        <span>{title}</span>
        {!isOpen && activeCount > 0 && <span style={{ fontWeight: 400, fontSize: 12, color: '#5c7080' }}>({activeCount} selected)</span>}
      </div>
      <Collapse isOpen={isOpen}>{children}</Collapse>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({
  dateRange,
  setDateRange,
  logSources,
  handleSourceChange,
  severity,
  handleSeverityChange,
  cecTags,
  selectedCecTags,
  handleCecTagChange
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
      <CollapsibleSection title="Log Source" activeCount={Object.values(logSources).filter(Boolean).length} style={{ marginBottom: 18 }}>
        <Checkbox checked={logSources.Box} label="Box" onChange={() => handleSourceChange('Box')} />
        <Checkbox checked={logSources.Syslog} label="Syslog" onChange={() => handleSourceChange('Syslog')} />
        <Checkbox checked={logSources.Dmesg} label="Dmesg" onChange={() => handleSourceChange('Dmesg')} />
      </CollapsibleSection>
      <CollapsibleSection title="Severity Level" activeCount={Object.values(severity).filter(Boolean).length}>
        <Checkbox checked={severity.error} label="Error" onChange={() => handleSeverityChange('error')} />
        <Checkbox checked={severity.warn} label="Warning" onChange={() => handleSeverityChange('warn')} />
        <Checkbox checked={severity.info} label="Info" onChange={() => handleSeverityChange('info')} />
        <Checkbox checked={severity.verbose} label="Verbose" onChange={() => handleSeverityChange('verbose')} />
        <Checkbox checked={severity.D} label="Debug (Syslog only)" onChange={() => handleSeverityChange('D')} />
      </CollapsibleSection>
      <CollapsibleSection title="CEC" activeCount={selectedCecTags.size} style={{ marginTop: 18 }}>
        {cecTags.length === 0 ? (
          <div style={{ fontSize: 13, color: '#5c7080' }}>No CEC tags detected</div>
        ) : (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {cecTags.map(({ tag, count, intent }) => (
              <Checkbox
                key={tag}
                checked={selectedCecTags.has(tag)}
                onChange={() => handleCecTagChange(tag)}
                labelElement={
                  <span title={tag} style={{ fontSize: 13 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, marginRight: 6, background: CEC_INTENT_COLORS[intent] }} />
                    {tag} <span style={{ color: '#5c7080', fontSize: 12 }}>({count.toLocaleString()})</span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
};

export default Sidebar;
export type { logSource };
