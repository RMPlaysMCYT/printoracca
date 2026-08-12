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
    devices
}

#[tauri::command]
fn sync_usb_content(usb_path: String, sync_folder: String) -> Result<String, String> {
    if let Err(e) = fs::create_dir_all(&sync_folder) {
        return Err(format!("Failed to create sync folder: {}", e));
    }
    
    // Copy content from USB to sync folder
    let usb_path_buf = PathBuf::from(&usb_path);
    let sync_folder_buf = PathBuf::from(&sync_folder);
    
    if !usb_path_buf.exists() {
        return Err("USB path does not exist".to_string());
    }
    
    // Copy files recursively
    match copy_dir_recursive(&usb_path_buf, &sync_folder_buf) {
        Ok(_) => Ok(format!("Successfully synced USB content to {}", sync_folder)),
        Err(e) => Err(format!("Failed to sync USB content: {}", e)),
    }
}

#[cfg(target_os = "windows")]
fn get_volume_label(drive_path: &str) -> Option<String> {
    use winapi::um::winbase::GetVolumeInformationW;
    use std::ptr;
    
    let wide: Vec<u16> = format!("{}\0", drive_path)
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
            wide.as_ptr(),
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
