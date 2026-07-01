import { createElement } from 'react'
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

// Shiki highlighting forced to a single LIGHT theme so tokens read on the light code surface
// (the package otherwise applies github-dark regardless of editor theme).
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
const codeBlock = {
  ...codeBlockOptions,
  supportedLanguages: Object.fromEntries(
    Object.entries(codeBlockOptions.supportedLanguages).filter(([k]) => CODE_LANGS.includes(k)),
  ),
  createHighlighter: () => createHighlighter({ themes: ['github-light'], langs: CODE_LANGS }),
}

// Default blocks + our custom blocks. createReactBlockSpec returns a factory, so
// each block is added as `Callout()` / `MathBlock()`. Most of §11 is already native.
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    codeBlock: createCodeBlockSpec(codeBlock), // Shiki syntax highlighting (§11)
    callout: Callout(),
    math: MathBlock(),
    databaseTable: DatabaseTable(),
    drawing: Drawing(),
  },
})

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
    const callout = {
      title: 'Callout',
      subtext: 'Coloured note box',
      aliases: ['callout', 'note', 'info', 'tip', 'warning', 'danger'],
      group: 'Basic blocks',
      onItemClick: () => {
        const block = ed.getTextCursorPosition().block
        ed.insertBlocks([{ type: 'callout', props: { kind: 'info' } }], block, 'after')
      },
    }
    const math = {
      title: 'Math',
      subtext: 'KaTeX block formula',
      aliases: ['math', 'katex', 'latex', 'equation', 'formula'],
      group: 'Basic blocks',
      onItemClick: () => {
        const block = ed.getTextCursorPosition().block
        ed.insertBlocks([{ type: 'math', content: 'e = mc^2' }], block, 'after')
      },
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
        const block = ed.getTextCursorPosition().block
        ed.insertBlocks(
          [{ type: 'databaseTable', props: { databaseId: created.id } }],
          block,
          'after',
        )
      },
    }
    const drawing = {
      title: 'Drawing',
      subtext: 'Inline Excalidraw sketch',
      aliases: ['drawing', 'draw', 'sketch', 'excalidraw', 'diagram', 'whiteboard'],
      group: 'Basic blocks',
      onItemClick: () => {
        const block = ed.getTextCursorPosition().block
        ed.insertBlocks([{ type: 'drawing', props: { scene: '' } }], block, 'after')
      },
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
