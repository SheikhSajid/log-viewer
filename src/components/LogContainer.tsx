import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { VariableSizeList as List, ListChildComponentProps } from 'react-window';
import LogMessage, { ValidatedLogLine } from './LogMessage';
import { tokenizeSearchTerm } from '../utils/search';

// Height of the strip shown above a row that follows a long time gap
const GAP_HEIGHT = 26;

// 45s, 2m 5s, 3h 12m, 2d 4h
function formatGap(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

interface LogContainerProps {
  logLines: ValidatedLogLine[];
  onLogClick: (log: ValidatedLogLine) => void;

  /*
   * TODO: Seems like all the props should be moved to a parent component that handles
   * the search and filtering, and then pass down the filtered logLines to this
   * component. This would simplify the LogContainer component and make it more
   * focused on rendering the logs.
   */
  selectedTimezone: string;
  scrollToIndex?: number | null; // TODO: figure out why this is sometimes null and sometimes undefined
  searchTerm?: string;
  onlyShowMatching?: boolean;
  matchIndex?: number;
  matchIndexes?: number[];
  // Show a gap marker above a log whose time is more than this many ms after the previous log's.
  // Leave undefined to turn gap markers off.
  gapThresholdMs?: number;
}

const LogContainer: React.FC<LogContainerProps> = ({
  logLines,
  onLogClick,
  selectedTimezone,
  scrollToIndex,
  searchTerm = '',
  onlyShowMatching = true,
  matchIndex,
  matchIndexes = [],
  gapThresholdMs
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

  const searchTokens = useMemo(
    () => tokenizeSearchTerm(searchTerm).map(token => token.toLowerCase()),
    [searchTerm]
  );

  // Index of each log line that comes after a gap, with the size of the gap in ms. Lines without a
  // timestamp (unparsed ones) are skipped, so the gap is measured against the last line that has one.
  const gaps = useMemo(() => {
    const result = new Map<number, number>();
    if (!gapThresholdMs || gapThresholdMs <= 0) return result;
    let previousTime: number | null = null;
    logLines.forEach((log, index) => {
      if (!log.valid || !log.parsedLog) return;
      const time = log.parsedLog.meta.time_logged.getTime();
      if (isNaN(time)) return;
      if (previousTime !== null && time - previousTime > gapThresholdMs) {
        result.set(index, time - previousTime);
      }
      previousTime = time;
    });
    return result;
  }, [logLines, gapThresholdMs]);

  // Rows with a gap marker are taller, so the list needs to know each row's height
  const getItemSize = (index: number) => itemSize + (gaps.has(index) ? GAP_HEIGHT : 0);
  const estimatedItemSize = itemSize + (logLines.length > 0 ? (gaps.size * GAP_HEIGHT) / logLines.length : 0);

  // react-window caches row heights, so drop the cache whenever the gaps change
  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [gaps]);

  const Row = ({ index, style }: ListChildComponentProps) => {
    const logLine = logLines[index];
    const lowerLine = logLine.line.toLowerCase();
    const isMatch = searchTokens.length > 0 && searchTokens.some(token => lowerLine.includes(token));

    // Check if this is the current match being viewed
    const isCurrentMatch = !onlyShowMatching && 
      matchIndexes.length > 0 && 
      typeof matchIndex === 'number' && 
      matchIndexes[matchIndex] === index;

    // Only highlight if onlyShowMatching is false
    const shouldHighlight = !onlyShowMatching && isMatch;

    const gap = gaps.get(index);

    return (
      <div style={style}>
        {gap !== undefined && (
          <div
            style={{
              height: GAP_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '0 12px',
              boxSizing: 'border-box',
              background: '#f5f8fa',
              color: '#5c7080',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'monospace'
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{formatGap(gap)} gap</span>
            <span style={{ flex: 1, borderTop: '1px dashed #bfccd6' }} />
          </div>
        )}
        <div
          style={{
            height: itemSize,
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
        itemSize={getItemSize}
        estimatedItemSize={estimatedItemSize}
        width={"200%"}
        ref={listRef}
      >
        {Row}
      </List>
    </div>
  );
};

export default LogContainer;
