// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use std::path::PathBuf;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").into()
}


#[derive(Debug,Serialize,Deserialize,Clone)]
pub struct USBDevice{
    pub path: String;
    pub label: String;
    pub is_removable: bool;
}

#[tauri::command]
fn detect_usb_devices()->Vec<USBDevice>{
    let mut devices = Vec::new()
    #[cfg(target_os = "windows")]
    {
        // Windows: Check for removable drives
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use winapi::um::fileapi::GetLogicalDrives;
        use winapi::um::winbase::GetDriveTypeW;
        
        let drives = unsafe { GetLogicalDrives() };
        for i in 0..26 {
            if drives & (1 << i) != 0 {
                let drive_letter = (b'A' + i as u8) as char;
                let drive_path = format!("{}:\\", drive_letter);
                let wide: Vec<u16> = drive_path.encode_utf16().chain(Some(0)).collect();
                let drive_type = unsafe { GetDriveTypeW(wide.as_ptr()) };
                
                if drive_type == 2 { // DRIVE_REMOVABLE
                    let label = get_volume_label(&drive_path);
                    devices.push(USBDevice {
                        path: drive_path,
                        label: label.unwrap_or_else(|| format!("USB Drive {}", drive_letter)),
                        is_removable: true,
                    });
                }
            }
        }
    }
}




#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, app_version])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
