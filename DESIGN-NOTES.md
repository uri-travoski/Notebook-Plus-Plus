# Design Notes

Running log of design decisions and fixes (build-spec §3A). Keep consistent across phases.

## Tokens & theme

- §3 palette lives in `assets/css/main.css` `@theme`; class-based dark mode (`.dark` on `<html>`).
- **Primary teal nudged darker than the §3 reference** (`#0e9f8e` → `#0b7c6e` ramp) so white
  button text and teal link text clear WCAG AA 4.5:1. The bright reference teal fails AA (~3.3:1)
  for text/buttons; §3A explicitly authorizes nudging over shipping low contrast. _(Dark-theme
  primary `#14b8a6` still to be AA-audited in Phase 12.)_
- **Muted vs subtle:** use `text-text-muted` (#64748b, 4.77:1 on white) for any meaningful small
  text — placeholders, hints, secondary copy. Reserve `text-text-subtle` (#94a3b8, ~2.5:1) for
  decorative-only; it fails AA, so never for text that must be read.
- Fonts: user-selectable `--font-sans` / `--font-mono` (Inter + JetBrains Mono, self-hosted via
  `@fontsource-variable/*`). Picker UI lands in settings (Phase 12); the CSS vars are wired from
  Phase 1 so the whole app already keys off them.

## Shared components

- `UiButton` — primary / subtle / ghost / danger, loading spinner, full interaction + focus-visible.
- `UiInput` — v-model, invalid state, AA placeholder.
- `FormField` — label + slot + error/hint.
- Layout `auth.vue` — centered card on app bg with the wordmark + teal accent bar.

## Accessibility floor (enforced via @axe-core/playwright in E2E)

- `<html lang="en">` set in `nuxt.config`.
- Login passes wcag2a/2aa with 0 serious/critical. Every new surface gets an axe scan in its phase.
- Visible focus everywhere (global `:focus-visible` ring + per-component outlines).

## Phase 3 (hierarchy + sidebar)

- `--color-text-muted` darkened #64748b → **#5b6677** so muted text clears AA on the app
  background (#eef2f7), not just on white. `text-subtle` (#94a3b8) is now **icons/decoration only**.
- Sidebar signature: teal-tinted active icon + soft `bg-row-selected` row; hover-revealed row
  actions (opacity-0 → group-hover); inline rename; collapse persisted to `preferences`.
- Shared primitives added: `UiDropdown` (aria-labelled trigger), `UiMenuItem`, `UiModal`
  (teleport + esc + fade), `DocList`, `AppPage`, `EmptyState`. All list views have designed empty
  states.
- Screenshots: `e2e/artifacts/app-overview.png`, `app-mobile.png`, `app-drawer-mobile.png`.
- **Deferred to Phase 12:** drag-and-drop reorder (move exists via the Move dialog).

## Phase 2 (auth)

- Screenshots: `e2e/artifacts/{login-desktop,login-mobile,register-desktop,forgot-desktop,home-desktop}.png`.
- Verdict: clean, quiet, product-grade. Auth is supporting cast — restraint is correct; the editor
  is the hero and gets the craft budget.
