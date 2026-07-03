# Product

## Register

product

## Users

A single, self-hosting individual — the owner of the instance. Technical enough to run
Docker, but using the app as a daily driver for personal notes and knowledge, not as an
admin tool. They are usually mid-task: writing, searching, organising, or sketching. No
teams, no sharing, no collaboration — one person, their data, on infrastructure they run.

## Product Purpose

A self-hosted notes & knowledge base with an Outline-style feel: a rich block editor,
embedded databases, infinite Excalidraw canvases, attachments, and full-text search — all
private and owned. Success is when the tool disappears into the task: capture a thought,
find a note, or organise a notebook without friction, on any device, with no cloud.

## Brand Personality

Calm, precise, trustworthy. Three words: **quiet, focused, dependable.** The voice is plain
and human, never salesy or cute. The interface should feel like a well-made instrument — it
recedes so the content is the hero. Delight is reserved for small, earned moments, not
splashed across every screen.

## Anti-references

- Marketing-SaaS landing-page energy inside the app (gradient heroes, big hero metrics,
  eyebrow kickers, decorative motion). This is a workspace, not a pitch.
- Notion-style visual clutter and endless identical card grids.
- "AI-generated dashboard" tells: side-stripe accent borders, glassmorphism, gradient text,
  full-saturation accents on inactive states.

## Design Principles

1. **The editor/reading surface is the hero.** Every other surface exists to get you there
   and out of the way.
2. **Earned familiarity over novelty.** Standard affordances for standard tasks; never
   reinvent a scrollbar, modal, or form control for flavour.
3. **State is visible, always.** Every interactive element has default/hover/focus/active/
   disabled/loading/selected. Empty and error states teach, they don't apologise.
4. **Keyboard-first, calm.** Cmd-K, shortcuts, fast navigation; motion conveys state, never
   choreography.
5. **Own your data, own your comfort.** Light/dark, selectable fonts, works offline (PWA).

## Accessibility & Inclusion

Target WCAG 2.1 AA. Body text ≥ 4.5:1, large/UI text ≥ 3:1 (tokens are already nudged darker
to clear AA on tinted surfaces). Visible keyboard focus everywhere (2px primary outline).
Full `prefers-reduced-motion` support — every animation degrades to a crossfade or instant.
Light and dark themes both first-class. No meaning conveyed by colour alone.
