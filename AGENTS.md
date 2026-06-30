## Tech stack
For any tech stack, always search for the latest version of each tech to be used and use the newest version that's mutually compatible.

# Always loaded (keep tight)
@docs/architecture.md   # system overview, service boundaries, decision rationale. If this grows large, demote to "read on demand".
@docs/gotchas.md         # known gotchas/traps. Keep pruned — overlaps Claude Code auto memory (check /memory).

# Read on demand — triggered by a task/event, not a file path. Do NOT import these.
- docs/credentials.md     — read ONLY when you actually need a credential (sudo, GitHub, AI services, other accounts). NEVER import. Keep gitignored. Prefer real secrets in .env / a secrets manager; this file should record only what exists and where to find it.
- user-manual/manual.html — after finishing a module/feature, read it then update it: how it works, how to use it, every task it performs, how it connects to other modules. No screen or function omitted. Never load preemptively.
- CHANGELOG.md            — on "back up": record all changes here first (version number, then changes below it), then run the backup.
- docs/backups.md         — read when performing a backup.
- docs/design-system.md   — design, theme, UI rules. Follow this for every new page or component so it matches the project.
- docs/api.md             — endpoint conventions, auth patterns, response shapes.
- docs/database.md        — schema overview, migration conventions, key table relationships. at bottom add every field's name, type, placeholder, required flag, formatting, design, and logic — detailed enough that any feature's fields can be rebuilt from this file alone.

## UI changes
Check `@docs/design-system.md` and existing patterns before building any UI. Match existing list/edit/modal patterns. Don't add new design tokens or layouts without asking. 

## After changes
Rebuild and verify the change is visible. Restart the affected Docker service if needed. Frontend rebuild ~30s; backend ~60s. Test in browser at both supported viewports: desktop 1600 and mobile 375.

## Docs & context — load strategy
Keep every doc current: when a change touches a doc's subject, update that doc in the same change.

## Assets
If the user mentions an image (screenshot, logo, icon, etc.), check the `images/` folder before asking — it's the project's image location.
