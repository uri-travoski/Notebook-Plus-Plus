import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'
import DrawingView from './DrawingView'

// Inline Excalidraw drawing block (§13). The scene JSON lives in the block's `scene` prop,
// so it travels with the document content (no separate table).
export const Drawing = createReactBlockSpec(
  { type: 'drawing', propSchema: { scene: { default: '' } }, content: 'none' },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const block = props.block
      const editor = props.editor
      return createElement(DrawingView, {
        scene: (block?.props?.scene as string) ?? '',
        editable: !!editor?.isEditable,
        onChange: (json: string) =>
          editor.updateBlock(block, { type: 'drawing', props: { scene: json } }),
      })
    },
  },
)
