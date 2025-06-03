import React, { useRef, useState, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import LogMessage, { ValidatedLogLine } from './LogMessage';

interface LogContainerProps {
  logLines: ValidatedLogLine[];
  onLogClick: (log: ValidatedLogLine) => void;
  selectedTimezone: string;
  scrollToIndex?: number | null;
  searchTerm?: string;
  onlyShowMatching?: boolean;
  matchIndex?: number;
  matchIndexes?: number[];
}

const LogContainer: React.FC<LogContainerProps> = ({
  logLines,
  onLogClick,
  selectedTimezone,
  scrollToIndex,
  searchTerm = '',
  onlyShowMatching = true,
  matchIndex,
  matchIndexes = []
}) => {
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

  const lowerSearch = searchTerm.trim().toLowerCase();

  const Row = ({ index, style }: ListChildComponentProps) => {
    const logLine = logLines[index];
    const isMatch =
      lowerSearch.length > 0 &&
      logLine.line.toLowerCase().includes(lowerSearch);

    // Check if this is the current match being viewed
    const isCurrentMatch = !onlyShowMatching && 
      matchIndexes.length > 0 && 
      typeof matchIndex === 'number' && 
      matchIndexes[matchIndex] === index;

    // Only highlight if onlyShowMatching is false
    const shouldHighlight = !onlyShowMatching && isMatch;

    return (
      <div
        style={{
          ...style,
          cursor: 'pointer',
          background: isCurrentMatch ? 'rgba(255,165,0,0.3)' : (shouldHighlight ? 'rgba(255,255,0,0.18)' : undefined)
        }}
        onClick={() => onLogClick(logLine)}
      >
        <LogMessage
          logLine={logLine}
          selectedTimezone={selectedTimezone}
          highlight={shouldHighlight}
          isCurrentMatch={isCurrentMatch}
        />
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
