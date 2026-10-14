import React, { useCallback, useState, useRef, useEffect, ChangeEvent } from 'react';
import { Dialog, Button, Classes, Intent, Divider, Spinner } from "@blueprintjs/core";
import { ValidatedLogLine } from './LogMessage';
import { dummyBoxLogs } from '../dummy_data/boxlogs';
import { logSchema } from './LogMessage';
import { LogFolderEntry, recentLogFolders, formatLogFolderRange } from '../utils/logFolders';
import './FileUploadModal.css';

// Helper to get files from a directory (top level only)
async function getDirectoryFiles(directoryHandle: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = directoryHandle.createReader();
  
  // Function to read a batch of entries
  const readEntries = (): Promise<FileSystemEntry[]> => {
    return new Promise((resolve, reject) => {
      reader.readEntries(
        (entries) => resolve(entries as FileSystemEntry[]),
        (error) => reject(error)
      );
    });
  };

  try {
    let entries: FileSystemEntry[];
    
    // Keep reading entries until no more are returned
    do {
      entries = await readEntries();
      
      // Process files in the current batch
      const filePromises = entries
        .filter(entry => entry.isFile)
        .map(entry => getFile(entry as FileSystemFileEntryExtended));
      
      const batchFiles = (await Promise.all(filePromises)).filter(Boolean) as File[];
      files.push(...batchFiles);
      
    } while (entries.length > 0);
    
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  return files;
}

// Helper to get a file from a file entry
function getFile(fileEntry: FileSystemFileEntryExtended): Promise<File | null> {
  return new Promise((resolve) => {
    fileEntry.file(
      (file) => resolve(file),
      (error) => {
        console.error('Error getting file:', error);
        resolve(null);
      }
    );
  });
}

interface FileSystemDirectoryReader {
  readEntries: (
    successCallback: (entries: FileSystemEntry[]) => void,
    errorCallback?: (error: Error) => void
  ) => void;
}

interface FileSystemEntryWithValues extends FileSystemEntry {
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemFileEntry extends FileSystemEntry {
  file: (success: (file: File) => void, error?: (error: Error) => void) => void;
}

interface FileSystemDirectoryEntry extends FileSystemEntryWithValues {
  isDirectory: true;
  isFile: false;
  createReader: () => FileSystemDirectoryReader;
}

interface FileSystemFileEntryExtended extends FileSystemFileEntry {
  isDirectory: false;
  isFile: true;
  file: (success: (file: File) => void, error?: (error: Error) => void) => void;
}

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFilesSelected: (files: File[]) => void;
  onLogsLoaded: (logs: ValidatedLogLine[]) => void;
}

// Read a folder from the downloaded logs directory into File objects (a few at a time, files can be large)
async function readLogFolder(folder: string): Promise<File[]> {
  const api = window.logFolders;
  if (!api) return [];
  const names = (await api.listFiles(folder)).filter(name => !name.startsWith('.'));
  const files: File[] = new Array(names.length);
  let next = 0;
  const worker = async () => {
    while (next < names.length) {
      const i = next++;
      files[i] = new File([await api.readFile(folder, names[i])], names[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, names.length) }, worker));
  return files;
}

function isSupportedLogFile(file: File) {
  const name = file.name.toLowerCase();
  return name.includes('box') || name.includes('syslog') || name.includes('dmesg');
}

function validateBoxLogLines(lines: string[]): ValidatedLogLine[] {
  return lines.map((line, index) => {
    const id = `boxlog-${Date.now()}-${index}`;
    if (!line.trim()) return { valid: false, line, id, src: 'Box' as const };
    try {
      const parsed = JSON.parse(line);
      const validationResult = logSchema.safeParse(parsed);
      if (validationResult.success) {
        return { valid: true, line, parsedLog: validationResult.data, id, src: 'Box' as const };
      } else {
        const errorDetails = JSON.stringify(validationResult.error.flatten(), null, 2);
        console.error('Zod validation error:', {
          error: validationResult.error.flatten(),
          line
        });
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
}

const FileUploadModal: React.FC<FileUploadModalProps> = ({ isOpen, onClose, onFilesSelected, onLogsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recentFolders, setRecentFolders] = useState<LogFolderEntry[]>([]);
  const [loadingFolder, setLoadingFolder] = useState<string | null>(null);
  const [folderError, setFolderError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  // Refresh the list every time the dialog opens, new downloads may have arrived
  useEffect(() => {
    if (!isOpen || !window.logFolders) return;
    let cancelled = false;
    window.logFolders.listFolders()
      .then(({ folders, error }) => {
        if (cancelled) return;
        setRecentFolders(recentLogFolders(folders));
        setListError(error ?? null);
      })
      .catch(() => { if (!cancelled) setRecentFolders([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const handleOpenFolder = async (entry: LogFolderEntry) => {
    setLoadingFolder(entry.name);
    setFolderError(null);
    try {
      const files = await readLogFolder(entry.name);
      if (files.length === 0) {
        setFolderError('That folder has no files.');
        return;
      }
      onFilesSelected(files);
      onClose();
    } catch (error) {
      console.error('Error reading log folder:', error);
      setFolderError('Could not read that folder.');
    } finally {
      setLoadingFolder(null);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  }, [isDragging]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    const newFiles: File[] = [];
    
    // Process all items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        
        if (entry) {
          if (entry.isFile) {
            // Single file
            const file = item.getAsFile();
            if (file && (isSupportedLogFile(file))) {
              newFiles.push(file);
            }
          } else if (entry.isDirectory) {
            // Directory - process only top-level files
            try {
              const dirFiles = await getDirectoryFiles(entry as FileSystemDirectoryEntry);
              const filteredFiles = dirFiles.filter(file => 
                isSupportedLogFile(file)
              );
              newFiles.push(...filteredFiles);
            } catch (error) {
              console.error('Error processing directory:', error);
            }
          }
        } else {
          // Fallback for browsers that don't support webkitGetAsEntry
          const file = item.getAsFile();
          if (file && (isSupportedLogFile(file))) {
            newFiles.push(file);
          }
        }
      }
    }
    
    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...new Set([...prev, ...newFiles])]);
    }
  }, []);

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      // Filter files that contain 'box' in their name (case insensitive)
      const filteredFiles = files.filter(file => 
        isSupportedLogFile(file)
      );
      setSelectedFiles(prev => [...new Set([...prev, ...filteredFiles])]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
      setSelectedFiles([]);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Log Files"
      className="bp4-dark"
      style={{ width: '600px' }}
    >
      <div className={Classes.DIALOG_BODY}>
        <div 
          className={`drop-zone ${isDragging ? 'drop-zone-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              <strong>Drag & drop log files or directories here</strong>
            </p>
            <p style={{ color: '#8A9BA8', marginBottom: '1rem' }}>
              or click to browse files (only files with 'box', 'syslog' or 'dmesg' in the name will be accepted)
            </p>
            <p style={{ fontSize: '0.9em', color: '#8A9BA8', marginTop: '0.5rem' }}>
              Directory drop supported in Chrome, Edge, and Opera
            </p>
            <Button icon="upload" text="Select Files" />
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileInputChange}
              accept=".log,.txt,.json"
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Selected Files ({selectedFiles.length})</h4>
            <div className="file-list">
              {selectedFiles.map((file, index) => (
                <div key={`${file.name}-${index}`} className="file-item">
                  <span className="file-name" title={file.name}>
                    {file.name}
                  </span>
                  <Button 
                    minimal 
                    icon="cross" 
                    className="remove-file-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    small
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {recentFolders.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Recent downloads</h4>
            <div className="file-list">
              {recentFolders.map(entry => (
                <div
                  key={entry.name}
                  className="file-item recent-folder"
                  onClick={() => !loadingFolder && handleOpenFolder(entry)}
                  title={entry.name}
                >
                  <span className="file-name">
                    {formatLogFolderRange(entry)}
                    <span className="recent-folder-id">{entry.boxId.slice(0, 8)}</span>
                  </span>
                  {loadingFolder === entry.name ? <Spinner size={16} /> : <Button minimal small icon="folder-open" disabled={!!loadingFolder} />}
                </div>
              ))}
            </div>
            {folderError && <p style={{ color: '#FF7373', marginTop: '0.5rem' }}>{folderError}</p>}
          </div>
        )}
        {listError && (
          <p style={{ color: '#FF7373', marginTop: '1rem' }}>
            Could not read the Downloaded Box Logs folder ({listError}). If macOS asked for access to Downloads, allow it and reopen this dialog.
          </p>
        )}
      </div>
      <Divider style={{ margin: '15px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 15px 15px' }}>
        <Button 
          icon="document-open"
          text="Load Dummy Logs"
          onClick={() => {
            const parsedLines = validateBoxLogLines(dummyBoxLogs);
            onLogsLoaded(parsedLines);
            onClose();
          }}
        />
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            intent={Intent.PRIMARY} 
            onClick={handleUpload}
            disabled={selectedFiles.length === 0}
          >
            Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

export default FileUploadModal;
