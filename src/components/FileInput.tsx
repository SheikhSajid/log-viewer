import React from 'react';
import { logSchema, ValidatedLogLine } from './LogMessage';
import { Icon } from "@blueprintjs/core";

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
}

function validateLogLines(lines: string[]): ValidatedLogLine[] {
    const processedLines = lines.map((line, index) => {
      const id = `log-${Date.now()}-${index}`;
      if (!line.trim()) return { valid: false, line, id };
      try {
        const parsed = JSON.parse(line);
        const validationResult = logSchema.safeParse(parsed);
        if (validationResult.success) {
          return { valid: true, line, parsedLog: validationResult.data, id };
        } else {
          console.error('Zod validation error:', validationResult.error.flatten());
          return { valid: false, line, error: 'Schema validation failed', id };
        }
      } catch (err) {
        let errorMessage = 'JSON parsing failed';
        if (err instanceof Error) {
          errorMessage = err.message;
        }
        return { valid: false, line, error: errorMessage, id };
      }
    });

    return processedLines;
}

const FileInput: React.FC<FileInputProps> = ({ onLogsLoaded }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const allLines: string[] = [];
    let filesRead = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        allLines.push(...lines);
        filesRead++;
        
        if (filesRead === files.length) {
          const parsedLines = validateLogLines(allLines);

          // Sort by time_logged if available
          parsedLines.sort((a, b) => {
            const aTime = a.valid && a.parsedLog ? a.parsedLog.meta.time_logged.getTime() : 0;
            const bTime = b.valid && b.parsedLog ? b.parsedLog.meta.time_logged.getTime() : 0;
            return aTime - bTime;
          });
          onLogsLoaded(parsedLines);
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
