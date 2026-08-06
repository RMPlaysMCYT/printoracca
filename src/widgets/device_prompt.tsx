import USBPrompt from '../assets/usb-data-transfer-svgrepo-com.svg';
import '../styles/device_prompt.css';

export function InsertDevice() {
    return (
        <div className="insert-device-container2">
            <div className="insert-device-container">
                <img src={USBPrompt} alt="Insert USB" width="100" height="100" />
                <h1>Insert USB</h1>
            </div>
        </div>
    );
}