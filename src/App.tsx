import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import { AppFooter } from "./widgets/footer";
import { useTauriInfo } from "./tauri_version";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const { isTauriApp, appVersion, isLoading } = useTauriInfo();

  async function greet() {
    setGreetMsg(await invoke("greet", { name }));
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="container">
      <div className="content">
        <h1>PROJECT PISO PRINT</h1>
        <button onClick={() => greet()}>Start</button>
        {isTauriApp && appVersion && (
          <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
            Version: {appVersion}
          </p>
        )}
      </div>
      <AppFooter />
    </main>
  );
}

export default App;