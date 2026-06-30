# Backups & CHANGELOG

## When to back up
- User asks for one
- At the end of a session

## Version numbering
- Start at `v0.1`, increment by `0.1` each backup (`v0.1` → `v0.2` → `v0.3` …).
- **Source of truth:** top entry of `@CHANGELOG.md`. If empty, start at `v0.1`.

## Backup process
1. Read current version from top of `CHANGELOG.md`.
2. Next version = current + `0.1`.
3. Prepend a new entry to `CHANGELOG.md` (format below) with the new version, today's date, and a summary of changes since the last entry.
4. Zip the project folder as `projectname_v0.n_yyyy-mm-dd.zip` and save to 'backups' folder in the project folder. create it if it doesn't exist.

## CHANGELOG.md entry format
```
## v0.3 — 2026-05-29
- Added customer edit form redesign
- Fixed invoice date formatting bug
- Updated Prisma schema for recurring invoices
```

