import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'

// Four callout types (§11). createReactBlockSpec returns a factory — call it where added to the
// schema (blockSpecs: { callout: Callout() }). createElement only (no JSX) per gotchas.
export const CALLOUT_KINDS = ['info', 'warning', 'important', 'tip'] as const

// Per-kind icons (each with its own viewBox + shapes), coloured via currentColor.
type IconChild = { tag: 'path' | 'circle'; attrs: Record<string, unknown> }
const ICONS: Record<string, { viewBox: string; children: IconChild[] }> = {
  tip: {
    viewBox: '0 0 352 512',
    children: [
      {
        tag: 'path',
        attrs: {
          d: 'M96.06 454.35c.01 6.29 1.87 12.45 5.36 17.69l17.09 25.69a31.99 31.99 0 0 0 26.64 14.28h61.71a31.99 31.99 0 0 0 26.64-14.28l17.09-25.69a31.989 31.989 0 0 0 5.36-17.69l.04-38.35H96.01l.05 38.35zM0 176c0 44.37 16.45 84.85 43.56 115.78 16.52 18.85 42.36 58.23 52.21 91.45.04.26.07.52.11.78h160.24c.04-.26.07-.51.11-.78 9.85-33.22 35.69-72.6 52.21-91.45C335.55 260.85 352 220.37 352 176 352 78.61 272.91-.3 175.45 0 73.44.31 0 82.97 0 176zm176-80c-44.11 0-80 35.89-80 80 0 8.84-7.16 16-16 16s-16-7.16-16-16c0-61.76 50.24-112 112-112 8.84 0 16 7.16 16 16s-7.16 16-16 16z',
        },
      },
    ],
  },
  important: {
    viewBox: '0 0 24 24',
    children: [
      {
        tag: 'path',
        attrs: {
          d: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2m4.24 16L12 15.45 7.77 18l1.12-4.81-3.73-3.23 4.92-.42L12 5l1.92 4.53 4.92.42-3.73 3.23z',
        },
      },
    ],
  },
  warning: {
    viewBox: '0 0 512 512',
    children: [
      {
        tag: 'path',
        attrs: {
          d: 'M228.9 79.9L51.8 403.1C40.6 423.3 55.5 448 78.9 448h354.3c23.3 0 38.2-24.7 27.1-44.9L283.1 79.9c-11.7-21.2-42.5-21.2-54.2 0zM273.6 214L270 336h-28l-3.6-122h35.2zM256 402.4c-10.7 0-19.1-8.1-19.1-18.4s8.4-18.4 19.1-18.4 19.1 8.1 19.1 18.4-8.4 18.4-19.1 18.4z',
        },
      },
    ],
  },
  info: {
    viewBox: '0 0 16 16',
    children: [
      {
        tag: 'path',
        attrs: {
          d: 'M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2',
        },
      },
    ],
  },
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
      const spec = ICONS[kind] || ICONS.info
      const icon = createElement(
        'svg',
        { viewBox: spec.viewBox, fill: 'currentColor', xmlns: 'http://www.w3.org/2000/svg' },
        ...spec.children.map((c, i) => createElement(c.tag, { key: i, ...c.attrs })),
      )
      // In-block type picker (reliable way to change the type after inserting via "/").
      const picker = createElement(
        'select',
        {
          className: 'nb-callout-kind',
          contentEditable: false,
          value: kind,
          title: 'Callout type',
          'aria-label': 'Callout type',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onChange: (e: any) =>
            props.editor.updateBlock(props.block, {
              type: 'callout',
              props: { kind: e.target.value },
            }),
        },
        ...['info', 'warning', 'important', 'tip'].map((k) =>
          createElement('option', { key: k, value: k }, k.charAt(0).toUpperCase() + k.slice(1)),
        ),
      )
      return createElement(
        'div',
        { className: `nb-callout nb-callout-${kind}`, 'data-kind': kind },
        createElement('span', { className: 'nb-callout-icon', contentEditable: false }, icon),
        createElement('div', { className: 'nb-callout-body', ref: props.contentRef }),
        picker,
      )
    },
  },
)
