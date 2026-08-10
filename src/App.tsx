import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { AppFooter } from "./widgets/footer";
import { useTauriInfo } from "./widgets/tauri_version";
import { InsertDevice } from "./components/ui/device_prompt";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [showDevicePrompt, setShowDevicePrompt] = useState(false);
  const { isTauriApp, appVersion, isLoading } = useTauriInfo();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container">
      <div className="content">
        <div className="TitleCard">
          <h1>PROJECT PISO PRINT</h1>
        </div>

        {showDevicePrompt ? (
          <InsertDevice onClose={() => setShowDevicePrompt(false)} />
        ) : (
          <button onClick={() => setShowDevicePrompt(true)}>Start</button>
        )}

        {greetMsg && <p>{greetMsg}</p>}
      </div>
      <AppFooter appVersion={null} isTauriApp={true} />
    </main>
  );
}

export default App;
