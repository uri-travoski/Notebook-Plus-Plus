# Design system

Distilled from build-spec §3 + §3A. The authority is the spec; this records the live tokens,
components, and any AA-driven deviations. Tokens live in `assets/css/main.css` (`@theme`).

## Theme & tokens

- **Colors:** §3 palette as `--color-*` (Tailwind v4 utilities: `bg-surface`, `text-heading`,
  `border-border`, etc.). Class-based dark mode: `.dark` on `<html>` overrides the tokens.
- **Primary teal — nudged for AA:** `--color-primary` is `#0b7c6e` (ramp hover `#0a6b5f`, active
  `#08594e`), darker than the §3 reference `#0e9f8e`. The reference teal fails WCAG AA (~3.3:1) for
  white button text and teal link text; §3A authorizes the nudge. Use primary freely for text,
  buttons, and accents. _(Dark-mode primary `#14b8a6` pending AA audit — Phase 12.)_
- **Text colors — contrast discipline:**
  - `text-text` (#334155) body, `text-heading` (#1e293b) titles — high contrast.
  - `text-text-muted` (#64748b, 4.77:1 on white) — secondary copy, placeholders, hints. AA-safe.
  - `text-text-subtle` (#94a3b8, ~2.5:1) — **decorative only** (it fails AA): never for text that
    must be read. OK for large/non-essential ornament; prefer muted when in doubt.
- **Status:** info/tip/success/warning/danger each have `--color-*` + `--color-*-bg`.

## Type

- Font: `--font-sans` (Inter) UI/body, `--font-mono` (JetBrains Mono) code. Both self-hosted and
  **user-selectable** (Settings → Preferences sets the vars at runtime).
- Scale (§3): doc title 32/700 · H1 24/650 · H2 20/600 · H3 17/600 · body 16/400 line-height 1.7 ·
  meta/section-labels 12/600 uppercase, letter-spacing 0.06em.
- Reading column max **720px**, centered (the editor is the hero — give it the rhythm).

## Shape, shadow, spacing

- Radius tokens: `rounded-input` 8px, `rounded-card` 12px, `rounded-pill` 9999px, `rounded-box` 10px.
- `shadow-card` for cards. Spacing base 4px. Sidebar 280px, top bar 56px.

## Components (build on these; don't reinvent)

- `UiButton` — `variant`: primary / subtle / ghost / danger; `loading`, `block`. Full hover/active/
  disabled/focus-visible states.
- `UiInput` — `v-model`, `invalid`, AA placeholder.
- `FormField` — label + slot + error/hint.
- Layout `auth.vue` — centered card with wordmark + accent bar. (App shell layout arrives Phase 3.)

## Interaction states & motion

- Every interactive element: hover, focus-visible (teal ring), active, disabled, selected, loading.
- Designed empty / loading / error states are required, not optional.
- Motion: a few deliberate ~150–200ms transitions; nothing bouncy. `prefers-reduced-motion`
  respected globally in `main.css`.

## Accessibility floor (non-negotiable, enforced in E2E)

- `<html lang="en">`. AA contrast for text + UI. Visible keyboard focus everywhere. Touch targets
  ≥40px on mobile; responsive to ~360px. Semantic HTML + ARIA for custom widgets.
- Each phase runs `@axe-core/playwright` on its new surfaces; serious/critical = 0 to pass the gate.

## Dropdowns (§3)

Every dropdown with active/inactive records: active first (alphabetical), then inactive below
(alphabetical, greyed). Verify per dropdown.
