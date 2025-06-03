import React from 'react';
import { Drawer, Card, H4, Callout, Code, Divider, Button, Tooltip } from "@blueprintjs/core";
import { ValidatedLogLine } from './LogMessage';

interface LogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLog: ValidatedLogLine | null;
  selectedTimezone: string;
}

const LogDrawer: React.FC<LogDrawerProps> = ({ isOpen, onClose, selectedLog, selectedTimezone }) => {
  // Add state for copy feedback
  const [copied, setCopied] = React.useState(false);

  // Copy handler
  const handleCopy = React.useCallback(() => {
    if (selectedLog) {
      navigator.clipboard.writeText(selectedLog.line);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  }, [selectedLog]);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      position="right"
      size="60vw"
      title="Log Details"
    >
      {selectedLog && selectedLog.valid && selectedLog.parsedLog && (
        <Card style={{ margin: 0 }}>
          <div style={{ marginBottom: 10 }}>
            <b>Timestamp:</b> {new Intl.DateTimeFormat('default', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: selectedTimezone }).format(new Date(selectedLog.parsedLog.meta.time_logged))}
          </div>
          <div style={{ marginBottom: 10 }}>
            <b>Message:</b> <Callout intent={selectedLog.parsedLog.level === 'error' ? 'danger' : selectedLog.parsedLog.level === 'warn' ? 'warning' : selectedLog.parsedLog.level === 'info' ? 'primary' : 'none'}>{selectedLog.parsedLog.message}</Callout>
          </div>
          <div style={{ marginBottom: 10 }}>
            <b>Source:</b> {selectedLog.parsedLog.meta.name}
          </div>
          <div style={{ marginBottom: 10 }}>
            <b>Level:</b> <Code style={{ whiteSpace: 'pre-wrap' }}>{selectedLog.parsedLog.level}</Code>
          </div>
          <Divider />
          {/* <div style={{ marginBottom: 10 }}>
            <b>Stack Trace:</b>
            {selectedLog.parsedLog.payload && (selectedLog.parsedLog.payload as any).stack ? (
              <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{(selectedLog.parsedLog.payload as any).stack}</pre>
            ) : (
              <span style={{ color: '#888' }}>N/A</span>
            )}
          </div>
          <Divider /> */}
          {/* <div style={{ marginBottom: 10 }}>
            <b>Additional Data:</b>
            <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{JSON.stringify(selectedLog.parsedLog.payload, null, 2)}</pre>
          </div>
          <Divider /> */}
          <div style={{ marginBottom: 10 }}>
            <b>Meta:</b>
            <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4 }}>{JSON.stringify(selectedLog.parsedLog.meta, null, 2)}</pre>
          </div>
          <Divider />
          <div style={{ marginBottom: 10 }}>
            <b>Raw Line:</b>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <pre style={{ background: '#1a1a1a', color: '#eee', padding: 8, borderRadius: 4, marginTop: 4, overflowX: 'auto', flex: 1 }}>{selectedLog.line}</pre>
              <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
                <Button
                  icon={copied ? "tick" : "clipboard"}
                  text={copied ? "Copied!" : "Copy"}
                  size='small'
                  style={{ marginTop: 4 }}
                  onClick={handleCopy}
                  disabled={copied}
                />
              </Tooltip>
            </div>
          </div>
          {/* Pretty print raw line as JSON */}
          <div style={{ marginBottom: 10 }}>
            <b>Raw Line (Pretty JSON):</b>
            <pre
              style={{
                background: '#23272e',
                color: '#eee',
                padding: 8,
                borderRadius: 4,
                marginTop: 4,
                overflowX: 'auto',
                overflowY: 'auto',
                maxHeight: 300
              }}
            >
              <code>
                {(() => {
                  function syntaxHighlight(json: string) {
                    // Escape HTML
                    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    return json.replace(
                      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
                      (match) => {
                        let cls = 'color:#d19a66;'; // number
                        if (/^"/.test(match)) {
                          if (/:$/.test(match)) {
                            cls = 'color:#61afef;'; // key
                          } else {
                            cls = 'color:#98c379;'; // string
                          }
                        } else if (/true|false/.test(match)) {
                          cls = 'color:#e06c75;'; // boolean
                        } else if (/null/.test(match)) {
                          cls = 'color:#c678dd;'; // null
                        }
                        return `<span style="${cls}">${match}</span>`;
                      }
                    );
                  }
                  try {
                    const pretty = JSON.stringify(JSON.parse(selectedLog.line), null, 2);
                    return <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(pretty) }} />;
                  } catch {
                    return "Invalid JSON";
                  }
                })()}
              </code>
            </pre>
          </div>
        </Card>
      )}
      {selectedLog && (!selectedLog.valid || !selectedLog.parsedLog) && (
        <Callout intent="danger">Invalid log format</Callout>
      )}
    </Drawer>
  );
};

export default LogDrawer;
