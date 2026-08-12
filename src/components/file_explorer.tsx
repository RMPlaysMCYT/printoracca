// file_explorer.tsx
import React, { useState, useEffect } from "react";
import { DirEntry, readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';

interface FileItem {
  name: string;
  isFolder: boolean;
  path: string;
}

interface FileExplorerProps {
  initialPath?: string;
}

export default function FileExplorer({ initialPath }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || "");
  const [items, setItems] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function FileInit() {
      const home = initialPath || await homeDir();
      setCurrentPath(home);
      loadDirectory(home);
    }
    FileInit();
  }, [initialPath]);

  async function loadDirectory(path: string) {
    try {
      setError(null);
      const entries = await readDir(path);
      const fileItems: FileItem[] = await Promise.all(entries.map(async (entry: DirEntry) => ({
        name: entry.name || 'unnamed',
        isFolder: entry.isDirectory || false,
        path: await join(path, entry.name || '')
      })));
      setItems(fileItems);
    } catch (err) { 
      setError('Failed to resolve directory');
    }
  }

  async function handleItemClick(item: FileItem) {
    if(item.isFolder){
      setHistory([...history, currentPath]);
      setCurrentPath(item.path);
      loadDirectory(item.path);
    } else {
      try {
        await openPath(item.path);
      } catch (err) {
        setError('Failed to open file');
      }
    }
  }

  async function handleBackClick() {
    if(history.length > 0){
      const previousPath = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentPath(previousPath);
      loadDirectory(previousPath);
    }
  }

  return (
    <div className="file-explorer">
      <div className="navigation">
        <button onClick={handleBackClick} disabled={history.length === 0}>
          ← Back
        </button>
        <span className="current-path">{currentPath}</span>
      </div>
      
      {error && <div className="error">{error}</div>}
      
      <div className="file-grid">
        {items.map((item) => (
          <div
            key={item.path}
            onClick={() => handleItemClick(item)}
            className={`file-item ${item.isFolder ? 'folder' : 'file'}`}
          >
            {item.isFolder ? '📁 ' : '📄 '}
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}