import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'

// Four callout types (§11). createReactBlockSpec returns a factory — call it where added to the
// schema (blockSpecs: { callout: Callout() }). createElement only (no JSX) per gotchas.
export const CALLOUT_KINDS = ['info', 'warning', 'important', 'tip'] as const

// Filled Phosphor icons (viewBox 0 0 256 256), coloured via currentColor.
const ICON_PATHS: Record<string, string> = {
  info: 'M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm-4,48a12,12,0,1,1-12,12A12,12,0,0,1,124,72Zm12,112a16,16,0,0,1-16-16V128a8,8,0,0,1,0-16,16,16,0,0,1,16,16v40a8,8,0,0,1,0,16Z',
  warning:
    'M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM120,104a8,8,0,0,1,16,0v40a8,8,0,0,1-16,0Zm8,88a12,12,0,1,1,12-12A12,12,0,0,1,128,192Z',
  important:
    'M240,128a15.85,15.85,0,0,0-4.67-11.28L139.28,20.69a16,16,0,0,0-22.56,0L20.67,116.72A15.85,15.85,0,0,0,16,128a15.85,15.85,0,0,0,4.67,11.28l96.05,96a16,16,0,0,0,22.56,0l96.05-96A15.85,15.85,0,0,0,240,128ZM120,80a8,8,0,0,1,16,0v56a8,8,0,0,1-16,0Zm8,104a12,12,0,1,1,12-12A12,12,0,0,1,128,184Z',
  tip: 'M176,232a8,8,0,0,1-8,8H88a8,8,0,0,1,0-16h80A8,8,0,0,1,176,232Zm40-128a87.55,87.55,0,0,1-33.64,69.21A16.24,16.24,0,0,0,176,186v6a16,16,0,0,1-16,16H96a16,16,0,0,1-16-16v-6a16,16,0,0,0-6.23-12.66A87.59,87.59,0,0,1,40,104.49C39.74,56.83,78.26,17.14,125.88,16A88,88,0,0,1,216,104Z',
}

export const Callout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: { kind: { default: 'info', values: ['info', 'warning', 'important', 'tip'] } },
    content: 'inline',
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const kind: string = props?.block?.props?.kind || 'info'
      const icon = createElement(
        'svg',
        { viewBox: '0 0 256 256', fill: 'currentColor', xmlns: 'http://www.w3.org/2000/svg' },
        createElement('path', { d: ICON_PATHS[kind] || ICON_PATHS.info }),
      )
      return createElement(
        'div',
        { className: `nb-callout nb-callout-${kind}`, 'data-kind': kind },
        createElement('span', { className: 'nb-callout-icon', contentEditable: false }, icon),
        createElement('div', { className: 'nb-callout-body', ref: props.contentRef }),
      )
    },
  },
)
