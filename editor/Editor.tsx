import { createElement, useMemo, useState, useRef, useEffect, Fragment } from 'react'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  FormattingToolbarController,
  FormattingToolbar,
  getFormattingToolbarItems,
  BasicTextStyleButton,
  SideMenuController,
  SideMenu,
  DragHandleMenu,
  RemoveBlockItem,
  BlockColorsItem,
  TableColumnHeaderItem,
  TableRowHeaderItem,
  useBlockNoteEditor,
  useComponentsContext,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useExtensionState as useExtensionStateRaw,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import {
  BlockNoteSchema,
  defaultBlockSpecs,
  filterSuggestionItems,
  createCodeBlockSpec,
} from '@blocknote/core'
import { codeBlockOptions } from '@blocknote/code-block'
import { createHighlighter } from 'shiki'
import { Callout } from './blocks/Callout'
import { MathBlock } from './blocks/MathBlock'
import { DatabaseTable } from './blocks/DatabaseTable'
import { Drawing } from './blocks/Drawing'
import '@blocknote/mantine/style.css'
import 'katex/dist/katex.min.css'
import './editor.css'

// SideMenuExtension is a runtime export from @blocknote/react but not in the .d.ts types.
// It's the extension that tracks which block the side menu (drag handle) is showing for.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SideMenuExtension = (0, eval)('require')('@blocknote/react').SideMenuExtension as any

