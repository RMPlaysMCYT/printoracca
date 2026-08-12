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