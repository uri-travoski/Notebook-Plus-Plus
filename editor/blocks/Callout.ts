import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'

// createReactBlockSpec returns a factory — call it where you add it to the schema
// (blockSpecs: { callout: Callout() }). createElement only (no JSX) per gotchas.
const EMOJI: Record<string, string> = {
  info: 'ℹ️',
  tip: '💡',
  success: '✅',
  warning: '⚠️',
  danger: '🛑',
}

export const Callout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      kind: { default: 'info', values: ['info', 'tip', 'success', 'warning', 'danger'] },
    },
    content: 'inline',
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const kind: string = props?.block?.props?.kind || 'info'
      return createElement(
        'div',
        { className: `nb-callout nb-callout-${kind}`, 'data-kind': kind },
        createElement(
          'span',
          { className: 'nb-callout-emoji', contentEditable: false },
          EMOJI[kind] || EMOJI.info,
        ),
        createElement('div', { className: 'nb-callout-body', ref: props.contentRef }),
      )
    },
  },
)
