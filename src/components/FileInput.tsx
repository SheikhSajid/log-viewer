import React from 'react';
import { logSchema, syslogSchema, loggerJsonSchema, ValidatedLogLine, ReceptionistParamsSchema } from './LogMessage';
import { Button } from "@blueprintjs/core";
import { logSource } from './Sidebar';
import FileUploadModal from './FileUploadModal';

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
  isModalOpen: boolean;
  onModalOpenChange: (isOpen: boolean) => void;
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
          const errorDetails = JSON.stringify(validationResult.error.flatten(), null, 2);
          console.error(
            'Zod validation error:', {
              error: validationResult.error.flatten(),
              line
            }
          );
          return { 
            valid: false, 
            line, 
            error: `Schema validation failed:\n${errorDetails}`, 
            id, 
            src: 'Box' as const 
          };
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
function validateSyslogLogLines(lines: string[]): ValidatedLogLine[] {
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
          name: tag.trim(),
          tid,
          pid,
          time_logged: timestamp
        }
      };

      if (tag.trim() === 'Logger') {
        try {
          const jsonMessage = JSON.parse(message);
          const loggerValidation = loggerJsonSchema.safeParse(jsonMessage);
          if (loggerValidation.success) {
            syslogLine.meta.name = loggerValidation.data.meta.name;
            syslogLine.message = loggerValidation.data.message;

            if (syslogLine.meta.name === 'ReceptionistInternal') {
              const receptionistParamsValidation = ReceptionistParamsSchema.safeParse(loggerValidation.data.params);
              if (receptionistParamsValidation.success) {
                syslogLine.message += ' ' + receptionistParamsValidation.data.type;
              } else {
                console.error('Receptionist params validation error:', receptionistParamsValidation.error.flatten());
              }
            }
          }
        } catch (err) {
          // If JSON parsing fails, just keep the original message
          console.warn('Failed to parse Logger JSON:', err);
        }
      }

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

const FileInput: React.FC<FileInputProps> = ({ 
  onLogsLoaded, 
  isModalOpen, 
  onModalOpenChange 
}) => {

  const sortAndLoadLogs = (logs: ValidatedLogLine[]) => {
    // Sort logs by time_logged if available
    logs.sort((a, b) => {
      const aTime = a.valid && a.parsedLog ? a.parsedLog.meta.time_logged.getTime() : 0;
      const bTime = b.valid && b.parsedLog ? b.parsedLog.meta.time_logged.getTime() : 0;
      return aTime - bTime;
    });
    onLogsLoaded(logs);
  };

  const processFiles = (files: File[]) => {
    if (files.length === 0) return;
    
    const allLines: ValidatedLogLine[] = [];
    let filesRead = 0;
    
    files.forEach((file) => {
      let src: logSource | null = null;
      const lowerName = file.name.toLowerCase();

      if (lowerName.includes('box')) src = 'Box';
      else if (lowerName.includes('syslog')) src = 'Syslog';
      
      if (!src) {
        filesRead++;
        if (filesRead === files.length && allLines.length > 0) {
          sortAndLoadLogs(allLines);
        }
        return;
      }

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
        
        for (const parsedLine of parsedLines) {
          allLines.push(parsedLine);
        }
        filesRead++;
        
        if (filesRead === files.length && allLines.length > 0) {
          sortAndLoadLogs(allLines);
        }
      };
      reader.onerror = () => {
        console.error('Error reading file:', file.name);
        filesRead++;
        if (filesRead === files.length && allLines.length > 0) {
          sortAndLoadLogs(allLines);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFilesSelected = (files: File[]) => {
    processFiles(files);
  };

  return (
    <>
      <Button 
        icon="document-open" 
        text="Choose Log Files..."
        onClick={() => onModalOpenChange(true)}
      />
      
      <FileUploadModal 
        isOpen={isModalOpen}
        onClose={() => onModalOpenChange(false)}
        onFilesSelected={(files) => {
          handleFilesSelected(files);
          if (files.length > 0) {
            onModalOpenChange(false);
          }
        }}
        onLogsLoaded={sortAndLoadLogs}
      />
    </>
  );
};

export default FileInput;
