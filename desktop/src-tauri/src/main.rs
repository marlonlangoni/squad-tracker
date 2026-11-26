// Sem janela de console atrás do app no Windows.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("não consegui abrir o Squad Tracker");
}
