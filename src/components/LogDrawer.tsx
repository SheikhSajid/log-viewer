import React from 'react';
import { Drawer, Card, H4, Callout, Code, Divider } from "@blueprintjs/core";
import { ValidatedLogLine } from './LogMessage';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLog: ValidatedLogLine | null;
  selectedTimezone: string;
}

const LogDrawer: React.FC<LogDrawerProps> = ({ isOpen, onClose, selectedLog, selectedTimezone }) => (
  <Drawer
    isOpen={isOpen}
    onClose={onClose}
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
);

export default LogDrawer;
