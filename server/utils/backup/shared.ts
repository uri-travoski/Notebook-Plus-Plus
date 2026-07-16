// Shared backup constants + types. Rule ([[backups-under-app-folder]]): backups always live
// inside an app-named folder, never a storage root — so both destinations prefix with
// `notebookpp/`.
export const APP_NAME = 'notebookpp'
export const BACKUP_EXT = '.npbk'

export type BackupItem = { name: string; size: number; modifiedAt: string | undefined }

export type Destination = {
  kind: 'local' | 's3'
  location: string
  put(filePath: string, name: string): Promise<void>
  list(): Promise<BackupItem[]>
  fetch(name: string, destPath: string): Promise<void>
  remove(name: string): Promise<void>
}
