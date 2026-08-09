use sysinfo::Disks;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ConnectedDevice {
    pub name: String,
    pub path: String,
    pub device_type: String, // "usb_flash_drive" | "android_phone" | "portable_device"
    pub vendor_name: String,
    pub is_ready: bool,
    pub message: String,
    pub total_space: u64,
    pub available_space: u64,
}

// Map USB Vendor IDs to Android Smartphone Manufacturers
fn get_android_vendor_name(vendor_id: u16) -> Option<&'static str> {
    match vendor_id {
        0x04E8 => Some("Samsung"),
        0x18D1 => Some("Google Pixel / Android"),
        0x2717 => Some("Xiaomi / Redmi / POCO"),
        0x22D9 => Some("Oppo / Realme"),
        0x2D95 => Some("Vivo"),
        0x12D1 => Some("Huawei / Honor"),
        0x2A70 => Some("OnePlus"),
        0x2AE5 => Some("Tecno / Infinix"),
        0x22B8 => Some("Motorola"),
        0x1004 => Some("LG"),
        0x0FCE => Some("Sony"),
        0x0BB4 => Some("HTC"),
        0x0B05 => Some("ASUS"),
        0x17EF => Some("Lenovo"),
        0x19D2 => Some("ZTE"),
        _ => None,
    }
}

// Detect physical Android devices connected via USB using rusb
fn detect_android_usb_hardware() -> Vec<(String, String)> {
    let mut detected_android_phones = Vec::new();

    if let Ok(devices) = rusb::devices() {
        for device in devices.iter() {
            if let Ok(device_desc) = device.device_descriptor() {
                let vendor_id = device_desc.vendor_id();

                if let Some(brand) = get_android_vendor_name(vendor_id) {
                    let name = format!("Android Smartphone ({})", brand);
                    detected_android_phones.push((name, brand.to_string()));
                } else {
                    let dev_class = device_desc.class_code();
                    if dev_class == 0x06 {
                        detected_android_phones.push((
                            "Android / MTP Device".to_string(),
                            "Generic MTP".to_string(),
                        ));
                    }
                }
            }
        }
    }

    detected_android_phones
}

