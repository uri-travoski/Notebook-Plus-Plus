import { createElement } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import './editor.css'

type Props = {
  initialContent?: unknown[]
  editable?: boolean
  onChange?: (doc: unknown[]) => void
}

// The one React component in the app. Written with createElement (no JSX) on
// purpose: Nuxt's vue-jsx and plugin-react both claim .tsx, so avoiding JSX
// syntax sidesteps the transform conflict. Standard BlockNote blocks/marks for
// now; custom blocks are layered in later phases (also via createElement).
export default function Editor({ initialContent, editable = true, onChange }: Props) {
  const editor = useCreateBlockNote({
    initialContent:
      Array.isArray(initialContent) && initialContent.length
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (initialContent as any)
        : undefined,
  })

  // BlockNote's generic block-schema types don't unify cleanly through createElement;
  // runtime behavior is covered by e2e. Loosen the view's prop type.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const View = BlockNoteView as any
  return createElement(View, {
    editor,
    editable,
    theme: 'light',
    onChange: () => onChange?.(editor.document as unknown[]),
  })
}
