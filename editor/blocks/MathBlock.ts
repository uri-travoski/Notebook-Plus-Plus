import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'
import katex from 'katex'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function inlineToText(content: any): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c: { text?: string }) => c?.text ?? '').join('')
  return ''
}

// Block-level math: the editable inline content is the LaTeX source; a live,
// non-editable KaTeX preview renders beneath it. createElement only (no JSX).
export const MathBlock = createReactBlockSpec(
  { type: 'math', propSchema: {}, content: 'inline' },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const src = inlineToText(props?.block?.content)
      let html: string
      try {
        html = katex.renderToString(src || '\\,', { throwOnError: false, displayMode: true })
      } catch {
        html = ''
      }
      return createElement(
        'div',
        { className: 'nb-math' },
        createElement('div', { className: 'nb-math-src', ref: props.contentRef }),
        createElement('div', {
          className: 'nb-math-preview',
          contentEditable: false,
          dangerouslySetInnerHTML: { __html: html },
        }),
      )
    },
  },
)