#[cfg(target_os = "windows")]
fn get_windows_volume_label(drive_letter: char) -> Option<String> {
    use windows_sys::Win32::Storage::FileSystem::GetVolumeInformationW;
    let root = format!("{}:\\\0", drive_letter);
    let wide: Vec<u16> = root.encode_utf16().collect();
    let mut vol_name = [0u16; 261];
    unsafe {
        let res = GetVolumeInformationW(
            wide.as_ptr(),
            vol_name.as_mut_ptr(),
            vol_name.len() as u32,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            0,
        );
        if res != 0 {
            let len = vol_name.iter().position(|&c| c == 0).unwrap_or(0);
            if len > 0 {
                return Some(String::from_utf16_lossy(&vol_name[..len]));
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn scan_windows_removable_drives(drives: &mut Vec<ConnectedDevice>) {
    use std::path::Path;
    use windows_sys::Win32::Storage::FileSystem::GetDriveTypeW;

    const WIN_DRIVE_REMOVABLE: u32 = 2;

    for letter in b'D'..=b'Z' {
        let ch = letter as char;
        let path_str = format!("{}:\\", ch);
        let wide_path = format!("{}:\\\0", ch);
        let wide: Vec<u16> = wide_path.encode_utf16().collect();

        unsafe {
            let drive_type = GetDriveTypeW(wide.as_ptr());
            let p = Path::new(&path_str);

            if drive_type == WIN_DRIVE_REMOVABLE && p.exists() {
                let already_added = drives.iter().any(|d| d.path.eq_ignore_ascii_case(&path_str));
                if !already_added {
                    let vol_label = get_windows_volume_label(ch);
                    let name = match vol_label {
                        Some(label) => format!("💾 {} ({}:)", label, ch),
                        None => format!("💾 USB Storage ({}:)", ch),
                    };

                    drives.push(ConnectedDevice {
                        name,
                        path: path_str,
                        device_type: "usb_flash_drive".to_string(),
                        vendor_name: "Removable Storage".to_string(),
                        is_ready: true,
                        message: "Ready to print".to_string(),
                        total_space: 0,
                        available_space: 0,
                    });
                }
            }
        }
    }
}

#[cfg(target_os = "windows")]
fn scan_windows_mtp_devices(devices: &mut Vec<ConnectedDevice>) {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let mut cmd = Command::new("powershell");
    cmd.args(&[
        "-ExecutionPolicy",
        "Bypass",
        "-NoProfile",
        "-Command",
        r#"
        $shell = New-Object -ComObject Shell.Application
        $thisPc = $shell.NameSpace(17)
        $res = @()
        foreach ($item in $thisPc.Items()) {
            if ($item.Path -like "::*" -and $item.Name -notlike "*Network*" -and $item.Name -notlike "*Control Panel*") {
                $hasSub = $false
                $folder = $item.GetFolder
                if ($folder) {
                    foreach ($s in $folder.Items()) { $hasSub = $true; break }
                }
                $res += [PSCustomObject]@{
                    Name = $item.Name
                    RawPath = $item.Path
                    IsReady = $hasSub
                }
            }
        }
        $res | ConvertTo-Json -Compress
        "#,
    ]);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    if let Ok(output) = cmd.output() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        if let Ok(json_val) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
            let items = if json_val.is_array() {
                json_val.as_array().cloned().unwrap_or_default()
            } else if json_val.is_object() {
                vec![json_val]
            } else {
                vec![]
            };

            let temp_dir = std::env::temp_dir().join("PisoPrint_MTP");

            for item in items {
                let name = item["Name"].as_str().unwrap_or("Android Phone").to_string();
                let is_ready = item["IsReady"].as_bool().unwrap_or(false);

                if is_ready {
                    let _ = std::fs::create_dir_all(&temp_dir);
                }

                let path_str = if is_ready {
                    temp_dir.to_string_lossy().to_string()
                } else {
                    "".to_string()
                };

                let already_exists = devices.iter().any(|d| d.name.contains(&name) || name.contains(&d.vendor_name));
                if !already_exists {
                    devices.push(ConnectedDevice {
                        name: format!("📱 {}", name),
                        path: path_str,
                        device_type: "android_phone".to_string(),
                        vendor_name: name.clone(),
                        is_ready,
                        message: if is_ready {
                            "Android MTP Storage Ready".to_string()
                        } else {
                            "Android phone connected! Please unlock your phone and select 'File Transfer (MTP)'".to_string()
                        },
                        total_space: 0,
                        available_space: 0,
                    });
                } else {
                    for dev in devices.iter_mut() {
                        if dev.name.contains(&name) || name.contains(&dev.vendor_name) || dev.device_type == "android_phone" {
                            dev.is_ready = is_ready;
                            if is_ready {
                                dev.path = path_str.clone();
                                dev.name = format!("📱 {}", name);
                                dev.message = "Android MTP Storage Ready".to_string();
                            }
                        }
                    }
                }
            }
        }
    }
}

#[tauri::command]
fn get_usb_drives() -> Vec<ConnectedDevice> {
    let mut devices = Vec::new();

    let disks = Disks::new_with_refreshed_list();
    for disk in &disks {
        let is_removable = disk.is_removable();
        let mount_point = disk.mount_point().to_string_lossy().to_string();
        let name_str = disk.name().to_string_lossy().to_string();

        let formatted_name = if !name_str.trim().is_empty() {
            format!("💾 {} ({})", name_str.trim(), mount_point.trim_end_matches('\\'))
        } else {
            format!("💾 USB Drive ({})", mount_point.trim_end_matches('\\'))
        };

        if is_removable {
            devices.push(ConnectedDevice {
                name: formatted_name,
                path: mount_point,
                device_type: "usb_flash_drive".to_string(),
                vendor_name: "USB Mass Storage".to_string(),
                is_ready: true,
                message: "Ready to print".to_string(),
                total_space: disk.total_space(),
                available_space: disk.available_space(),
            });
        }
    }

    #[cfg(target_os = "windows")]
    scan_windows_removable_drives(&mut devices);

    let android_hardware = detect_android_usb_hardware();
    for (android_name, vendor_brand) in android_hardware {
        let already_in_list = devices.iter().any(|d| d.name.contains(&vendor_brand));
        if !already_in_list {
            devices.push(ConnectedDevice {
                name: format!("📱 {}", android_name),
                path: "".to_string(),
                device_type: "android_phone".to_string(),
                vendor_name: vendor_brand,
                is_ready: false,
                message: "Android phone connected! Please unlock your phone and select 'File Transfer (MTP)'".to_string(),
                total_space: 0,
                available_space: 0,
            });
        }
    }

    #[cfg(target_os = "windows")]
    scan_windows_mtp_devices(&mut devices);

    devices
}

#[tauri::command]
fn prepare_android_mtp_files() -> String {
    use std::process::Command;
    #[cfg(target_os = "windows")]
    use std::os::windows::process::CommandExt;

    let temp_dir = std::env::temp_dir().join("PisoPrint_MTP");
    let _ = std::fs::create_dir_all(&temp_dir);

    let script_file = std::env::current_dir()
        .map(|p| p.join("src-tauri").join("get_mtp.ps1"))
        .unwrap_or_else(|_| std::path::PathBuf::from("get_mtp.ps1"));

    let mut cmd = Command::new("powershell");
    if script_file.exists() {
        cmd.args(&[
            "-ExecutionPolicy",
            "Bypass",
            "-NoProfile",
            "-File",
            script_file.to_str().unwrap_or(""),
            "-Action",
            "sync",
            "-TargetFolder",
            temp_dir.to_str().unwrap_or(""),
        ]);
    } else {
        let script = format!(
            r#"
            $shell = New-Object -ComObject Shell.Application
            $thisPc = $shell.NameSpace(17)
            $targetFolder = "{}"
            $printableExts = @('.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.csv', '.rtf', '.jpg', '.jpeg', '.png', '.bmp')
            $priorityFolders = @('Download', 'Downloads', 'Documents', 'DCIM', 'Pictures', 'WhatsApp', 'Telegram', 'WPS', 'Office', 'Canva', 'PDF')

            function Sync-MtpItems($mtpFolderObj, $targetDirPath, $depth = 0) {{
                if ($depth -gt 4) {{ return }}
                if (-not (Test-Path $targetDirPath)) {{ New-Item -ItemType Directory -Path $targetDirPath -Force | Out-Null }}
                $destFolderObj = $shell.NameSpace($targetDirPath)
                try {{
                    foreach ($item in $mtpFolderObj.Items()) {{
                        $itemName = $item.Name
                        if ($item.IsFolder) {{
                            if ($itemName -notlike ".*" -and $itemName -ne "data" -and $itemName -ne "obb") {{
                                if ($depth -eq 0) {{
                                    $isPriority = $false
                                    foreach ($p in $priorityFolders) {{ if ($itemName -like "*$p*") {{ $isPriority = $true; break }} }}
                                    if (-not $isPriority) {{ continue }}
                                }}
                                $subPath = Join-Path $targetDirPath $itemName
                                $subF = $item.GetFolder
                                if ($subF) {{ Sync-MtpItems $subF $subPath ($depth + 1) }}
                            }}
                        }} else {{
                            $ext = [System.IO.Path]::GetExtension($itemName).ToLower()
                            if ($ext -in $printableExts) {{
                                $destFile = Join-Path $targetDirPath $itemName
                                if (-not (Test-Path $destFile)) {{
                                    $destFolderObj.CopyHere($item, 16 + 4)
                                    Start-Sleep -Milliseconds 80
                                }}
                            }}
                        }}
                    }}
                }} catch {{}}
            }}

            foreach ($item in $thisPc.Items()) {{
                if ($item.Path -like "::*" -and $item.Name -notlike "*Network*" -and $item.Name -notlike "*Control Panel*") {{
                    $devFolder = $item.GetFolder
                    if ($devFolder) {{
                        foreach ($storageItem in $devFolder.Items()) {{
                            $storageFolder = $storageItem.GetFolder
                            if ($storageFolder) {{ Sync-MtpItems $storageFolder $targetFolder 0 }}
                        }}
                    }}
                }}
            }}
            "#,
            temp_dir.to_string_lossy().replace('\\', "\\\\")
        );
        cmd.args(&["-ExecutionPolicy", "Bypass", "-NoProfile", "-Command", &script]);
    }

    #[cfg(target_os = "windows")]
    cmd.creation_flags(0x08000000);

    let _ = cmd.output();
    temp_dir.to_string_lossy().to_string()
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").into()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            app_version,
            get_usb_drives,
            prepare_android_mtp_files
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
