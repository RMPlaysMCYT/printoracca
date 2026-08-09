import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import USBPrompt from '../assets/usb-data-transfer-svgrepo-com.svg';
import '../styles/device_prompt.css';

export interface ConnectedDevice {
    name: string;
    path: string;
    device_type: 'usb_flash_drive' | 'android_phone' | 'portable_device';
    vendor_name: string;
    is_ready: boolean;
    message: string;
    total_space: number;
    available_space: number;
}

interface InsertDeviceProps {
    onClose: () => void;
    onDeviceSelect: (drivePath: string) => void;
}

export function InsertDevice({ onClose, onDeviceSelect }: InsertDeviceProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [devices, setDevices] = useState<ConnectedDevice[]>([]);
    const [statusMessage, setStatusMessage] = useState<string>("Waiting for USB drive or Android phone...");
    const [isScanning, setIsScanning] = useState(true);
    const [isPreparing, setIsPreparing] = useState(false);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleSelectDevice = async (device: ConnectedDevice) => {
        let path = device.path;

        if (device.device_type === 'android_phone') {
            try {
                setIsPreparing(true);
                setStatusMessage(`Accessing files from ${device.name}...`);
                const mtpPath: string = await invoke('prepare_android_mtp_files');
                if (mtpPath) {
                    path = mtpPath;
                }
            } catch (err) {
                console.error("Failed to prepare MTP files:", err);
            } finally {
                setIsPreparing(false);
            }
        }

        if (!path && !device.is_ready) {
            alert(`Please unlock your ${device.vendor_name || 'Android'} phone and select 'File Transfer' (MTP) on its screen.`);
            return;
        }

        setIsVisible(false);
        setTimeout(() => {
            onDeviceSelect(path || "");
        }, 300);
    };

    useEffect(() => {
        let isMounted = true;

        async function checkDevices() {
            try {
                const detectedDevices: ConnectedDevice[] = await invoke('get_usb_drives');
                if (!isMounted) return;

                setDevices(detectedDevices);
                setIsScanning(false);

                if (detectedDevices.length > 0) {
                    const readyDevice = detectedDevices.find((d) => d.is_ready && d.path);
                    const androidDevice = detectedDevices.find((d) => d.device_type === 'android_phone');

                    if (readyDevice) {
                        setStatusMessage(`Device Detected: ${readyDevice.name}! Directing to File Explorer...`);
                        const timer = setTimeout(() => {
                            if (isMounted) {
                                handleSelectDevice(readyDevice);
                            }
                        }, 1000);
                        return () => clearTimeout(timer);
                    } else if (androidDevice && !androidDevice.is_ready) {
                        setStatusMessage(
                            `📱 ${androidDevice.name} connected! Please unlock your phone and tap 'File Transfer (MTP)'`
                        );
                    }
                } else {
                    setStatusMessage("Please connect a USB flash drive or Android phone via USB cable");
                }
            } catch (err) {
                console.error("Error scanning devices:", err);
            }
        }

        checkDevices();
        const interval = setInterval(checkDevices, 1500);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <div className={`insert-device-overlay ${isVisible ? 'visible' : 'hidden'}`}>
            <div className={`insert-device-container ${isVisible ? 'visible' : 'hidden'}`}>
                <div className={`usb-icon-wrapper ${devices.length > 0 ? 'detected' : 'pulse'}`}>
                    <img src={USBPrompt} alt="Insert USB or Phone" width="110" height="110" className="usb-icon" />
                </div>

                <h2>{devices.length > 0 ? "Device Connected!" : "Connect USB or Android Phone"}</h2>
                <p className="status-text">{statusMessage}</p>

                {isPreparing ? (
                    <div className="scanning-indicator">
                        <div className="spinner"></div>
                        <span>Syncing files from Android storage...</span>
                    </div>
                ) : devices.length > 0 ? (
                    <div className="detected-drives-list">
                        <p className="select-prompt-label">Select connected device to view files:</p>
                        {devices.map((device, idx) => (
                            <button
                                key={device.path || idx}
                                className={`drive-option-btn ${device.device_type === 'android_phone' ? 'android-card' : ''}`}
                                onClick={() => handleSelectDevice(device)}
                            >
                                <span className="drive-icon">
                                    {device.device_type === 'android_phone' ? '📱' : '💾'}
                                </span>
                                <div className="drive-info">
                                    <span className="drive-name">{device.name}</span>
                                    <span className="drive-path">
                                        {device.is_ready
                                            ? device.path || 'Ready to browse'
                                            : '⚠️ Tap "File Transfer (MTP)" on phone'}
                                    </span>
                                </div>
                                <span className="arrow-badge">
                                    {device.is_ready ? 'Open →' : 'Unlock Phone'}
                                </span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="scanning-indicator">
                        <div className="spinner"></div>
                        <span>{isScanning ? "Scanning USB ports..." : "Listening for USB drives & Android phones..."}</span>
                    </div>
                )}

                <div className="action-row">
                    <button className="cancel-btn" onClick={handleClose} disabled={isPreparing}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}