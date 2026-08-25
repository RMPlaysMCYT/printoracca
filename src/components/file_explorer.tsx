// FileExplorer.tsx
import React, { useState, useEffect, useRef } from "react";
import { invoke } from '@tauri-apps/api/core';

import { renderAsync } from "docx-preview";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface FileInfo {
  name: string;
  path: string;
  is_folder: boolean;
  size: number;
  extension: string | null;
}

interface FileExplorerProps {
  usbPath: string;
  onBack?: () => void;
}

export default function FileExplorer({ usbPath, onBack }: FileExplorerProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const [textContent, setTextContent] = useState<String | null>(null);
  const [binaryData, setBinaryData] = useState<ArrayBuffer | null>(null);
  const [numPdfPages, setNumPdfPages] = useState<number | null>(null);

  const docxContainerRef = useRef<HTMLDivElement>(null);

  // Load directory contents
  async function loadDirectory(subPath?: string) {
    setIsLoading(true);
    setError(null);
    setFileContent(null);
    setSelectedFile(null);
    
    try {
      const result = await invoke<FileInfo[]>('read_usb_directory', {
        usbPath: usbPath,
        subPath: subPath || null
      });
      setFiles(result);
      setCurrentPath(subPath || "");
    } catch (err) {
      setError('Failed to read directory');
      console.error('Read directory error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Initial load
  useEffect(() => {
    if (usbPath) {
      loadDirectory();
    }
  }, [usbPath]);


  function setClearPreview(){
    setSelectedFile(null);
    setTextContent(null);
    setBinaryData(null);
    setNumPdfPages(null);
  }

  // Handle folder click
  async function handleFolderClick(folder: FileInfo) {
    if (!folder.is_folder) return;
    
    const relativePath = folder.path.replace(usbPath, '').replace(/^[\\/]/, '');
    setHistory([...history, currentPath]);
    await loadDirectory(relativePath);
  }

  // Handle file click
  async function handleFileClick(file: FileInfo) {
    if (file.is_folder) return;
    
    setSelectedFile(file);
    setFileContent(null);
    
    try {
      const content = await invoke<string>('read_file_content', {
        usbPath: usbPath,
        filePath: file.path.replace(usbPath, '').replace(/^[\\/]/, '')
      });
      setFileContent(content);
    } catch (err) {
      setError('Failed to read file content');
      console.error('Read file error:', err);
    }
  }

  // Handle back navigation
  async function handleBackClick() {
    if (history.length > 0) {
      const previousPath = history[history.length - 1];
      setHistory(history.slice(0, -1));
      await loadDirectory(previousPath);
      setFileContent(null);
      setSelectedFile(null);
    }
  }

  // Format file size
  function formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon
  function getFileIcon(file: FileInfo): string {
    if (file.is_folder) return '📁';
    
    const ext = file.extension?.toLowerCase() || '';
    const iconMap: { [key: string]: string } = {
      'pdf': '📄',
      'doc': '📝',
      'docx': '📝',
      'txt': '📃',
      'jpg': '🖼️',
      'jpeg': '🖼️',
      'png': '🖼️',
      'gif': '🖼️',
      'mp4': '🎬',
      'mp3': '🎵',
      'zip': '📦',
      'rar': '📦',
      'exe': '⚙️',
      'iso': '💿',
      'msi': '📦',
    };
    return iconMap[ext] || '📄';
  }

  return (
    <div className="file-explorer">
      <div className="explorer-nav">
        <div className="nav-left">
          <button 
            onClick={handleBackClick} 
            disabled={history.length === 0 || isLoading}
            className="nav-btn"
          >
            ← Back
          </button>
          {onBack && (
            <button onClick={onBack} className="nav-btn">
              Change USB
            </button>
          )}
        </div>
        <div className="nav-right">
          <span className="path-display">
            📂 {currentPath || 'Root'}
          </span>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          ❌ {error}
          <button onClick={() => loadDirectory(currentPath)} className="retry-btn">
            Retry
          </button>
        </div>
      )}
      
      {isLoading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading files...</p>
        </div>
      ) : (
        <div className="explorer-content">
          {selectedFile && fileContent !== null ? (
            <div className="file-preview">
              <div className="preview-header">
                <button onClick={() => {
                  setSelectedFile(null);
                  setFileContent(null);
                }} className="back-btn">
                  ← Back to files
                </button>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size-preview">{formatSize(selectedFile.size)}</span>
              </div>
              <div className="preview-content">
                <pre className="file-text">{fileContent}</pre>
              </div>
            </div>
          ) : (
            <div className="file-grid">
              {files.length === 0 ? (
                <div className="empty-folder">
                  <p>📂 This folder is empty</p>
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => file.is_folder ? handleFolderClick(file) : handleFileClick(file)}
                    className={`file-item ${file.is_folder ? 'folder' : 'file'}`}
                    title={file.is_folder ? 'Click to open folder' : 'Click to preview file'}
                  >
                    <div className="file-icon">{getFileIcon(file)}</div>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      {!file.is_folder && (
                        <div className="file-meta">
                          <span className="file-size">{formatSize(file.size)}</span>
                          {file.extension && (
                            <span className="file-extension">{file.extension.toUpperCase()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}