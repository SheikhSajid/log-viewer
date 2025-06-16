import React from 'react';
import { Drawer, Card, H4, Callout, Code, Divider, Button, Tooltip, Tabs, Tab } from "@blueprintjs/core";
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
        <Card style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
          {/* Tabs for Meta, Raw Line, Pretty JSON */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Tabs id="log-details-tabs" defaultSelectedTabId="pretty" renderActiveTabPanelOnly>
                <Tab id="meta" title="Meta" panel={
                  <div style={{ marginTop: 10 }}>
                    <pre style={{ background: '#222', color: '#eee', padding: 8, borderRadius: 4 }}>{JSON.stringify(selectedLog.parsedLog.meta, null, 2)}</pre>
                  </div>
                } />
                <Tab id="raw" title="Raw Line" panel={
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <pre style={{ background: '#1a1a1a', color: '#eee', padding: 8, borderRadius: 4, overflowX: 'auto', flex: 1 }}>{selectedLog.line}</pre>
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
                } />
                <Tab id="pretty" title="Raw Line (Pretty JSON)" panel={
                  <div style={{ marginTop: 10, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                    <pre
                      style={{
                        background: '#23272e',
                        color: '#eee',
                        padding: 8,
                        borderRadius: 4,
                        overflowX: 'auto',
                        overflowY: 'auto',
                        flex: 1,
                        minHeight: 0,
                        margin: 0,
                        maxHeight: 'calc(100vh - 300px)' // ensures scrollbars appear if content exceeds viewport
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
                            const parsed = JSON.parse(selectedLog.line);
                            const pretty = JSON.stringify(parsed, null, 2);
                            return <span dangerouslySetInnerHTML={{ __html: syntaxHighlight(pretty) }} />;
                          } catch {
                            return "Invalid JSON";
                          }
                        })()}
                      </code>
                    </pre>
                  </div>
                } />
              </Tabs>
            </div>
          </div>
        </Card>
      )}
      {selectedLog && (!selectedLog.valid || !selectedLog.parsedLog) && (
        <Card style={{ margin: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Callout intent="warning" style={{ marginBottom: 10 }}>
            This log entry doesn't match the expected format
            {selectedLog.error && (
              <div style={{ marginTop: 8 }}>
                <strong>Validation Error:</strong>
                <div style={{ 
                  background: 'rgba(255, 255, 255, 0.1)', 
                  padding: '8px', 
                  marginTop: '4px', 
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  fontSize: '12px'
                }}>
                  {selectedLog.error}
                </div>
              </div>
            )}
          </Callout>
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: 10 }}>
              <strong>Raw content:</strong>
            </div>
            <pre style={{
              background: '#1a1a1a',
              color: '#eee',
              padding: 8,
              borderRadius: 4,
              overflowX: 'auto',
              overflowY: 'auto',
              flex: 1,
              margin: 0,
              whiteSpace: 'pre-wrap',
              maxHeight: 'calc(100vh - 250px)'
            }}>
              <code>{selectedLog.line}</code>
            </pre>
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
              <Tooltip content={copied ? "Copied!" : "Copy to clipboard"}>
                <Button
                  icon={copied ? "tick" : "clipboard"}
                  text={copied ? "Copied!" : "Copy"}
                  size='small'
                  onClick={handleCopy}
                  disabled={copied}
                />
              </Tooltip>
            </div>
          </div>
        </Card>
      )}
    </Drawer>
  );
};

export default LogDrawer;
