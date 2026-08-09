// device_prompt.tsx
import { useState, useEffect } from 'react';
import USBPrompt from '../../assets/usb-data-transfer-svgrepo-com.svg';
import '../../styles/device_prompt.css';
import LoadingWidget from '../../widgets/spinner';

interface InsertDeviceProps {
    onClose: () => void;
}

export function InsertDevice({ onClose }: InsertDeviceProps) {
    const [isVisible, setIsVisible] = useState(true);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            onClose();
        }, 300);
    };

    return (
        <div className={`insert-device-overlay ${isVisible ? 'visible' : 'hidden'}`}>
            <div className={`insert-device-container ${isVisible ? 'visible' : 'hidden'}`}>
                <img src={USBPrompt} alt="Insert USB" width="100" height="100" />
                <h1>Insert USB Device</h1>
                <p>Please connect your USB drive to continue</p>
                <div>
                    <LoadingWidget/>
                </div>
                <button onClick={handleClose}>Close</button>
            </div>
        </div>
    );
}