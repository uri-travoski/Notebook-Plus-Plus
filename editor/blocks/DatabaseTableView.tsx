import { createElement as h, useEffect, useRef, useState } from 'react'
import { generateKeyBetween } from 'fractional-indexing'

// Notion-style editable database block with two views: a spreadsheet Table and a
// Kanban board grouped by a Select column. Hand-rolled (createElement, no JSX) —
// vue-jsx claims .tsx in this repo, so the island must avoid JSX. Data lives
// relationally; the block stores only { databaseId, view, groupBy }.

const TYPES = ['text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url'] as const
const TYPE_LABEL: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  multiselect: 'Multi-select',
  date: 'Date',
  checkbox: 'Checkbox',
  url: 'URL',
}
const GUTTER = 32
const DEFAULT_W = 200
const MIN_W = 88

type Column = { id: string; name: string; type: string; options?: string[]; width?: number }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { id: string; values: Record<string, any>; position?: string }
type DbData = { id: string; name: string; columns: Column[]; rows: Row[] }

type Props = {
  databaseId: string
  view?: string
  groupBy?: string
  onView?: (view: string, groupBy: string) => void
}

// Small stroke icons per property type (geometric, 24-grid).
const ICON_PATHS: Record<string, string[]> = {
  text: ['M5 7V5h14v2', 'M12 5v14', 'M9 19h6'],
  number: ['M8 4 6 20', 'M18 4 16 20', 'M4 9h16', 'M3 15h16'],
  select: ['M6 9l6 6 6-6'],
  multiselect: ['M9 6h11', 'M9 12h11', 'M9 18h11', 'M4.5 6h.01', 'M4.5 12h.01', 'M4.5 18h.01'],
  date: [
    'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
    'M8 3v4',
    'M16 3v4',
    'M4 10h16',
  ],
  checkbox: [
    'M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z',
    'M8.5 12l2.5 2.5 4.5-4.5',
  ],
  url: [
    'M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66l-1.5 1.5',
    'M14 10a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.5-1.5',
  ],
}
function typeIcon(type: string, size = 14) {
  return h(
    'svg',
    {
      className: 'nb-db-typeicon',
      viewBox: '0 0 24 24',
      width: size,
      height: size,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.8,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    ...(ICON_PATHS[type] || ICON_PATHS.text).map((d, i) => h('path', { key: i, d })),
  )
}

// Deterministic pill color (0-8) from an option label — stable across reloads.
function pillIdx(s: string) {
  let hnum = 0
  for (let i = 0; i < s.length; i++) hnum = (hnum * 31 + s.charCodeAt(i)) >>> 0
  return hnum % 9
}

function cid() {
  // crypto.randomUUID needs a secure context (fails over http on a LAN IP); use a plain id.
  return 'col_' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string, method = 'GET', body?: any) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error('api ' + res.status)
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

type MenuState = null | {
  kind: 'col' | 'newcol' | 'select'
  x: number
  y: number
  colId?: string
  colIndex?: number
  rowId?: string
}

export default function DatabaseTableView({ databaseId, view, groupBy, onView }: Props) {
  const [db, setDb] = useState<DbData | null>(null)
  const [mode, setMode] = useState<string>(view === 'kanban' ? 'kanban' : 'table')
  const [groupCol, setGroupCol] = useState<string>(groupBy || '')
  const [overLane, setOverLane] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ rowId: string; colId: string } | null>(null)
  const [menu, setMenu] = useState<MenuState>(null)
  const [rowDragOver, setRowDragOver] = useState<{ id: string; after: boolean } | null>(null)
  const resizeRef = useRef<{ colId: string; startX: number; startW: number } | null>(null)
  const dragRowRef = useRef<string | null>(null)

  useEffect(() => {
    let alive = true
    api('/api/databases/' + databaseId)
      .then((d) => alive && setDb(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [databaseId])

  // Column resize: track pointer while dragging a header edge.
  useEffect(() => {
    function move(e: PointerEvent) {
      const r = resizeRef.current
      if (!r) return
      const w = Math.max(MIN_W, r.startW + (e.clientX - r.startX))
      setDb((p) =>
        p
          ? { ...p, columns: p.columns.map((c) => (c.id === r.colId ? { ...c, width: w } : c)) }
          : p,
      )
    }
    function up() {
      const r = resizeRef.current
      if (!r) return
      resizeRef.current = null
      document.body.style.cursor = ''
      setDb((p) => {
        if (p) api('/api/databases/' + databaseId, 'PATCH', { columns: p.columns }).catch(() => {})
        return p
      })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [databaseId])

  // Close any open menu on Escape.
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenu(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  if (!db) return h('div', { className: 'nb-db-loading' }, 'Loading table…')
  const columns = db.columns || []
  const rows = db.rows || []
  const selectCols = columns.filter((c) => c.type === 'select')
  const colW = (c: Column) => c.width || DEFAULT_W

  const changeMode = (m: string) => {
    setMode(m)
    onView?.(m, groupCol)
  }
  const changeGroup = (g: string) => {
    setGroupCol(g)
    onView?.(mode, g)
  }

  const saveColumns = (cols: Column[]) => {
    setDb((p) => (p ? { ...p, columns: cols } : p))
    api('/api/databases/' + databaseId, 'PATCH', { columns: cols }).catch(() => {})
  }
  const patchColumn = (id: string, patch: Partial<Column>) =>
    saveColumns(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const deleteColumn = (id: string) => saveColumns(columns.filter((c) => c.id !== id))
  const insertColumn = (at: number) => {
    const col: Column = { id: cid(), name: 'Column ' + (columns.length + 1), type: 'text' }
    const next = columns.slice()
    next.splice(at, 0, col)
    saveColumns(next)
    return col
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addRow = async (preset: Record<string, any> = {}) => {
    const row = await api('/api/databases/' + databaseId + '/rows', 'POST', { values: preset })
    if (row) setDb((p) => (p ? { ...p, rows: [...p.rows, row] } : p))
  }
  const deleteRow = (id: string) => {
    setDb((p) => (p ? { ...p, rows: p.rows.filter((r) => r.id !== id) } : p))
    api('/api/databases/' + databaseId + '/rows/' + id, 'DELETE').catch(() => {})
  }
  const duplicateRow = async (r: Row) => {
    const row = await api('/api/databases/' + databaseId + '/rows', 'POST', { values: r.values })
    if (row) setDb((p) => (p ? { ...p, rows: [...p.rows, row] } : p))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateCell = (rowId: string, colId: string, value: any) => {
    const row = rows.find((r) => r.id === rowId)
    const values = { ...(row?.values ?? {}), [colId]: value }
    setDb((p) =>
      p ? { ...p, rows: p.rows.map((r) => (r.id === rowId ? { ...r, values } : r)) } : p,
    )
    api('/api/databases/' + databaseId + '/rows/' + rowId, 'PATCH', { values }).catch(() => {})
  }

  // Drag-reorder a row using fractional-indexing between its new neighbours.
  const moveRow = (dragId: string, targetId: string, after: boolean) => {
    if (dragId === targetId) return
    const ordered = rows.filter((r) => r.id !== dragId)
    let idx = ordered.findIndex((r) => r.id === targetId)
    if (idx < 0) return
    if (after) idx += 1
    const left = ordered[idx - 1]?.position ?? null
    const right = ordered[idx]?.position ?? null
    let pos: string
    try {
      pos = generateKeyBetween(left, right)
    } catch {
      return
    }
    setDb((p) => {
      if (!p) return p
      const next = p.rows
        .map((r) => (r.id === dragId ? { ...r, position: pos } : r))
        .sort((a, b) => (a.position || '').localeCompare(b.position || ''))
      return { ...p, rows: next }
    })
    api('/api/databases/' + databaseId + '/rows/' + dragId, 'PATCH', { position: pos }).catch(
      () => {},
    )
  }

  const addOption = (col: Column, name: string) => {
    const opts = col.options ?? []
    if (!opts.includes(name)) patchColumn(col.id, { options: [...opts, name] })
  }

  // ---------- cell display (not-editing) ----------
  function pill(label: string, onRemove?: () => void) {
    return h(
      'span',
      { key: label, className: 'nb-pill nb-pill--' + pillIdx(label) },
      label,
      onRemove
        ? h(
            'button',
            {
              type: 'button',
              className: 'nb-pill-x',
              'aria-label': 'Remove',
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                onRemove()
              },
            },
            '×',
          )
        : null,
    )
  }

  function displayCell(row: Row, col: Column) {
    const v = row.values?.[col.id]
    if (col.type === 'checkbox')
      return h('input', {
        type: 'checkbox',
        className: 'nb-db-check',
        checked: !!v,
        onChange: (e: { target: { checked: boolean } }) =>
          updateCell(row.id, col.id, e.target.checked),
      })
    if (col.type === 'select') return v ? pill(String(v)) : h('span', { className: 'nb-db-empty' })
    if (col.type === 'multiselect') {
      const arr = Array.isArray(v) ? v : []
      return arr.length
        ? h('div', { className: 'nb-db-pills' }, ...arr.map((o: string) => pill(o)))
        : h('span', { className: 'nb-db-empty' })
    }
    if (col.type === 'url' && v)
      return h(
        'a',
        {
          className: 'nb-db-link',
          href: /^https?:\/\//.test(v) ? v : 'https://' + v,
          target: '_blank',
          rel: 'noreferrer',
          onClick: (e: MouseEvent) => e.stopPropagation(),
        },
        String(v),
      )
    if (v === undefined || v === null || v === '') return h('span', { className: 'nb-db-empty' })
    return h('span', { className: 'nb-db-val' }, String(v))
  }

  // ---------- cell edit (active) ----------
  function editCell(row: Row, col: Column) {
    const v = row.values?.[col.id]
    const done = () => setEditing(null)
    const commit = (val: unknown) => {
      updateCell(row.id, col.id, val)
    }
    const common = {
      className: 'nb-db-input',
      autoFocus: true,
      onBlur: done,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onKeyDown: (e: any) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault()
          e.currentTarget.blur()
        }
      },
    }
    if (col.type === 'date')
      return h('input', {
        ...common,
        type: 'date',
        defaultValue: v ?? '',
        onChange: (e: { target: { value: string } }) => commit(e.target.value),
      })
    if (col.type === 'number')
      return h('input', {
        ...common,
        type: 'number',
        defaultValue: v ?? '',
        style: { textAlign: 'right' },
        onBlur: (e: { target: { value: string } }) => {
          commit(e.target.value === '' ? null : Number(e.target.value))
          done()
        },
      })
    return h('input', {
      ...common,
      type: col.type === 'url' ? 'url' : 'text',
      defaultValue: v ?? '',
      onBlur: (e: { target: { value: string } }) => {
        commit(e.target.value)
        done()
      },
    })
  }

  function cellClick(row: Row, col: Column, e: MouseEvent) {
    if (col.type === 'checkbox') return
    if (col.type === 'select' || col.type === 'multiselect') {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setMenu({ kind: 'select', x: r.left, y: r.bottom + 2, colId: col.id, rowId: row.id })
      return
    }
    setEditing({ rowId: row.id, colId: col.id })
  }

  // ---------- table view ----------
  function tableView() {
    const headCell = (col: Column, i: number) =>
      h(
        'div',
        {
          key: col.id,
          className: 'nb-db-cell nb-db-cell--head' + (i === 0 ? ' nb-db-cell--sticky' : ''),
          style: { width: colW(col), left: i === 0 ? GUTTER : undefined },
        },
        h(
          'button',
          {
            type: 'button',
            className: 'nb-db-headbtn',
            onClick: (e: MouseEvent) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setMenu({ kind: 'col', x: r.left, y: r.bottom + 2, colId: col.id, colIndex: i })
            },
          },
          typeIcon(col.type),
          h('span', { className: 'nb-db-headname' }, col.name),
        ),
        h('span', {
          className: 'nb-db-resize',
          onPointerDown: (e: PointerEvent) => {
            e.preventDefault()
            e.stopPropagation()
            resizeRef.current = { colId: col.id, startX: e.clientX, startW: colW(col) }
            document.body.style.cursor = 'col-resize'
          },
          onDoubleClick: () => patchColumn(col.id, { width: DEFAULT_W }),
        }),
      )

    const bodyRow = (row: Row, idx: number) =>
      h(
        'div',
        {
          key: row.id,
          className:
            'nb-db-row' +
            (rowDragOver?.id === row.id
              ? rowDragOver.after
                ? ' drop-after'
                : ' drop-before'
              : ''),
          onDragOver: (e: DragEvent) => {
            e.preventDefault()
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            setRowDragOver({ id: row.id, after: e.clientY > r.top + r.height / 2 })
          },
          onDrop: (e: DragEvent) => {
            const id = e.dataTransfer?.getData('text/plain') || dragRowRef.current
            if (!id) return
            e.preventDefault()
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
            moveRow(id, row.id, e.clientY > r.top + r.height / 2)
            dragRowRef.current = null
            setRowDragOver(null)
          },
        },
        // gutter: row number + drag grip + row menu
        h(
          'div',
          { className: 'nb-db-cell nb-db-gutter', style: { left: 0 } },
          h('span', { className: 'nb-db-rownum' }, String(idx + 1)),
          h(
            'button',
            {
              type: 'button',
              className: 'nb-db-grip',
              title: 'Drag to reorder · click for options',
              draggable: true,
              onDragStart: (e: DragEvent) => {
                dragRowRef.current = row.id
                e.dataTransfer?.setData('text/plain', row.id)
              },
              onDragEnd: () => {
                dragRowRef.current = null
                setRowDragOver(null)
              },
              onClick: (e: MouseEvent) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenu({ kind: 'col', x: r.left, y: r.bottom + 2, rowId: row.id })
              },
            },
            h('span', { className: 'nb-db-gripdots' }, '⠿'),
          ),
        ),
        ...columns.map((col, i) =>
          h(
            'div',
            {
              key: col.id,
              className:
                'nb-db-cell' +
                (i === 0 ? ' nb-db-cell--sticky' : '') +
                (col.type === 'number' ? ' nb-db-cell--num' : '') +
                (editing?.rowId === row.id && editing?.colId === col.id ? ' is-editing' : ''),
              style: { width: colW(col), left: i === 0 ? GUTTER : undefined },
              onMouseDown: (e: MouseEvent) => {
                // let the checkbox handle its own click
                if (col.type === 'checkbox') return
                if (editing?.rowId === row.id && editing?.colId === col.id) return
                e.preventDefault()
              },
              onClick: (e: MouseEvent) => {
                if (editing?.rowId === row.id && editing?.colId === col.id) return
                cellClick(row, col, e)
              },
            },
            editing?.rowId === row.id && editing?.colId === col.id
              ? editCell(row, col)
              : displayCell(row, col),
          ),
        ),
        // spacer under the add-column header so borders line up
        h('div', { className: 'nb-db-cell nb-db-cell--pad' }),
      )

    return h(
      'div',
      { className: 'nb-db-grid' },
      // header
      h(
        'div',
        { className: 'nb-db-row nb-db-head' },
        h('div', { className: 'nb-db-cell nb-db-gutter nb-db-gutter--head', style: { left: 0 } }),
        ...columns.map((c, i) => headCell(c, i)),
        h(
          'div',
          { className: 'nb-db-cell nb-db-cell--head nb-db-addcol' },
          h(
            'button',
            {
              type: 'button',
              className: 'nb-db-addcol-btn',
              title: 'Add a property',
              onClick: (e: MouseEvent) => {
                const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
                setMenu({
                  kind: 'newcol',
                  x: r.right - 220,
                  y: r.bottom + 2,
                  colIndex: columns.length,
                })
              },
            },
            '+',
          ),
        ),
      ),
      // body
      ...rows.map((r, i) => bodyRow(r, i)),
      // add row
      h(
        'button',
        { type: 'button', className: 'nb-db-newrow', onClick: () => addRow() },
        h('span', { className: 'nb-db-newrow-plus' }, '+'),
        'New',
      ),
    )
  }

  // ---------- popovers ----------
  function menuNode() {
    if (!menu) return null
    const stop = (e: MouseEvent) => e.stopPropagation()
    const close = () => setMenu(null)
    const style = { left: Math.max(8, menu.x), top: menu.y }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let body: any[] = []
    if (menu.kind === 'col' && menu.colId) {
      const col = columns.find((c) => c.id === menu.colId)
      if (!col) return null
      body = [
        h('input', {
          key: 'name',
          className: 'nb-db-menu-input',
          defaultValue: col.name,
          autoFocus: true,
          'aria-label': 'Property name',
          onKeyDown: (e: { key: string; currentTarget: HTMLInputElement }) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          },
          onBlur: (e: { target: { value: string } }) =>
            patchColumn(col.id, { name: e.target.value.trim() || 'Column' }),
        }),
        h('div', { key: 'tl', className: 'nb-db-menu-label' }, 'Type'),
        h(
          'div',
          { key: 'types', className: 'nb-db-typegrid' },
          ...TYPES.map((t) =>
            h(
              'button',
              {
                key: t,
                type: 'button',
                className: 'nb-db-typeopt' + (col.type === t ? ' is-active' : ''),
                onClick: () =>
                  patchColumn(col.id, {
                    type: t,
                    options:
                      t === 'select' || t === 'multiselect' ? (col.options ?? []) : col.options,
                  }),
              },
              typeIcon(t, 15),
              h('span', null, TYPE_LABEL[t]),
            ),
          ),
        ),
        h('div', { key: 's1', className: 'nb-db-menu-sep' }),
        h(
          'button',
          {
            key: 'il',
            type: 'button',
            className: 'nb-db-menu-item',
            onClick: () => {
              insertColumn(menu.colIndex ?? columns.length)
              close()
            },
          },
          '↤  Insert left',
        ),
        h(
          'button',
          {
            key: 'ir',
            type: 'button',
            className: 'nb-db-menu-item',
            onClick: () => {
              insertColumn((menu.colIndex ?? columns.length) + 1)
              close()
            },
          },
          '↦  Insert right',
        ),
        h('div', { key: 's2', className: 'nb-db-menu-sep' }),
        h(
          'button',
          {
            key: 'del',
            type: 'button',
            className: 'nb-db-menu-item is-danger',
            onClick: () => {
              deleteColumn(col.id)
              close()
            },
          },
          '🗑  Delete property',
        ),
      ]
    } else if (menu.kind === 'col' && menu.rowId) {
      const row = rows.find((r) => r.id === menu.rowId)
      if (!row) return null
      body = [
        h(
          'button',
          {
            key: 'dup',
            type: 'button',
            className: 'nb-db-menu-item',
            onClick: () => {
              duplicateRow(row)
              close()
            },
          },
          '⧉  Duplicate row',
        ),
        h(
          'button',
          {
            key: 'del',
            type: 'button',
            className: 'nb-db-menu-item is-danger',
            onClick: () => {
              deleteRow(row.id)
              close()
            },
          },
          '🗑  Delete row',
        ),
      ]
    } else if (menu.kind === 'newcol') {
      let name = ''
      let type = 'text'
      const create = () => {
        const col: Column = { id: cid(), name: name.trim() || 'New property', type }
        const next = columns.slice()
        next.splice(menu.colIndex ?? columns.length, 0, col)
        saveColumns(next)
        close()
      }
      body = [
        h('input', {
          key: 'n',
          className: 'nb-db-menu-input',
          placeholder: 'Property name',
          autoFocus: true,
          onChange: (e: { target: { value: string } }) => (name = e.target.value),
          onKeyDown: (e: { key: string }) => {
            if (e.key === 'Enter') create()
          },
        }),
        h('div', { key: 'tl', className: 'nb-db-menu-label' }, 'Type'),
        h(
          'div',
          { key: 'types', className: 'nb-db-typegrid' },
          ...TYPES.map((t) =>
            h(
              'button',
              {
                key: t,
                type: 'button',
                className: 'nb-db-typeopt' + (type === t ? ' is-active' : ''),
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick: (e: any) => {
                  type = t
                  const grid = (e.currentTarget as HTMLElement).parentElement
                  grid
                    ?.querySelectorAll('.nb-db-typeopt')
                    .forEach((b) => b.classList.remove('is-active'))
                  ;(e.currentTarget as HTMLElement).classList.add('is-active')
                },
              },
              typeIcon(t, 15),
              h('span', null, TYPE_LABEL[t]),
            ),
          ),
        ),
        h(
          'button',
          { key: 'go', type: 'button', className: 'nb-db-menu-cta', onClick: create },
          'Add property',
        ),
      ]
    } else if (menu.kind === 'select' && menu.colId && menu.rowId) {
      const col = columns.find((c) => c.id === menu.colId)
      const row = rows.find((r) => r.id === menu.rowId)
      if (!col || !row) return null
      const multi = col.type === 'multiselect'
      const cur: string[] = multi
        ? Array.isArray(row.values?.[col.id])
          ? row.values[col.id]
          : []
        : row.values?.[col.id]
          ? [row.values[col.id]]
          : []
      const set = (opts: string[]) =>
        updateCell(row.id, col.id, multi ? opts : (opts[opts.length - 1] ?? ''))
      const toggle = (o: string) => {
        if (multi) set(cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o])
        else {
          set(cur.includes(o) ? [] : [o])
          if (!cur.includes(o)) close()
        }
      }
      body = [
        h('input', {
          key: 'search',
          className: 'nb-db-menu-input',
          placeholder: multi ? 'Search or add option…' : 'Search or add option…',
          autoFocus: true,
          onKeyDown: (e: { key: string; currentTarget: HTMLInputElement }) => {
            if (e.key === 'Enter') {
              const val = e.currentTarget.value.trim()
              if (!val) return
              addOption(col, val)
              toggle(val)
              e.currentTarget.value = ''
            }
          },
        }),
        h('div', { key: 'lbl', className: 'nb-db-menu-label' }, 'Select an option'),
        h(
          'div',
          { key: 'opts', className: 'nb-db-optlist' },
          ...(col.options ?? []).map((o) =>
            h(
              'button',
              {
                key: o,
                type: 'button',
                className: 'nb-db-optrow',
                onClick: () => toggle(o),
              },
              h('span', { className: 'nb-pill nb-pill--' + pillIdx(o) }, o),
              cur.includes(o) ? h('span', { className: 'nb-db-optcheck' }, '✓') : null,
            ),
          ),
          (col.options ?? []).length === 0
            ? h('div', { className: 'nb-db-menu-hint' }, 'Type a name and press Enter to add.')
            : null,
        ),
      ]
    }

    return h(
      'div',
      { className: 'nb-db-backdrop', onClick: close, contentEditable: false },
      h('div', { className: 'nb-db-menu', style, onClick: stop }, ...body),
    )
  }

  // ---------- board (kanban) view ----------
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function chipText(col: Column, v: any) {
    if (v === undefined || v === null || v === '') return ''
    if (col.type === 'checkbox') return v ? '✓' : ''
    if (col.type === 'multiselect') return Array.isArray(v) ? v.join(', ') : String(v)
    return String(v)
  }
  function card(row: Row, groupColId: string, titleCol?: Column) {
    const chips = columns
      .filter((c) => c.id !== groupColId && c.id !== titleCol?.id)
      .map((c) => ({ c, t: chipText(c, row.values?.[c.id]) }))
      .filter((x) => x.t)
    return h(
      'div',
      {
        key: row.id,
        className: 'nb-kanban-card',
        draggable: true,
        onDragStart: (e: { dataTransfer: DataTransfer }) =>
          e.dataTransfer.setData('text/plain', row.id),
      },
      titleCol
        ? h('input', {
            className: 'nb-kanban-title',
            defaultValue: row.values?.[titleCol.id] ?? '',
            placeholder: 'Untitled',
            onBlur: (e: { target: { value: string } }) =>
              updateCell(row.id, titleCol.id, e.target.value),
          })
        : h('span', { className: 'nb-kanban-title' }, 'Card'),
      chips.length
        ? h(
            'div',
            { className: 'nb-kanban-chips' },
            ...chips.map(({ c, t }) => h('span', { key: c.id, className: 'nb-kanban-chip' }, t)),
          )
        : null,
      h(
        'button',
        {
          className: 'nb-kanban-cardx',
          type: 'button',
          title: 'Delete card',
          onClick: () => deleteRow(row.id),
        },
        '×',
      ),
    )
  }
  function lane(value: string, label: string, groupColId: string, titleCol?: Column) {
    const laneRows = rows.filter((r) => (r.values?.[groupColId] ?? '') === value)
    return h(
      'div',
      {
        key: value || '__none__',
        className:
          'nb-kanban-lane nb-kanban-lane--' +
          pillIdx(label) +
          (overLane === (value || '__none__') ? ' is-over' : ''),
        onDragOver: (e: { preventDefault: () => void }) => e.preventDefault(),
        onDragEnter: () => setOverLane(value || '__none__'),
        onDragLeave: () => setOverLane((p) => (p === (value || '__none__') ? null : p)),
        onDrop: (e: { preventDefault: () => void; dataTransfer: DataTransfer }) => {
          e.preventDefault()
          setOverLane(null)
          const rowId = e.dataTransfer.getData('text/plain')
          if (rowId) updateCell(rowId, groupColId, value || null)
        },
      },
      h(
        'div',
        { className: 'nb-kanban-lane-h' },
        value
          ? h('span', { className: 'nb-pill nb-pill--' + pillIdx(label) }, label)
          : h('span', { className: 'nb-kanban-lane-name' }, label),
        h('span', { className: 'nb-kanban-lane-count' }, String(laneRows.length)),
      ),
      h(
        'div',
        { className: 'nb-kanban-lane-body' },
        ...laneRows.map((r) => card(r, groupColId, titleCol)),
      ),
      h(
        'button',
        {
          className: 'nb-kanban-add',
          type: 'button',
          onClick: () => addRow(value ? { [groupColId]: value } : {}),
        },
        '+ New',
      ),
    )
  }
  function kanbanView() {
    const groupColId =
      groupCol && columns.some((c) => c.id === groupCol) ? groupCol : selectCols[0]?.id
    const groupColumn = columns.find((c) => c.id === groupColId)
    if (!groupColumn)
      return h(
        'div',
        { className: 'nb-kanban-empty' },
        'The board view groups cards by a Select column. Add a Select column in Table view first.',
      )
    const titleCol =
      columns.find((c) => c.type === 'text') || columns.find((c) => c.id !== groupColId)
    const lanes = [
      ...(groupColumn.options ?? []).map((o) => lane(o, o, groupColId!, titleCol)),
      lane('', 'No ' + groupColumn.name, groupColId!, titleCol),
    ]
    return h('div', { className: 'nb-kanban' }, ...lanes)
  }

  // ---------- toolbar ----------
  const toolbar = h(
    'div',
    { className: 'nb-db-toolbar' },
    h(
      'div',
      { className: 'nb-db-views' },
      h(
        'button',
        {
          type: 'button',
          className: 'nb-db-viewbtn' + (mode !== 'kanban' ? ' is-active' : ''),
          onClick: () => changeMode('table'),
        },
        'Table',
      ),
      h(
        'button',
        {
          type: 'button',
          className: 'nb-db-viewbtn' + (mode === 'kanban' ? ' is-active' : ''),
          onClick: () => changeMode('kanban'),
        },
        'Board',
      ),
    ),
    mode === 'kanban' && selectCols.length
      ? h(
          'label',
          { className: 'nb-db-groupby' },
          'Group by',
          h(
            'select',
            {
              value: groupCol || selectCols[0].id,
              onChange: (e: { target: { value: string } }) => changeGroup(e.target.value),
            },
            ...selectCols.map((c) => h('option', { key: c.id, value: c.id }, c.name)),
          ),
        )
      : null,
    h(
      'span',
      { className: 'nb-db-toolbar-count' },
      rows.length + (rows.length === 1 ? ' row' : ' rows'),
    ),
  )

  return h(
    'div',
    { className: 'nb-db', contentEditable: false },
    toolbar,
    mode === 'kanban' ? kanbanView() : tableView(),
    menuNode(),
  )
}
