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
  const [syncStatus, setSyncStatus] = useState<string>("");
  const { isTauriApp, appVersion, isLoading } = useTauriInfo();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle USB detection and sync
  const handleUSBDetected = (path: string) => {
    setUsbPath(path);
    setSyncStatus(`USB detected at: ${path}`);
    setShowFileExplorer(true);
    setShowDevicePrompt(false);
  };

  // Handle cancel/close
  const handleClosePrompt = () => {
    setShowDevicePrompt(false);
    // Optionally show a message or fallback
  };

  // Handle going back from file explorer to USB prompt
  const handleBackToUSB = () => {
    setShowFileExplorer(false);
    setShowDevicePrompt(true);
  };

  return (
    <main className="container">
      <div className="content">
        <div className="TitleCard">
          <h1>PROJECT PISO PRINT</h1>
        </div>

        {!showDevicePrompt && !showFileExplorer && (
          <button onClick={() => setShowDevicePrompt(true)}>
            Start
          </button>
        )}

        {showDevicePrompt && (
          <InsertDevice 
            onClose={handleClosePrompt}
            onUSBDetected={handleUSBDetected}
          />
        )}

        {showFileExplorer && (
          <div className="file-explorer-wrapper">
            <div className="file-explorer-header">
              <button onClick={handleBackToUSB} className="back-to-usb-btn">
                ← Change USB
              </button>
              <span className="usb-status">{syncStatus}</span>
            </div>
            <FileExplorer initialPath={usbPath} />
          </div>
        )}

        {greetMsg && <p>{greetMsg}</p>}
      </div>
      <AppFooter appVersion={null} isTauriApp={true} />
    </main>
  );
}

export default App;