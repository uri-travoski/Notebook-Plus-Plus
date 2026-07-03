# Design

Notebook++ is a quiet, task-focused workspace. The visual system is a **Restrained** product
palette: near-white content surfaces, a cool slate-tinted second layer for chrome (sidebar,
toolbars), and a single teal brand colour reserved for primary actions, the current selection,
and state — never decoration. The reading and editing surface is the hero; everything else
recedes. All tokens live in `assets/css/main.css` (`@theme`) with a full dark-mode override.

## Color

The primary is a **deep teal**, nudged darker than a pure brand teal so white-on-teal and teal
link text both clear WCAG AA 4.5:1: `--color-primary #0b7c6e` (hover `#0a6b5f`, active `#08594e`,
contrast white, subtle tint `#e3f4f1`). In dark mode the primary brightens to `#14b8a6` with a
near-black `#04231f` contrast ink so text on it stays ~7:1.

Neutrals are a cool slate ramp, not warm: content `--color-bg`/`--color-surface` are true white
`#ffffff`; the **sidebar/chrome second layer** is `#edf2f9` (a cool slate tint that separates
chrome from content without a hard line). Borders `#e2e8f0` / strong `#cbd5e1`. Ink runs
heading `#1e293b` → body `#334155` → muted `#5b6677` (deliberately darkened from a lighter grey
so body text clears AA even on the tinted app background) → subtle `#94a3b8`. Rows hover
`#eff3f8`, selected `#e5ebf2`. Dark mode swaps to a slate-900 base (`#0f172a` bg, `#1e293b`
surface, `#111a2e` sidebar).

Semantic status colours power callouts and notices, each a saturated foreground over a pale
tint: info blue `#2563eb`/`#eff6ff`, tip teal `#0e9f8e`/`#e3f4f1`, success green `#059669`,
warning amber `#d97706`, danger red `#dc2626`. Dark mode gives each a dark tint so the box stays
dark with a readable light body and a coloured icon/rule. Meaning never rides on colour alone —
callouts carry an icon and a label too.

## Typography

One family carries the whole UI — a well-tuned sans (`--font-sans`, default Noto Sans Variable,
system fallback), with a mono for code and data (`--font-mono`, JetBrains Mono Variable). Both
are **user-selectable** at runtime via Settings → Preferences (the picker swaps the CSS vars on
`:root`; options include Inter, IBM Plex Serif, Merriweather, Google Sans Code, Fira Code). No
display/body pairing — this is product UI. Scale is a fixed rem step (not fluid clamp), tight
ratio, with a clear heading → body → muted hierarchy. Prose caps at a comfortable measure;
tables and dense panels may run wider.

## Components

Rounded, soft, and consistent: inputs `--radius-input 8px`, cards `--radius-card 12px`, boxes
`--radius-box 10px`, pills full. One low card shadow (`--shadow-card`, a 1–3px slate shadow) —
used sparingly; cards are not the default answer. Every interactive element ships the full state
set (default/hover/focus/active/disabled/loading/selected); primary actions use the teal, ghost
and secondary variants stay neutral. Focus is a global `2px solid var(--color-primary)` outline
with 2px offset on `:focus-visible`. Loading prefers skeletons over centred spinners; empty
states teach the interface.

## Layout

App shell: a fixed `--spacing-sidebar` (280px, narrowed in practice) chrome column on the cool
second layer, a `--spacing-topbar` (56px) document bar, and the content/editor surface. Responsive
behaviour is **structural** (the sidebar collapses to a drawer on mobile, tables reflow) rather
than fluid type. A semantic z-index order runs dropdown → sticky → modal-backdrop → modal → toast
→ tooltip. Supported breakpoints: desktop 1600 and mobile 375.

## Motion

Motion conveys **state**, not choreography: 150–250 ms on most transitions, ease-out curves
(no bounce/elastic), transform/opacity only where possible. No orchestrated page-load sequences —
the app loads into a task. Every animation has a `prefers-reduced-motion: reduce` fallback
(crossfade or instant), enforced globally in `main.css`. Reveals enhance already-visible content;
list entrances may stagger, but the same reflex is never stamped on every section.