// Link icon SVG for the "copy link" toolbar button and drag handle menu item.
const LINK_ICON = createElement(
  'svg',
  { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
  createElement('path', { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71' }),
  createElement('path', { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71' }),
)

// Extract the document ID from the current URL path: /doc/{documentId}
function docIdFromUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.location.pathname.match(/\/doc\/([^/]+)/)?.[1]
}

// Copy a deep link to a block: /doc/{documentId}#{blockId}
function copyBlockLink(blockId: string) {
  const docId = docIdFromUrl()
  if (!docId) return
  const url = `${window.location.origin}/doc/${docId}#${blockId}`
  navigator.clipboard.writeText(url).catch(() => {})
}

// Custom drag handle menu: default items + "Copy link to block".
// Defined outside Editor to avoid remounts; gets the block from SideMenuExtension state.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CopyLinkDragHandleMenu() {
  const editor = useBlockNoteEditor()
  const components = useComponentsContext()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const block = useExtensionStateRaw(SideMenuExtension, {
    editor,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selector: (state: any) => state?.block,
  })

  if (!components) return null

  return createElement(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    DragHandleMenu as any,
    null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(RemoveBlockItem as any, null, 'Delete block'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(BlockColorsItem as any, null, 'Colors'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(TableColumnHeaderItem as any, null, 'Header column'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(TableRowHeaderItem as any, null, 'Header row'),
    block
      ? createElement(components.Generic.Menu.Item, {
          className: 'bn-menu-item',
          onClick: () => copyBlockLink(block.id),
          icon: LINK_ICON,
        }, 'Copy link to block')
      : null,
  )
}

// Custom side menu: default buttons + our custom drag handle menu.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomSideMenu() {
  return createElement(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SideMenu as any,
    { dragHandleMenu: CopyLinkDragHandleMenu },
  )
}

// "Copy link to this block" button for the formatting toolbar.
// Must be a component (not inline) so it can call useComponentsContext inside the toolbar.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CopyLinkToolbarButton({ editor }: { editor: any }) {
  const components = useComponentsContext()
  if (!components) return null
  return createElement(components.FormattingToolbar.Button, {
    mainTooltip: 'Copy link to this block',
    label: 'Copy link to this block',
    icon: LINK_ICON,
    onClick: () => {
      const block = editor.getTextCursorPosition().block
      if (block?.id) copyBlockLink(block.id as string)
    },
  })
}

// Shiki highlighting: load both github themes so the code block can render dark tokens
// in dark mode and light tokens in light mode (see the .dark code-block CSS override).
const CODE_LANGS = [
  'javascript',
  'typescript',
  'jsx',
  'tsx',
  'json',
  'html',
  'css',
  'scss',
  'bash',
  'python',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'sql',
  'yaml',
  'markdown',
  'vue',
  'xml',
  'dockerfile',
  'toml',
  'diff',
  'graphql',
  'kotlin',
  'swift',
]
const SUPPORTED_LANGS = Object.fromEntries(
  Object.entries(codeBlockOptions.supportedLanguages).filter(([k]) => CODE_LANGS.includes(k)),
)

// BlockNote applies the highlighter's first theme statically (it does not follow the
// editor colour scheme), so build the schema per theme: github-dark tokens in dark
// mode (readable on the dark code surface), github-light in light mode.
function makeSchema(theme: 'light' | 'dark') {
  const codeBlock = {
    ...codeBlockOptions,
    supportedLanguages: SUPPORTED_LANGS,
    createHighlighter: () =>
      createHighlighter({
        themes: [theme === 'dark' ? 'github-dark' : 'github-light'],
        langs: CODE_LANGS,
      }),
  }
  // createReactBlockSpec returns a factory, so each block is added as `Callout()`.
  return BlockNoteSchema.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      codeBlock: createCodeBlockSpec(codeBlock), // Shiki syntax highlighting (§11)
      callout: Callout(),
      math: MathBlock(),
      databaseTable: DatabaseTable(),
      drawing: Drawing(),
    },
  })
}

type Props = {
  initialContent?: unknown[]
  editable?: boolean
  documentId?: string
  theme?: 'light' | 'dark'
  onChange?: (doc: unknown[]) => void
}

export default function Editor({
  initialContent,
  editable = true,
  documentId,
  theme = 'light',
  onChange,
}: Props) {
  // Upload image / file / video / audio to the app's attachment store; returning a URL
  // here is what makes BlockNote show the "Upload" tab (without it, only URL embed).
  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData()
    fd.append('file', file)
    if (documentId) fd.append('documentId', documentId)
    const res = await fetch('/api/attachments', { method: 'POST', body: fd })
    if (!res.ok) {
      let msg = 'Upload failed'
      try {
        msg = (await res.json()).statusMessage || msg
      } catch {
        // non-JSON error
      }
      throw new Error(msg)
    }
    return (await res.json()).url as string
  }

  // Schema is theme-specific (Shiki github-dark vs github-light). The island remounts
  // this component on a theme flip (via a React key), so this runs fresh with the right
  // schema and the live content — no in-place editor mutation needed.
  const schema = useMemo(() => makeSchema(theme), [theme])
  const editor = useCreateBlockNote({
    schema,
    uploadFile,
    initialContent:
      Array.isArray(initialContent) && initialContent.length
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (initialContent as any)
        : undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ed = editor as any

  // --- Delete confirmation for media blocks (image/video/audio/file) ---
  // BlockNote deletes media blocks natively with no "before delete" hook, so we guard at the
  // ProseMirror level: wrap the view's dispatch, and when a transaction would remove a media
  // block, hold it, ask the user, then replay it on confirm (drop it on cancel). All non-media
  // edits pass straight through.
  const MEDIA_TYPES = ['image', 'video', 'audio', 'file']
  const MEDIA_NOUN: Record<string, string> = {
    image: 'image',
    video: 'video',
    audio: 'audio file',
    file: 'file',
  }
  // confirm state drives the modal; `resolveRef` returns the user's choice to the dispatch guard.
  const [confirm, setConfirm] = useState<{ types: string[] } | null>(null)
  const resolveRef = useRef<((ok: boolean) => void) | null>(null)
  function askDelete(types: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setConfirm({ types })
    })
  }
  function closeConfirm(ok: boolean) {
    setConfirm(null)
    const r = resolveRef.current
    resolveRef.current = null
    r?.(ok)
  }

  useEffect(() => {
    let cleanup = () => {}
    let raf = 0
    // Map of blockContainer id -> media block type present in a ProseMirror doc.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function mediaMap(doc: any): Map<string, string> {
      const m = new Map<string, string>()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      doc.descendants((node: any) => {
        if (node.type.name === 'blockContainer') {
          const inner = node.firstChild
          if (inner && MEDIA_TYPES.includes(inner.type.name)) m.set(node.attrs.id, inner.type.name)
        }
        return true
      })
      return m
    }
    function install() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const view: any = ed.prosemirrorView
      if (!view) {
        raf = requestAnimationFrame(install)
        return
      }
      const originalDispatch = view.dispatch.bind(view)
      let bypass = false // set while replaying a confirmed deletion, so it isn't re-caught
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      view.dispatch = (tr: any) => {
        if (bypass || !tr.docChanged) return originalDispatch(tr)
        const before = mediaMap(view.state.doc)
        if (before.size === 0) return originalDispatch(tr)
        const after = mediaMap(tr.doc)
        const removed: string[] = []
        for (const [id, type] of before) if (!after.has(id)) removed.push(type)
        if (removed.length === 0) return originalDispatch(tr)
        // Hold this transaction; ask, then replay (identity-stable while the modal blocks input).
        const heldDoc = view.state.doc
        const removedIds = [...before.keys()].filter((id) => !after.has(id))
        askDelete(removed).then((ok) => {
          if (!ok) return
          bypass = true
          try {
            if (view.state.doc === heldDoc) originalDispatch(tr)
            else ed.removeBlocks(removedIds) // doc moved under us: delete by id instead
          } finally {
            bypass = false
          }
        })
        return undefined
      }
      cleanup = () => {
        view.dispatch = originalDispatch
      }
    }
    install()
    return () => {
      if (raf) cancelAnimationFrame(raf)
      cleanup()
    }
    // editor instance is stable for the component's life (remounts on theme flip via key)
  }, [])

  // --- AI (§16): stream a completion from /api/ai/complete into a target block, live. ---
  function inlineText(content: unknown): string {
    if (typeof content === 'string') return content
    if (!Array.isArray(content)) return ''
    return content
      .map((c) =>
        c && typeof c === 'object' && typeof (c as { text?: string }).text === 'string'
          ? (c as { text: string }).text
          : '',
      )
      .join('')
  }
  function docText(): string {
    return (ed.document as { content?: unknown }[])
      .map((b) => inlineText(b.content))
      .filter(Boolean)
      .join('\n\n')
  }
  async function streamInto(targetId: string, body: Record<string, unknown>) {
    let res: Response
    try {
      res = await fetch('/api/ai/complete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      ed.updateBlock(targetId, { type: 'paragraph', content: 'AI request failed.' })
      return
    }
    if (!res.ok || !res.body) {
      let msg = 'AI error'
      try {
        msg = (await res.json()).statusMessage || msg
      } catch {
        // non-JSON error
      }
      ed.updateBlock(targetId, { type: 'paragraph', content: msg })
      return
    }
    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let acc = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      acc += dec.decode(value, { stream: true })
      ed.updateBlock(targetId, { type: 'paragraph', content: acc })
    }
  }
  function insertAfterCursor(): string {
    const block = ed.getTextCursorPosition().block
    const [inserted] = ed.insertBlocks([{ type: 'paragraph', content: '…' }], block, 'after')
    return inserted.id as string
  }
  const aiItems = [
    {
      title: 'Continue writing (AI)',
      subtext: 'Let AI continue your note',
      aliases: ['ai', 'continue', 'write', 'gpt', 'assistant'],
      group: 'AI',
      onItemClick: async () =>
        streamInto(insertAfterCursor(), { action: 'continue', context: docText() }),
    },
    {
      title: 'Improve writing (AI)',
      subtext: 'Rewrite this block more clearly',
      aliases: ['ai', 'improve', 'rewrite', 'clarify'],
      group: 'AI',
      onItemClick: async () => {
        const block = ed.getTextCursorPosition().block
        const text = inlineText(block.content)
        if (text.trim()) await streamInto(block.id, { action: 'improve', text })
      },
    },
    {
      title: 'Fix spelling & grammar (AI)',
      subtext: 'Correct this block',
      aliases: ['ai', 'grammar', 'spelling', 'fix', 'proofread'],
      group: 'AI',
      onItemClick: async () => {
        const block = ed.getTextCursorPosition().block
        const text = inlineText(block.content)
        if (text.trim()) await streamInto(block.id, { action: 'grammar', text })
      },
    },
    {
      title: 'Summarize note (AI)',
      subtext: 'Add a summary of this note',
      aliases: ['ai', 'summarize', 'summary', 'tldr'],
      group: 'AI',
      onItemClick: async () =>
        streamInto(insertAfterCursor(), { action: 'summarize', text: docText() }),
    },
  ]

  async function getSlashItems(query: string) {
    // Place a custom block where the user invoked "/": replace the (now-empty) current
    // paragraph if empty, else insert after it, and move the cursor INTO the new block so
    // typing lands there — matching BlockNote's own slash items. Without this, a Callout was
    // inserted empty and the user's text went into the paragraph above it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const placeBlock = (spec: any) => {
      const cur = ed.getTextCursorPosition().block
      const empty =
        cur.type === 'paragraph' && (!Array.isArray(cur.content) || cur.content.length === 0)
      let targetId: string
      if (empty) {
        ed.updateBlock(cur, spec)
        targetId = cur.id
      } else {
        targetId = ed.insertBlocks([spec], cur, 'after')[0].id
      }
      // If the new block is last in the document, add a trailing paragraph so there is always
      // somewhere to type after it — custom blocks (callout/math/database/drawing) can't be
      // reliably exited with the keyboard otherwise.
      const doc = ed.document
      if (doc[doc.length - 1]?.id === targetId) {
        ed.insertBlocks([{ type: 'paragraph' }], targetId, 'after')
      }
      try {
        ed.setTextCursorPosition(targetId, 'end') // inline-content blocks: caret inside
      } catch {
        // content:'none' block (database, drawing) has no text caret — move to the next block.
        const d = ed.document
        const next = d[d.findIndex((b: { id: string }) => b.id === targetId) + 1]
        if (next) ed.setTextCursorPosition(next, 'end')
      }
    }
    const callout = {
      title: 'Callout',
      subtext: 'Coloured note box',
      aliases: ['callout', 'note', 'info', 'tip', 'warning', 'danger'],
      group: 'Basic blocks',
      onItemClick: () => placeBlock({ type: 'callout', props: { kind: 'info' } }),
    }
    const math = {
      title: 'Math',
      subtext: 'KaTeX block formula',
      aliases: ['math', 'katex', 'latex', 'equation', 'formula'],
      group: 'Basic blocks',
      onItemClick: () => placeBlock({ type: 'math', content: 'e = mc^2' }),
    }
    const database = {
      title: 'Database',
      subtext: 'Table of typed rows',
      aliases: ['database', 'table', 'grid', 'db'],
      group: 'Basic blocks',
      onItemClick: async () => {
        if (!documentId) return
        const res = await fetch('/api/databases', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ documentId }),
        })
        if (!res.ok) return
        const created = await res.json()
        placeBlock({ type: 'databaseTable', props: { databaseId: created.id } })
      },
    }
    const drawing = {
      title: 'Drawing',
      subtext: 'Inline Excalidraw sketch',
      aliases: ['drawing', 'draw', 'sketch', 'excalidraw', 'diagram', 'whiteboard'],
      group: 'Basic blocks',
      onItemClick: () => placeBlock({ type: 'drawing', props: { scene: '' } }),
    }
    return filterSuggestionItems(
      [
        ...getDefaultReactSlashMenuItems(ed),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        callout as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        math as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        database as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        drawing as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(aiItems as any[]),
      ],
      query,
    )
  }

  // Themed confirm modal, styled from the app's global CSS tokens (the island mounts inside
  // the Vue DOM, so the tokens cascade in). Overlay click / Cancel = keep; Delete = remove.
  function renderConfirm() {
    if (!confirm) return null
    const n = confirm.types.length
    const title =
      n === 1
        ? `Delete this ${MEDIA_NOUN[confirm.types[0]] ?? 'attachment'}?`
        : `Delete ${n} attachments?`
    return createElement(
      'div',
      {
        role: 'presentation',
        onMouseDown: () => closeConfirm(false),
        style: {
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(15,23,42,0.32)',
          padding: '1rem',
        },
      },
      createElement(
        'div',
        {
          role: 'alertdialog',
          'aria-modal': 'true',
          'aria-label': title,
          onMouseDown: (e: { stopPropagation: () => void }) => e.stopPropagation(),
          style: {
            width: '100%',
            maxWidth: '22rem',
            background: 'var(--color-surface, #fff)',
            color: 'var(--color-text, #334155)',
            border: '1px solid var(--color-border, #e2e8f0)',
            borderRadius: 'var(--radius-card, 12px)',
            boxShadow: '0 10px 40px rgba(15,23,42,0.18)',
            padding: '1.25rem',
          },
        },
        createElement(
          'h2',
          {
            style: {
              margin: 0,
              fontSize: '0.95rem',
              fontWeight: 600,
              color: 'var(--color-heading, #0f172a)',
            },
          },
          title,
        ),
        createElement(
          'p',
          {
            style: {
              margin: '0.4rem 0 1.1rem',
              fontSize: '0.85rem',
              color: 'var(--color-text-muted, #64748b)',
            },
          },
          'This removes it from the note. This cannot be undone.',
        ),
        createElement(
          'div',
          { style: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' } },
          createElement(
            'button',
            {
              type: 'button',
              onClick: () => closeConfirm(false),
              style: {
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                borderRadius: 'var(--radius-input, 4px)',
                border: '1px solid var(--color-border, #e2e8f0)',
                background: 'var(--color-surface, #fff)',
                color: 'var(--color-text, #334155)',
                cursor: 'pointer',
              },
            },
            'Cancel',
          ),
          createElement(
            'button',
            {
              type: 'button',
              autoFocus: true,
              onClick: () => closeConfirm(true),
              style: {
                padding: '0.4rem 0.85rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                borderRadius: 'var(--radius-input, 4px)',
                border: '1px solid #dc2626',
                background: '#dc2626',
                color: '#fff',
                cursor: 'pointer',
              },
            },
            'Delete',
          ),
        ),
      ),
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const View = BlockNoteView as any
  return createElement(
    Fragment,
    null,
    createElement(
      View,
      {
        editor,
        editable,
        theme,
        slashMenu: false,
        // Disable the built-in toolbar; we render our own FormattingToolbarController
        // below. Without this, BOTH render and overlap, and neither applies styles.
        formattingToolbar: false,
        onChange: () => onChange?.(editor.document as unknown[]),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(SuggestionMenuController as any, {
        triggerCharacter: '/',
        getItems: getSlashItems,
      }),
      // Custom side menu: default buttons + "Copy link to block" in the drag handle menu.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(SideMenuController as any, {
        sideMenu: CustomSideMenu,
      }),
      // Custom selection toolbar = default items + an inline "code" toggle + copy-link button.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createElement(FormattingToolbarController as any, {
        formattingToolbar: () =>
          createElement(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            FormattingToolbar as any,
            null,
            ...getFormattingToolbarItems(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createElement(BasicTextStyleButton as any, { key: 'code', basicTextStyle: 'code' }),
            // "Copy link to this block" — uses the block at the text cursor position.
            createElement(CopyLinkToolbarButton, { key: 'copylink', editor: ed }),
          ),
      }),
    ),
    renderConfirm(),
  )
}
