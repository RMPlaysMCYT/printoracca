import { useState, useEffect } from 'react';
import USBPrompt from '../../assets/usb-data-transfer-svgrepo-com.svg';
import '../../styles/device_prompt.css';
import LoadingWidget from '../../widgets/spinner';
import { useUSBDetection } from '../../hooks/useUSBDetection';

interface InsertDeviceProps {
    onClose: () => void;
    onUSBDetected: (usbPath: string) => void;
}

export function InsertDevice({ onClose, onUSBDetected }: InsertDeviceProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [showExplorer, setShowExplorer] = useState(false);
    const { 
        usbDevices, 
        selectedUSB, 
        setSelectedUSB, 
        isScanning,
        isSyncing,
        syncStatus,
        error,
        syncUSB
    } = useUSBDetection();

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    const handleGetStarted = async () => {
        if (selectedUSB) {
            try {
                await syncUSB();
                setShowExplorer(true);
                // Notify parent component to show file explorer
                onUSBDetected(selectedUSB.path);
                handleClose();
            } catch (err) {
                console.error('Sync failed:', err);
            }
        }
    };

    return (
        <div className={`insert-device-overlay ${isVisible ? 'visible' : 'hidden'}`}>
            <div className={`insert-device-container ${isVisible ? 'visible' : 'hidden'}`}>
                <img src={USBPrompt} alt="Insert USB" width="100" height="100" />
                <h1>Insert USB Device</h1>
                <p>Please connect your USB drive to continue</p>
                
                {isScanning ? (
                    <div>
                        <LoadingWidget />
                        <p>Scanning for USB devices...</p>
                    </div>
                ) : usbDevices.length === 0 ? (
                    <div className="no-device-message">
                        <p>🔌 No USB device detected</p>
                        <p style={{ fontSize: '0.8em', color: '#666' }}>
                            Please insert a USB drive and wait for detection
                        </p>
                    </div>
                ) : (
                    <div className="usb-device-info">
                        <p>✅ USB detected: <strong>{selectedUSB?.label}</strong></p>
                        <p style={{ fontSize: '0.8em', color: '#666' }}>
                            Path: {selectedUSB?.path}
                        </p>
                        {syncStatus && (
                            <p className="sync-status">{syncStatus}</p>
                        )}
                        {error && (
                            <p className="error-message">{error}</p>
                        )}
                        <button 
                            onClick={handleGetStarted}
                            disabled={isSyncing}
                            className="get-started-btn"
                        >
                            {isSyncing ? 'Syncing...' : 'Get Started'}
                        </button>
                    </div>
                )}
                
                {!isScanning && (
                    <button onClick={handleClose} className="close-btn">
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}