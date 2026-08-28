// App.tsx
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { AppFooter } from "./widgets/footer";
import { useTauriInfo } from "./widgets/tauri_version";
import { InsertDevice } from "./components/ui/device_prompt";
import FileExplorer from "./components/file_explorer";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [showDevicePrompt, setShowDevicePrompt] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [usbPath, setUsbPath] = useState<string>("");
  const [usbLabel, setUsbLabel] = useState<string>("");
  const { isTauriApp, appVersion, isLoading } = useTauriInfo();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle USB detection and navigation to file explorer
  const handleUSBDetected = (path: string, label: string) => {
    setUsbPath(path);
    setUsbLabel(label);
    setShowFileExplorer(true);
    setShowDevicePrompt(false);
  };

  // Handle cancel/close
  const handleClosePrompt = () => {
    setShowDevicePrompt(false);
  };

  // Handle going back from file explorer to USB prompt
  const handleBackToUSB = () => {
    setShowFileExplorer(false);
    setShowDevicePrompt(true);
  };

  // Close file explorer
  const handleCloseExplorer = () => {
    setShowFileExplorer(false);
  };

  return (
    <main className="container">
      <div className="content"> 
        <div className="TitleCard">
          <h1>PROJECT PISO PRINT 1.0.0</h1>
        </div>

        {!showDevicePrompt && !showFileExplorer && (
          <div className="start-container">
            <button 
              onClick={() => setShowDevicePrompt(true)}
              className="start-btn"
            >
              Get Started
            </button>
            <p className="sub-text">Insert a USB drive to begin</p>
          </div>
        )}

        {showDevicePrompt && (
          <InsertDevice 
            onClose={handleClosePrompt}
            onUSBDetected={handleUSBDetected}
          />
        )}

        {showFileExplorer && (
          <div className="file-explorer-overlay">
            <div className="file-explorer-modal">
              <div className="file-explorer-header">
                <div className="header-left">
                  <span className="usb-icon">💾</span>
                  <span className="usb-label">{usbLabel}</span>
                  <span className="usb-path">({usbPath})</span>
                </div>
                <div className="header-right">
                  <button onClick={handleBackToUSB} className="header-btn">
                    Change USB
                  </button>
                  <button onClick={handleCloseExplorer} className="header-btn close-btn">
                    ✕
                  </button>
                </div>
              </div>
              <FileExplorer 
                usbPath={usbPath}
                onBack={handleBackToUSB}
              />
            </div>
          </div>
        )}

        {greetMsg && <p>{greetMsg}</p>}
      </div>
      <AppFooter appVersion={null} isTauriApp={true} />
    </main>
  );
}

export default App;