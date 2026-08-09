import React, { useState, useEffect } from "react";
import { DirEntry, readDir } from '@tauri-apps/plugin-fs';
import { homeDir, join } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';
import { invoke } from '@tauri-apps/api/core';
import { ConnectedDevice } from '../widgets/device_prompt';
import '../styles/file_explorer.css';

interface FileItem {
  name: string;
  isFolder: boolean;
  path: string;
  extension?: string;
}

interface FileExplorerProps {
  initialPath?: string | null;
  onBackToStart?: () => void;
}

export default function FileExplorer({ initialPath, onBackToStart }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [devices, setDevices] = useState<ConnectedDevice[]>([]);
  const [openedFile, setOpenedFile] = useState<string | null>(null);

  // Load connected devices (USB Drives & Android Phones)
  async function refreshDevices() {
    try {
      const scannedDevices: ConnectedDevice[] = await invoke('get_usb_drives');
      setDevices(scannedDevices);
    } catch (err) {
      console.error("Failed to load devices:", err);
    }
  }

  useEffect(() => {
    refreshDevices();

    async function initPath() {
      setLoading(true);
      let target = initialPath;
      if (!target) {
        try {
          const scannedDevices: ConnectedDevice[] = await invoke('get_usb_drives');
          const readyDevice = scannedDevices.find(d => d.is_ready && d.path);
          if (readyDevice) {
            target = readyDevice.path;
          } else {
            target = await homeDir();
          }
        } catch {
          target = await homeDir();
        }
      }
      setCurrentPath(target || "");
      if (target) {
        await loadDirectory(target);
      } else {
        setLoading(false);
      }
    }

    initPath();
  }, [initialPath]);

  async function loadDirectory(path: string) {
    if (!path) return;
    try {
      setLoading(true);
      setError(null);
      const entries = await readDir(path);

      const fileItems: FileItem[] = await Promise.all(
        entries.map(async (entry: DirEntry) => {
          const isFolder = entry.isDirectory || false;
          const fullPath = await join(path, entry.name || '');
          const ext = !isFolder && entry.name ? entry.name.split('.').pop()?.toLowerCase() : undefined;
          return {
            name: entry.name || 'unnamed',
            isFolder,
            path: fullPath,
            extension: ext,
          };
        })
      );

      // Sort folders first, then files alphabetically
      fileItems.sort((a, b) => {
        if (a.isFolder === b.isFolder) {
          return a.name.localeCompare(b.name);
        }
        return a.isFolder ? -1 : 1;
      });

      setItems(fileItems);
    } catch (err) {
      console.error(err);
      setError(`Failed to read directory: ${path}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleItemClick(item: FileItem) {
    if (item.isFolder) {
      setHistory((prev) => [...prev, currentPath]);
      setCurrentPath(item.path);
      await loadDirectory(item.path);
    } else {
      try {
        setOpenedFile(`Opening ${item.name}...`);
        await openPath(item.path);
        setTimeout(() => setOpenedFile(null), 3000);
      } catch (err) {
        console.error(err);
        setError(`Failed to open file: ${item.name}`);
      }
    }
  }

  async function handleBackClick() {
    if (history.length > 0) {
      const previousPath = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setCurrentPath(previousPath);
      await loadDirectory(previousPath);
    }
  }

  async function handleDeviceClick(device: ConnectedDevice) {
    if (!device.is_ready || !device.path) {
      alert(`Please unlock your ${device.vendor_name || 'Android'} phone and select 'File Transfer' (MTP) on its screen.`);
      return;
    }
    setHistory([]);
    setCurrentPath(device.path);
    await loadDirectory(device.path);
  }

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (item: FileItem) => {
    if (item.isFolder) return '📁';
    const ext = item.extension;
    if (['pdf'].includes(ext || '')) return '📕';
    if (['doc', 'docx'].includes(ext || '')) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext || '')) return '📗';
    if (['ppt', 'pptx'].includes(ext || '')) return '📙';
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '')) return '🖼️';
    if (['txt', 'md', 'rtf'].includes(ext || '')) return '📄';
    return '📎';
  };

  return (
    <div className="file-explorer-container">
      {/* Top Header & Device Selector Bar */}
      <div className="explorer-header">
        <div className="header-left">
          {onBackToStart && (
            <button className="nav-btn home-nav-btn" onClick={onBackToStart}>
              🏠 Exit / Start Over
            </button>
          )}
          <button
            className="nav-btn back-nav-btn"
            onClick={handleBackClick}
            disabled={history.length === 0}
          >
            ← Back
          </button>
        </div>

        <div className="drive-selector-bar">
          <span className="drive-label">Connected Devices:</span>
          {devices.length > 0 ? (
            devices.map((device, idx) => (
              <button
                key={device.path || idx}
                className={`drive-tab ${currentPath && currentPath.startsWith(device.path) ? 'active' : ''}`}
                onClick={() => handleDeviceClick(device)}
              >
                {device.device_type === 'android_phone' ? '📱' : '💾'} {device.name}
              </button>
            ))
          ) : (
            <span className="no-usb-badge">No USB Drive / Phone Connected</span>
          )}
          <button className="refresh-drives-btn" onClick={refreshDevices} title="Refresh connected devices">
            🔄
          </button>
        </div>
      </div>

      {/* Path Breadcrumb & Search Bar */}
      <div className="toolbar">
        <div className="current-path-bar">
          <span className="path-icon">📂</span>
          <span className="path-text" title={currentPath}>{currentPath || 'No device path selected'}</span>
        </div>

        <div className="search-bar">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content / File Grid */}
      {openedFile && <div className="toast-notification">✅ {openedFile}</div>}
      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <span>Reading storage...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📭</span>
          <h3>No printable files found</h3>
          <p>{searchQuery ? `No matches for "${searchQuery}"` : "This folder is empty"}</p>
        </div>
      ) : (
        <div className="file-grid">
          {filteredItems.map((item) => (
            <div
              key={item.path}
              onClick={() => handleItemClick(item)}
              className={`file-card ${item.isFolder ? 'folder-card' : 'file-card-item'}`}
            >
              <div className="item-icon">{getFileIcon(item)}</div>
              <div className="item-details">
                <span className="item-name" title={item.name}>
                  {item.name}
                </span>
                <span className="item-type">
                  {item.isFolder ? 'Folder' : `${item.extension?.toUpperCase() || 'File'}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
