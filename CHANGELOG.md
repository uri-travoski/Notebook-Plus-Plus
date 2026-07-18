# Changelog

> Backup versions and what changed. Newest entry on top.
> See `docs/backups.md` for the process and entry format.

## 0.62.15

- **Tauri desktop app**: Added cross-platform desktop builds for Windows, Linux, and macOS using Tauri 2.
  - Embedded PostgreSQL 18 via pg0 sidecar (single binary, no external DB install required).
  - Nitro server bundled as a resource; Rust shell orchestrates pg0 → migrations → Node server → webview.
  - Data stored in the OS app-data directory (`~/.local/share/com.notebookpp.desktop/pgdata` on Linux).
  - Build outputs: `.deb`, `.rpm`, `.AppImage` (Linux); `.msi`/`.exe` (Windows); `.dmg` (macOS).
  - Scripts: `npm run tauri:dev` (dev), `npm run tauri:build` (production bundle).
  - Resource preparation: `scripts/prepare-tauri-resources.mjs` copies `.output/server` + migrations into `src-tauri/resources/`.
- **Bug fix**: Notes/pages now display their content when navigating between documents in the sidebar. The editor and canvas islands now remount on route param changes so BlockNote/Excalidraw receive the new document's content instead of keeping the old one.
- **Tabs**: Document tabs now appear in a tab bar above the content area. Navigating to a note/canvas opens a tab (or switches to it if already open). Tabs support close buttons and drag-to-reorder. Non-doc pages (Overview, Starred, etc.) navigate without creating a tab. Session-only — tabs clear on refresh.

_No earlier entries._
