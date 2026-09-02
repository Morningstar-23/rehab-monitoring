#[tauri::command]
async fn save_excel_file(filename: String, data: Vec<u8>) -> Result<Option<String>, String> {
    // Opens Native Windows File Explorer / macOS Save As Dialog
    let file = rfd::AsyncFileDialog::new()
        .set_file_name(&filename)
        .add_filter("Excel Workbook (*.xlsx)", &["xlsx"])
        .save_file()
        .await;

    if let Some(file_handle) = file {
        let path = file_handle.path().to_path_buf();
        std::fs::write(&path, data).map_err(|e| e.to_string())?;
        Ok(Some(path.to_string_lossy().to_string()))
    } else {
        Ok(None) // User clicked Cancel
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![save_excel_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}