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

  // Auto-detect USB on mount and periodically
  useEffect(() => {
    detectUSB();
    
    const interval = setInterval(detectUSB, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    usbDevices,
    selectedUSB,
    setSelectedUSB,
    isScanning,
    error,
    detectUSB,
  };
}