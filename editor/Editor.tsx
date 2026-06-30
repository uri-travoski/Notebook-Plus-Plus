import { createElement } from 'react'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { BlockNoteSchema, defaultBlockSpecs, filterSuggestionItems } from '@blocknote/core'
import { Callout } from './blocks/Callout'
import { MathBlock } from './blocks/MathBlock'
import '@blocknote/mantine/style.css'
import 'katex/dist/katex.min.css'
import './editor.css'

// Default blocks + our custom blocks. createReactBlockSpec returns a factory, so
// each block is added as `Callout()` / `MathBlock()`. Most of §11 is already native.
const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, callout: Callout(), math: MathBlock() },
})

type Props = {
  initialContent?: unknown[]
  editable?: boolean
  onChange?: (doc: unknown[]) => void
}

export default function Editor({ initialContent, editable = true, onChange }: Props) {
  const editor = useCreateBlockNote({
    schema,
    initialContent:
      Array.isArray(initialContent) && initialContent.length
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (initialContent as any)
        : undefined,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ed = editor as any

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
    return filterSuggestionItems(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [...getDefaultReactSlashMenuItems(ed), callout as any, math as any],
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
      theme: 'light',
      slashMenu: false,
      onChange: () => onChange?.(editor.document as unknown[]),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createElement(SuggestionMenuController as any, {
      triggerCharacter: '/',
      getItems: getSlashItems,
    }),
  )
}
