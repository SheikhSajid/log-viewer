import React from 'react';
import { logSchema, ValidatedLogLine } from './LogMessage';

interface FileInputProps {
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
}

const FileInput: React.FC<FileInputProps> = ({ onLogsLoaded }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
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
      onLogsLoaded(processedLines);
    };
    reader.readAsText(file);
  };

  return (
    <input type="file" id="logFileInput" accept=".txt,.log,.json" onChange={handleFileChange} />
  );
};

export default FileInput;
