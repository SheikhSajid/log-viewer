import React from 'react';
import { ValidatedLogLine } from './LogMessage';
import { validateBoxLogLines, validateSyslogLogLines, validateDmesgLogLines } from '../utils/logParsers';
import { Button } from "@blueprintjs/core";
import { logSource } from './Sidebar';
import { detectTimezone } from '../utils/timezone';
import FileUploadModal from './FileUploadModal';

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[], detectedTimezone?: string | null) => void;
  isModalOpen: boolean;
  onModalOpenChange: (isOpen: boolean) => void;
}

const FileInput: React.FC<FileInputProps> = ({ 
  onLogsLoaded, 
  isModalOpen, 
  onModalOpenChange 
}) => {

  const sortAndLoadLogs = (logs: ValidatedLogLine[], detectedTimezone?: string | null) => {
    // Sort logs by time_logged if available
    logs.sort((a, b) => {
      const aTime = a.valid && a.parsedLog ? a.parsedLog.meta.time_logged.getTime() : 0;
      const bTime = b.valid && b.parsedLog ? b.parsedLog.meta.time_logged.getTime() : 0;
      return aTime - bTime;
    });
    onLogsLoaded(logs, detectedTimezone);
  };

  const processFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Read everything first: dmesg timestamps are device-local, so the timezone has to be
    // detected from the box/syslog files before the dmesg files can be parsed
    const loaded: { src: logSource; text: string }[] = [];
    await Promise.all(files.map(async (file) => {
      const lowerName = file.name.toLowerCase();

      // Check dmesg first: real file names look like "<guid>_<ts>_syslog_dmesg"
      let src: logSource | null = null;
      if (lowerName.includes('dmesg')) src = 'Dmesg';
      else if (lowerName.includes('box')) src = 'Box';
      else if (lowerName.includes('syslog')) src = 'Syslog';
      if (!src) return;

      try {
        loaded.push({ src, text: await file.text() });
      } catch {
        console.error('Error reading file:', file.name);
      }
    }));

    const detectedTimezone = detectTimezone(
      loaded.filter(f => f.src === 'Box').map(f => f.text),
      loaded.filter(f => f.src === 'Syslog').map(f => f.text)
    );

    const allLines: ValidatedLogLine[] = [];
    for (const { src, text } of loaded) {
      const lines = text.split(/\r?\n/);
      const parsedLines = src === 'Box'
        ? validateBoxLogLines(lines)
        : src === 'Syslog'
          ? validateSyslogLogLines(lines)
          : validateDmesgLogLines(lines, detectedTimezone ?? 'UTC');
      for (const parsedLine of parsedLines) {
        allLines.push(parsedLine);
      }
    }

    if (allLines.length > 0) {
      sortAndLoadLogs(allLines, detectedTimezone);
    }
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
