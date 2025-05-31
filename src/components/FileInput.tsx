import React from 'react';
import { logSchema, syslogSchema, ValidatedLogLine } from './LogMessage';
import { Icon } from "@blueprintjs/core";
import { logSource } from './Sidebar';

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
}

function validateBoxLogLines(lines: string[]): ValidatedLogLine[] {
    const processedLines = lines.map((line, index) => {
      const id = `boxlog-${Date.now()}-${index}`;
      if (!line.trim()) return { valid: false, line, id, src: 'Box' as const };
      try {
        const parsed = JSON.parse(line);
        const validationResult = logSchema.safeParse(parsed);
        if (validationResult.success) {
          return { valid: true, line, parsedLog: validationResult.data, id, src: 'Box' as const };
        } else {
          console.error('Zod validation error:', validationResult.error.flatten());
          return { valid: false, line, error: 'Schema validation failed', id, src: 'Box' as const };
        }
      } catch (err) {
        let errorMessage = 'JSON parsing failed';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        return { valid: false, line, error: errorMessage, id, src: 'Box' as const };
      }
    });

    return processedLines;
}

// Add a new function to validate Syslog lines
function validateSyslogLogLines(lines: string[]): any[] {
  /**
   * ^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4})   // (1) Timestamp: e.g. 2025-03-13 07:30:42.035 +0000
   * \s+(\d+)                                                  // (2) PID: one or more digits, separated by whitespace
   * \s+(\d+)                                                  // (3) TID: one or more digits, separated by whitespace
   * \s+([A-Z])                                                // (4) Level: single uppercase letter, separated by whitespace
   * \s+([^:]+):                                               // (5) Tag: any characters except colon, separated by whitespace, ends with colon
   * \s*(.*)$                                                  // (6) Message: rest of the line after optional whitespace
   * 
   * Example matched line:
   * 2025-03-13 07:30:42.035 +0000  3572  3583  D   WificondControl: Scan result ready event
   * |---------------------------| |---| |---| |-| |--------------| |----------------------|
   *        (1) timestamp           (2)   (3)  (4)    (5) tag           (6) message
   */
  const syslogRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} [+-]\d{4})\s+(\d+)\s+(\d+)\s+([A-Z])\s+([^:]+):\s*(.*)$/;
  return lines.map((line, index) => {
    const id = `syslog-${Date.now()}-${index}`;
    if (!line.trim()) return { valid: false, line, id, src: 'Syslog' as const };

    const match = syslogRegex.exec(line);
    if (match) {
      const [ , timestamp, pid, tid, level, tag, message ] = match;

      const syslogLine = {
        level,
        message,
        meta: {
          name: tag,
          tid,
          pid,
          time_logged: timestamp
        }
      };
      const validationResult = syslogSchema.safeParse(syslogLine);

      if (validationResult.success) {
        return {
          valid: true,
          line,
          parsedLog: validationResult.data,
          id,
          src: 'Syslog' as const
        };
      } else {
        console.error('Zod validation error:', validationResult.error.flatten());
        return { valid: false, line, error: 'Schema validation failed', id, src: 'Syslog' as const };
      }
    } else {
      return { valid: false, line, error: 'Syslog parse failed', id, src: 'Syslog' as const };
    }
  });
}

const FileInput: React.FC<FileInputProps> = ({ onLogsLoaded }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const allLines: ValidatedLogLine[] = [];
    let filesRead = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let src: logSource | null = null;
      const lowerName = file.name.toLowerCase();

      if (lowerName.startsWith('box')) src = 'Box';
      else if (lowerName.startsWith('syslog')) src = 'Syslog';

      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        let parsedLines: ValidatedLogLine[] = [];
        if (src === 'Box') {
          parsedLines = validateBoxLogLines(lines);
        } else if (src === 'Syslog') {
          parsedLines = validateSyslogLogLines(lines);
        }
        allLines.push(...parsedLines);
        filesRead++;
        
        if (filesRead === files.length) {
          // Sort by time_logged if available
          allLines.sort((a, b) => {
            const aTime = a.valid && a.parsedLog ? a.parsedLog.meta.time_logged.getTime() : 0;
            const bTime = b.valid && b.parsedLog ? b.parsedLog.meta.time_logged.getTime() : 0;
            return aTime - bTime;
          });
          onLogsLoaded(allLines);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <label style={{ display: "flex", alignItems: "center", cursor: "pointer", border: "1px solid #ccc", borderRadius: 3, padding: "6px 12px", background: "#f5f8fa", fontSize: 16, fontFamily: 'inherit', width: "fit-content" }} htmlFor="logFileInput">
      <Icon icon="document-open" style={{ marginRight: 8 }} />
      Choose log files...
      <input
        id="logFileInput"
        type="file"
        multiple
        onChange={handleFileChange}
        accept=".log,.txt,.json"
        style={{ display: "none" }}
      />
    </label>
  );
};

export default FileInput;
