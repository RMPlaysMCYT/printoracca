// device_prompt.tsx
import { useState, useEffect } from 'react';
import USBPrompt from '../../assets/usb-data-transfer-svgrepo-com.svg';
import '../../styles/device_prompt.css';
import LoadingWidget from '../../widgets/spinner';
import { useUSBDetection } from '../../hooks/useUSBDetection';

interface InsertDeviceProps {
    onClose: () => void;
    onUSBDetected: (usbPath: string, usbLabel: string) => void;
}

export function InsertDevice({ onClose, onUSBDetected }: InsertDeviceProps) {
    const [isVisible, setIsVisible] = useState(true);
    const { 
        usbDevices, 
        selectedUSB, 
        setSelectedUSB, 
        isScanning,
        error,
        detectUSB
    } = useUSBDetection();

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleGetStarted = () => {
        if (selectedUSB) {
            // Navigate to file explorer with the selected USB
            onUSBDetected(selectedUSB.path, selectedUSB.label);
            handleClose();
        }
    };

    const handleRetry = () => {
        detectUSB();
    };

    return (
        <div className={`insert-device-overlay ${isVisible ? 'visible' : 'hidden'}`}>
            <div className={`insert-device-container ${isVisible ? 'visible' : 'hidden'}`}>
                <img src={USBPrompt} alt="Insert USB" width="100" height="100" />
                <h1>Insert USB Device</h1>
                <p>Please connect your USB drive to continue</p>
                
                {isScanning ? (
                    <div className="scanning-container">
                        <LoadingWidget />
                        <p>Scanning for USB devices...</p>
                    </div>
                ) : usbDevices.length === 0 ? (
                    <div className="no-device-message">
                        <p>🔌 No USB device detected</p>
                        <p style={{ fontSize: '0.8em', color: '#666' }}>
                            Please insert a USB drive and wait for detection
                        </p>
                        <button onClick={handleRetry} className="retry-btn">
                            Retry Scan
                        </button>
                    </div>
                ) : (
                    <div className="usb-selection">
                        <div className="device-selection">
                            <label>Select USB Drive:</label>
                            <select 
                                value={selectedUSB?.path || ''} 
                                onChange={(e) => {
                                    const device = usbDevices.find(d => d.path === e.target.value);
                                    if (device) setSelectedUSB(device);
                                }}
                                className="usb-select"
                            >
                                {usbDevices.map((device) => (
                                    <option key={device.path} value={device.path}>
                                        {device.label} ({device.path})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {error && (
                            <p className="error-message">❌ {error}</p>
                        )}
                        
                        <button 
                            onClick={handleGetStarted}
                            className="get-started-btn"
                        >
                            Browse Files
                        </button>
                    </div>
                )}
                
                <button onClick={handleClose} className="close-btn">
                    Cancel
                </button>
            </div>
        </div>
    );
}