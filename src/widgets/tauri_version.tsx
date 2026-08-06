import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export function useTauriInfo() {
  const [isTauriApp, setIsTauriApp] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    
    const resolveEnvironment = async () => {
      try {
        // Use the official isTauri() function instead of internal API
        const tauri = await isTauri();
        if (cancelled) return;
        setIsTauriApp(tauri);
        
        if (!tauri) {
          setIsLoading(false);
          return;
        }
        
        // Use the official getVersion() function from the app module
        const version = await getVersion();
        if (!cancelled) {
          setAppVersion(version);
        }
      } catch (error) {
        console.error("Error fetching app info:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    
    void resolveEnvironment();
    return () => { cancelled = true; };
  }, []);

  return { isTauriApp, appVersion, isLoading };
}