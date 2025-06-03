import React, { useRef, useState, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import LogMessage, { ValidatedLogLine } from './LogMessage';

interface LogContainerProps {
  logLines: ValidatedLogLine[];
  onLogClick: (log: ValidatedLogLine) => void;
  selectedTimezone: string;
  scrollToIndex?: number | null;
}

const LogContainer: React.FC<LogContainerProps> = ({ logLines, onLogClick, selectedTimezone, scrollToIndex }) => {
  const itemSize = 31;
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);
  const [height, setHeight] = useState(400);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setHeight(containerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    if (
      typeof scrollToIndex === 'number' &&
      scrollToIndex >= 0 &&
      listRef.current
    ) {
      listRef.current.scrollToItem(scrollToIndex, 'center');
    }
  }, [scrollToIndex, logLines.length]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const logLine = logLines[index];
    return (
      <div style={{ ...style, cursor: 'pointer' }} onClick={() => onLogClick(logLine)}>
        <LogMessage logLine={logLine} selectedTimezone={selectedTimezone} />
      </div>
    );
  };

  return (
    <div
      id="logDisplayReact"
      ref={containerRef}
      style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
    >
      <List
        height={height}
        itemCount={logLines.length}
        itemSize={itemSize}
        width={"100%"}
        ref={listRef}
      >
        {Row}
      </List>
    </div>
  );
};

export default LogContainer;
