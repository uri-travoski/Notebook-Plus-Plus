import { createElement, useMemo } from 'react'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  FormattingToolbarController,
  FormattingToolbar,
  getFormattingToolbarItems,
  BasicTextStyleButton,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const View = BlockNoteView as any
  return createElement(
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
    // Custom selection toolbar = default items + an inline "code" toggle.
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
        ),
    }),
  )
}
