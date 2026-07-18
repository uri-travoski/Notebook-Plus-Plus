use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;

struct AppState {
    pg0_child: Mutex<Option<CommandChild>>,
    node_child: Mutex<Option<std::process::Child>>,
}

const PG_PORT: u16 = 55436;
const APP_PORT: u16 = 3940;
const DB_URL: &str = "postgresql://postgres:postgres@127.0.0.1:55436/postgres";

/// Find the `node` executable. On systems using nvm, node may not be in the
/// default PATH when launched from a GUI app, so we search common locations.
fn find_node() -> Option<std::path::PathBuf> {
    // 1. Check PATH directly
    if let Ok(path) = std::env::var("PATH") {
        for dir in path.split(':') {
            let candidate = std::path::PathBuf::from(dir).join("node");
            if candidate.is_file() {
                return Some(candidate);
            }
        }
    }

    // 2. Check nvm installations
    if let Ok(home) = std::env::var("HOME") {
        let nvm_dir = std::path::PathBuf::from(&home).join(".nvm/versions/node");
        if let Ok(entries) = std::fs::read_dir(&nvm_dir) {
            // Pick the latest version
            let mut versions: Vec<_> = entries
                .filter_map(|e| e.ok())
                .filter(|e| e.file_name().to_str().map(|n| n.starts_with('v')).unwrap_or(false))
                .collect();
            versions.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
            if let Some(latest) = versions.first() {
                let node_bin = latest.path().join("bin/node");
                if node_bin.is_file() {
                    return Some(node_bin);
                }
            }
        }
    }

    // 3. Common system locations
    for path in ["/usr/bin/node", "/usr/local/bin/node", "/opt/node/bin/node"] {
        let p = std::path::PathBuf::from(path);
        if p.is_file() {
            return Some(p);
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState {
            pg0_child: Mutex::new(None),
            node_child: Mutex::new(None),
        })
        .setup(|app| {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;

            let handle = app.handle().clone();

            // In dev mode, the Nuxt dev server is already running on APP_PORT.
            // We only need to manage pg0 + migrations in production.
            if !cfg!(debug_assertions) {
                tauri::async_runtime::spawn(async move {
                    if let Err(e) = start_backend(&handle).await {
                        log::error!("Failed to start backend: {e}");
                    }
                });
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let app = window.app_handle();
                let state: tauri::State<AppState> = app.state();
                {
                    let mut node = state.node_child.lock().unwrap();
                    if let Some(mut child) = node.take() {
                        let _ = child.kill();
                    }
                }
                {
                    let mut pg = state.pg0_child.lock().unwrap();
                    if let Some(child) = pg.take() {
                        let _ = child.kill();
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn start_backend(app: &tauri::AppHandle) -> Result<(), String> {
    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("resource dir: {e}"))?;

    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    let pg_data_dir = data_dir.join("pgdata");
    std::fs::create_dir_all(&pg_data_dir)
        .map_err(|e| format!("create pgdata dir: {e}"))?;

    log::info!("Starting embedded PostgreSQL on port {PG_PORT}...");
    let pg0 = app
        .shell()
        .sidecar("pg0")
        .map_err(|e| format!("sidecar pg0: {e}"))?;
    let (mut rx, child) = pg0
        .args([
            "start",
            "--name",
            "notebookpp",
            "--port",
            &PG_PORT.to_string(),
            "--data-dir",
            pg_data_dir.to_str().unwrap(),
        ])
        .spawn()
        .map_err(|e| format!("spawn pg0: {e}"))?;

    let state: tauri::State<AppState> = app.state();
    *state.pg0_child.lock().unwrap() = Some(child);

    // Wait for pg0 to be ready
    let mut pg_ready = false;
    while let Some(event) = rx.recv().await {
        if let tauri_plugin_shell::process::CommandEvent::Terminated(_) = event {
            break;
        }
        if let tauri_plugin_shell::process::CommandEvent::Stdout(line) = &event {
            let text = String::from_utf8_lossy(line);
            if text.contains("is running") {
                pg_ready = true;
                break;
            }
        }
    }
    if !pg_ready {
        return Err("PostgreSQL did not start".into());
    }
    log::info!("PostgreSQL is ready");

    // Run migrations
    let migrate_dir = resource_dir.join("resources/server");
    log::info!("Running migrations from {}...", migrate_dir.display());
    let node_bin = find_node()
        .ok_or_else(|| "Node.js not found. Install Node.js or add it to PATH.".to_string())?;
    log::info!("Using node: {}", node_bin.display());
    let migrate_output = std::process::Command::new(&node_bin)
        .arg(migrate_dir.join("db/migrate.mjs"))
        .env("NUXT_DATABASE_URL", DB_URL)
        .current_dir(&migrate_dir)
        .output()
        .map_err(|e| format!("migrate: {e}"))?;
    if !migrate_output.status.success() {
        let stderr = String::from_utf8_lossy(&migrate_output.stderr);
        return Err(format!("migrations failed: {stderr}"));
    }
    log::info!("Migrations applied");

    // Start the Nitro server using std::process::Command (not a Tauri sidecar —
    // we don't bundle Node.js; the system Node is used).
    let server_dir = resource_dir.join("resources/server");
    let server_entry = server_dir.join("index.mjs");
    log::info!("Starting Nitro server on port {APP_PORT} from {}...", server_entry.display());

    let node_child = std::process::Command::new(&node_bin)
        .arg(&server_entry)
        .env("NUXT_DATABASE_URL", DB_URL)
        .env("NUXT_SESSION_PASSWORD", "desktop-session-password-min-32-chars-long-xx")
        .env("ENCRYPTION_KEY", "desktop-encryption-key-min-32-chars-long")
        .env("NUXT_PUBLIC_APP_URL", format!("http://localhost:{APP_PORT}"))
        .env("PORT", APP_PORT.to_string())
        .env("NODE_ENV", "production")
        .current_dir(&resource_dir.join("resources"))
        .spawn()
        .map_err(|e| format!("spawn node: {e}"))?;

    *state.node_child.lock().unwrap() = Some(node_child);

    // Poll for server readiness — try connecting until it responds
    let mut server_ready = false;
    for _ in 0..30 {
        tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        if let Ok(stream) = std::net::TcpStream::connect(format!("127.0.0.1:{APP_PORT}")) {
            drop(stream);
            server_ready = true;
            break;
        }
        // Check if the child process is still alive
        let mut node = state.node_child.lock().unwrap();
        if let Some(ref mut child) = *node {
            match child.try_wait() {
                Ok(Some(_)) => return Err("Node server exited unexpectedly".into()),
                _ => {}
            }
        }
    }
    if !server_ready {
        return Err("Node server did not become ready within 30s".into());
    }

    log::info!("Nitro server is ready, navigating window...");
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&format!(
            "window.location.href = 'http://localhost:{APP_PORT}'"
        ));
    }

    Ok(())
}
