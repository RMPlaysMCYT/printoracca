import { useTauriInfo } from "./tauri_version";

export function AppFooter({ appVersion, isTauriApp }: { appVersion: string | null, isTauriApp: boolean }) {
    return(
        <footer className="footerCss">
            {isTauriApp && appVersion && (
                <p style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                    Version: {appVersion}
                </p>
            )}
            <p>© 2024 Printoracca. All rights reserved.</p>
        </footer>
    );
}