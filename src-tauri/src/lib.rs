// lib.rs
use std::path::PathBuf;
use std::fs;
use serde::{Deserialize, Serialize};

#[tauri::command]
fn read_file_library(usb_path: String, file_path: String)->Result<Vec<u8>,String>{
    let full_path = std::path::Path::new(&usb_path).join(file_path);
    std::fs::read(full_path).map_err(|e| e.to_string())
}


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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_folder: bool,
    pub size: u64,
    pub extension: Option<String>,
}

#[tauri::command]
fn detect_usb_devices() -> Vec<USBDevice> {
    let mut devices = Vec::new();
    
    #[cfg(target_os = "windows")]
    {
        use winapi::um::fileapi::GetLogicalDrives;
        use winapi::um::fileapi::GetDriveTypeW;
        
        unsafe {
            let drives = GetLogicalDrives();
            for i in 0..26 {
                if drives & (1 << i) != 0 {
                    let drive_letter = (b'A' + i as u8) as char;
                    let drive_path = format!("{}:\\", drive_letter);
                    
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
fn read_usb_directory(usb_path: String, sub_path: Option<String>) -> Result<Vec<FileInfo>, String> {
    let base_path = PathBuf::from(&usb_path);
    let target_path = match sub_path {
        Some(sub) => base_path.join(sub),
        None => base_path,
    };
    
    if !target_path.exists() {
        return Err("Path does not exist".to_string());
    }
    
    if !target_path.is_dir() {
        return Err("Path is not a directory".to_string());
    }
    
    let mut files = Vec::new();
    
    match fs::read_dir(&target_path) {
        Ok(entries) => {
            for entry in entries {
                match entry {
                    Ok(entry) => {
                        let file_name = entry.file_name();
                        let name = file_name.to_string_lossy().to_string();
                        let path = entry.path();
                        let metadata = match fs::metadata(&path) {
                            Ok(meta) => meta,
                            Err(_) => continue,
                        };
                        
                        let is_folder = metadata.is_dir();
                        let size = metadata.len();
                        let extension = path.extension()
                            .and_then(|ext| ext.to_str())
                            .map(|s| s.to_string());
                        
                        files.push(FileInfo {
                            name,
                            path: path.display().to_string(),
                            is_folder,
                            size,
                            extension,
                        });
                    }
                    Err(_) => continue,
                }
            }
        }
        Err(e) => return Err(format!("Failed to read directory: {}", e)),
    }
    
    // Sort files: folders first, then files alphabetically
    files.sort_by(|a, b| {
        if a.is_folder && !b.is_folder {
            std::cmp::Ordering::Less
        } else if !a.is_folder && b.is_folder {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });
    
    Ok(files)
}

#[tauri::command]
fn read_file_content(usb_path: String, file_path: String) -> Result<String, String> {
    let full_path = PathBuf::from(&usb_path).join(&file_path);
    
    if !full_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    if full_path.is_dir() {
        return Err("Path is a directory, not a file".to_string());
    }
    
    // Check if it's a text file (you can expand this list)
    let extension = full_path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    
    let text_extensions = vec!["txt", "pdf", "doc", "docx", "rtf", "md", "json", "xml", "html", "csv"];
    
    if text_extensions.contains(&extension.as_str()) {
        // Read as text
        match fs::read_to_string(&full_path) {
            Ok(content) => Ok(content),
            Err(e) => Err(format!("Failed to read file: {}", e)),
        }
    } else {
        // For binary files, read as base64 or just return file info
        match fs::read(&full_path) {
            Ok(data) => {
                // Return base64 encoded data
                Ok(base64::encode(&data))
            }
            Err(e) => Err(format!("Failed to read file: {}", e)),
        }
    }
}

#[tauri::command]
fn get_file_info(usb_path: String, file_path: String) -> Result<FileInfo, String> {
    let full_path = PathBuf::from(&usb_path).join(&file_path);
    
    if !full_path.exists() {
        return Err("File does not exist".to_string());
    }
    
    let metadata = match fs::metadata(&full_path) {
        Ok(meta) => meta,
        Err(e) => return Err(format!("Failed to get file metadata: {}", e)),
    };
    
    let name = full_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Unknown")
        .to_string();
    
    let is_folder = metadata.is_dir();
    let size = metadata.len();
    let extension = full_path.extension()
        .and_then(|ext| ext.to_str())
        .map(|s| s.to_string());
    
    Ok(FileInfo {
        name,
        path: full_path.display().to_string(),
        is_folder,
        size,
        extension,
    })
}

#[cfg(target_os = "windows")]
fn get_volume_label(drive_path: &str) -> Option<String> {
    use winapi::um::fileapi::GetVolumeInformationW;
    
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            app_version, 
            detect_usb_devices,
            read_usb_directory,
            read_file_content,
            get_file_info,
            read_file_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}