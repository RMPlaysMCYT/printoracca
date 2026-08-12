// useUSBDetection.ts
import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface USBDevice {
  path: string;
  label: string;
  is_removable: boolean;
}

export function useUSBDetection() {
  const [usbDevices, setUSBDevices] = useState<USBDevice[]>([]);
  const [selectedUSB, setSelectedUSB] = useState<USBDevice | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncFolder, setSyncFolder] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Detect USB devices
  const detectUSB = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const devices = await invoke<USBDevice[]>('detect_usb_devices');
      setUSBDevices(devices);
      if (devices.length > 0) {
        setSelectedUSB(devices[0]);
      } else {
        setSelectedUSB(null);
      }
    } catch (err) {
      setError('Failed to detect USB devices');
      console.error('USB detection error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Sync USB content
  const syncUSB = async () => {
    if (!selectedUSB) {
      setError('No USB device selected');
      return;
    }
    
    setIsSyncing(true);
    setSyncStatus(null);
    setError(null);
    
    try {
      const syncPath = syncFolder || `./usb_sync_${Date.now()}`;
      const result = await invoke<string>('sync_usb_content', {
        usbPath: selectedUSB.path,
        syncFolder: syncPath
      });
      setSyncStatus(result);
      setSyncFolder(syncPath);
      return result;
    } catch (err) {
      setError('Failed to sync USB content');
      console.error('Sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-detect USB on mount and periodically
  useEffect(() => {
    detectUSB();
    
    // Scan every 5 seconds for new USB devices
    const interval = setInterval(detectUSB, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    usbDevices,
    selectedUSB,
    setSelectedUSB,
    isScanning,
    isSyncing,
    syncStatus,
    syncFolder,
    setSyncFolder,
    error,
    detectUSB,
    syncUSB
  };
}