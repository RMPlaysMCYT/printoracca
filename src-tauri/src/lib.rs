// lib.rs
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").into()
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct USBDevice {
    pub path: String,
    pub label: String,
    pub is_removable: bool,
}

#[tauri::command]
fn detect_usb_devices() -> Vec<USBDevice> {
    let mut devices = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        // Use the correct winapi imports
        use winapi::um::fileapi::GetLogicalDrives;
        use winapi::um::winbase::GetDriveTypeW;
        
        unsafe {
            let drives = GetLogicalDrives();
            for i in 0..26 {
                if drives & (1 << i) != 0 {
                    let drive_letter = (b'A' + i as u8) as char;
                    let drive_path = format!("{}:\\", drive_letter);
                    
                    // Convert to wide string
                    let wide_path: Vec<u16> = drive_path.encode_utf16().chain(Some(0)).collect();
                    let drive_type = GetDriveTypeW(wide_path.as_ptr());
                    
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
    
    #[cfg(target_os = "linux")]
    {
        let paths = vec!["/media", "/mnt", "/run/media"];
        for base_path in paths {
            if let Ok(entries) = fs::read_dir(base_path) {
                for entry in entries.filter_map(Result::ok) {
                    let path = entry.path();
                    if path.is_dir() {
                        let label = path.file_name()
                            .and_then(|name| name.to_str())
                            .unwrap_or("Unknown USB")
                            .to_string();
                        devices.push(USBDevice {
                            path: path.display().to_string(),
                            label,
                            is_removable: true,
                        });
                    }
                }
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Ok(entries) = fs::read_dir("/Volumes") {
            for entry in entries.filter_map(Result::ok) {
                let path = entry.path();
                if path.is_dir() && !path.file_name().map(|n| n == "Macintosh HD").unwrap_or(false) {
                    let label = path.file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or("Unknown USB")
                        .to_string();
                    devices.push(USBDevice {
                        path: path.display().to_string(),
                        label,
                        is_removable: true,
                    });
                }
            }
        }
    }
    
    devices
}

#[tauri::command]
fn sync_usb_content(usb_path: String, sync_folder: String) -> Result<String, String> {
    if let Err(e) = fs::create_dir_all(&sync_folder) {
        return Err(format!("Failed to create sync folder: {}", e));
    }
    
    let usb_path_buf = PathBuf::from(&usb_path);
    let sync_folder_buf = PathBuf::from(&sync_folder);
    
    if !usb_path_buf.exists() {
        return Err("USB path does not exist".to_string());
    }
    
    match copy_dir_recursive(&usb_path_buf, &sync_folder_buf) {
        Ok(_) => Ok(format!("Successfully synced USB content to {}", sync_folder)),
        Err(e) => Err(format!("Failed to sync USB content: {}", e)),
    }
}

#[cfg(target_os = "windows")]
fn get_volume_label(drive_path: &str) -> Option<String> {
    use winapi::um::winbase::GetVolumeInformationW;
    
    let wide_path: Vec<u16> = format!("{}\0", drive_path)
        .encode_utf16()
        .chain(Some(0))
        .collect();
    
    let mut label = [0u16; 256];
    let mut _file_system = [0u16; 256];
    let mut _file_system_flags = 0;
    let mut _max_component_len = 0;
    let mut _serial_number = 0;
    
    unsafe {
        let result = GetVolumeInformationW(
            wide_path.as_ptr(),
            label.as_mut_ptr(),
            label.len() as u32,
            &mut _serial_number,
            &mut _max_component_len,
            &mut _file_system_flags,
            _file_system.as_mut_ptr(),
            _file_system.len() as u32,
        );
        
        if result != 0 {
            let len = label.iter().take_while(|&&c| c != 0).count();
            Some(String::from_utf16_lossy(&label[..len]))
        } else {
            None
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn get_volume_label(_drive_path: &str) -> Option<String> {
    None
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), std::io::Error> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let file_type = entry.file_type()?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        
        if file_type.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            app_version, 
            sync_usb_content,
            detect_usb_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}