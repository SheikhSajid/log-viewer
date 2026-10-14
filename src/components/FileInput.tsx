import React from 'react';
import { ValidatedLogLine } from './LogMessage';
import { validateBoxLogLines, validateSyslogLogLines, validateDmesgLogLines } from '../utils/logParsers';
import { Button } from "@blueprintjs/core";
import { logSource } from './Sidebar';
import FileUploadModal from './FileUploadModal';

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
  isModalOpen: boolean;
  onModalOpenChange: (isOpen: boolean) => void;
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

      // Check dmesg first: real file names look like "<guid>_<ts>_syslog_dmesg"
      if (lowerName.includes('dmesg')) src = 'Dmesg';
      else if (lowerName.includes('box')) src = 'Box';
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
        } else if (src === 'Dmesg') {
          parsedLines = validateDmesgLogLines(lines);
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
