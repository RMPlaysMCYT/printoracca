import { useState } from "react";
import "./App.css";
import { AppFooter } from "./widgets/footer";
import { useTauriInfo } from "./widgets/tauri_version";
import { InsertDevice } from "./widgets/device_prompt";
import FileExplorer from "./components/file_explorer";

type ViewMode = "home" | "explorer";

function App() {
    const [viewMode, setViewMode] = useState<ViewMode>("home");
    const [showDevicePrompt, setShowDevicePrompt] = useState(false);
    const [selectedUsbPath, setSelectedUsbPath] = useState<string | null>(null);
    const { isTauriApp, appVersion, isLoading } = useTauriInfo();

    const handleStartClick = () => {
        setShowDevicePrompt(true);
    };

    const handleDeviceSelected = (drivePath: string) => {
        setSelectedUsbPath(drivePath);
        setShowDevicePrompt(false);
        setViewMode("explorer");
    };

    const handleBackToStart = () => {
        setViewMode("home");
        setSelectedUsbPath(null);
    };

    if (isLoading) {
        return <div className="loading-container">Loading Piso Print Kiosk...</div>;
    }

    return (
        <main className="container">
            <header className="app-header">
                <h1 className="main-title">PROJECT PISO PRINT</h1>
                <p className="subtitle">Fast, Easy & Reliable Self-Service Printing Kiosk</p>
            </header>

            <div className="content">
                {viewMode === "home" ? (
                    <div className="start-section">
                        <div className="kiosk-welcome-card">
                            <div className="kiosk-icon">🖨️</div>
                            <h2>Welcome to Piso Print</h2>
                            <p>Insert your USB Flash Drive to begin printing your documents</p>
                            <button className="start-btn" onClick={handleStartClick}>
                                🚀 Start Printing
                            </button>
                        </div>
                    </div>
                ) : (
                    <FileExplorer
                        initialPath={selectedUsbPath}
                        onBackToStart={handleBackToStart}
                    />
                )}

                {showDevicePrompt && (
                    <InsertDevice
                        onClose={() => setShowDevicePrompt(false)}
                        onDeviceSelect={handleDeviceSelected}
                    />
                )}
            </div>

            <AppFooter appVersion={appVersion} isTauriApp={isTauriApp} />
        </main>
    );
}

export default App;