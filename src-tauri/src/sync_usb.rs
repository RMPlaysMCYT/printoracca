use std::path::PathBuf;
use std::fs;
use std::process::Command;
use serde::{Deserialize, Serialize};

#[tauri::command]
fn sync_usb_content(usb_path: string, sync_to_folder: String)-> Result<String, String>{
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