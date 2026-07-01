import { createElement as h, useEffect, useState } from 'react'

// Notion-style editable database block with two views: a spreadsheet Table and a
// Kanban board grouped by a Select column. Hand-rolled (createElement, no JSX) —
// for a single in-document view this is simpler and lighter than wiring TanStack
// Table's headless API through createElement. Data lives relationally; the block
// stores only { databaseId, view, groupBy }.

const TYPES = ['text', 'number', 'select', 'multiselect', 'date', 'checkbox', 'url'] as const

type Column = { id: string; name: string; type: string; options?: string[] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = { id: string; values: Record<string, any> }
type DbData = { id: string; name: string; columns: Column[]; rows: Row[] }

type Props = {
  databaseId: string
  view?: string
  groupBy?: string
  onView?: (view: string, groupBy: string) => void
}

// crypto.randomUUID needs a secure context (fails over http on a LAN IP), so use a plain id.
function cid() {
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

export default function DatabaseTableView({ databaseId, view, groupBy, onView }: Props) {
  const [db, setDb] = useState<DbData | null>(null)
  const [mode, setMode] = useState<string>(view === 'kanban' ? 'kanban' : 'table')
  const [groupCol, setGroupCol] = useState<string>(groupBy || '')
  const [overLane, setOverLane] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    api('/api/databases/' + databaseId)
      .then((d) => alive && setDb(d))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [databaseId])

  if (!db) return h('div', { className: 'nb-db-loading' }, 'Loading table…')
  const columns = db.columns || []
  const rows = db.rows || []
  const selectCols = columns.filter((c) => c.type === 'select')

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
  const addColumn = () =>
    saveColumns([...columns, { id: cid(), name: 'Column ' + (columns.length + 1), type: 'text' }])
  const patchColumn = (id: string, patch: Partial<Column>) =>
    saveColumns(columns.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  const deleteColumn = (id: string) => saveColumns(columns.filter((c) => c.id !== id))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addRow = async (preset: Record<string, any> = {}) => {
    const row = await api('/api/databases/' + databaseId + '/rows', 'POST', { values: preset })
    if (row) setDb((p) => (p ? { ...p, rows: [...p.rows, row] } : p))
  }
  const deleteRow = (id: string) => {
    setDb((p) => (p ? { ...p, rows: p.rows.filter((r) => r.id !== id) } : p))
    api('/api/databases/' + databaseId + '/rows/' + id, 'DELETE').catch(() => {})
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

  function cell(row: Row, col: Column) {
    const v = row.values?.[col.id]
    const onChange = (val: unknown) => updateCell(row.id, col.id, val)
    const base = { className: 'nb-db-input', 'data-col': col.name }
    if (col.type === 'checkbox')
      return h('input', {
        ...base,
        type: 'checkbox',
        checked: !!v,
        onChange: (e: { target: { checked: boolean } }) => onChange(e.target.checked),
      })
    if (col.type === 'select')
      return h(
        'select',
        {
          ...base,
          value: v ?? '',
          onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        },
        h('option', { value: '' }, '—'),
        ...(col.options ?? []).map((o) => h('option', { key: o, value: o }, o)),
      )
    if (col.type === 'date')
      return h('input', {
        ...base,
        type: 'date',
        value: v ?? '',
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      })
    if (col.type === 'multiselect')
      return h('input', {
        ...base,
        type: 'text',
        placeholder: 'a, b, c',
        defaultValue: Array.isArray(v) ? v.join(', ') : '',
        onBlur: (e: { target: { value: string } }) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          ),
      })
    const inputType = col.type === 'number' ? 'number' : col.type === 'url' ? 'url' : 'text'
    return h('input', {
      ...base,
      type: inputType,
      defaultValue: v ?? '',
      onBlur: (e: { target: { value: string } }) =>
        onChange(
          col.type === 'number'
            ? e.target.value === ''
              ? null
              : Number(e.target.value)
            : e.target.value,
        ),
    })
  }

  function header(col: Column) {
    return h(
      'div',
      { className: 'nb-db-th' },
      h('input', {
        className: 'nb-db-colname',
        defaultValue: col.name,
        onBlur: (e: { target: { value: string } }) =>
          patchColumn(col.id, { name: e.target.value.trim() || 'Column' }),
      }),
      h(
        'select',
        {
          className: 'nb-db-coltype',
          value: col.type,
          onChange: (e: { target: { value: string } }) =>
            patchColumn(col.id, {
              type: e.target.value,
              options:
                e.target.value === 'select' || e.target.value === 'multiselect'
                  ? (col.options ?? ['Option 1'])
                  : undefined,
            }),
        },
        ...TYPES.map((t) => h('option', { key: t, value: t }, t)),
      ),
      col.type === 'select' || col.type === 'multiselect'
        ? h('input', {
            className: 'nb-db-coloptions',
            defaultValue: (col.options ?? []).join(', '),
            placeholder: 'options: a, b',
            onBlur: (e: { target: { value: string } }) =>
              patchColumn(col.id, {
                options: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              }),
          })
        : null,
      h(
        'button',
        {
          className: 'nb-db-colx',
          type: 'button',
          title: 'Delete column',
          onClick: () => deleteColumn(col.id),
        },
        '×',
      ),
    )
  }

  // ---- Table view ----
  function tableView() {
    return h(
      'div',
      { className: 'nb-db-scroll' },
      h(
        'table',
        { className: 'nb-db-table' },
        h(
          'thead',
          null,
          h(
            'tr',
            null,
            ...columns.map((c) => h('th', { key: c.id }, header(c))),
            h(
              'th',
              { className: 'nb-db-addcol' },
              h('button', { type: 'button', title: 'Add column', onClick: addColumn }, '+'),
            ),
          ),
        ),
        h(
          'tbody',
          null,
          ...rows.map((r) =>
            h(
              'tr',
              { key: r.id },
              ...columns.map((c) => h('td', { key: c.id }, cell(r, c))),
              h(
                'td',
                { className: 'nb-db-rowx' },
                h(
                  'button',
                  { type: 'button', title: 'Delete row', onClick: () => deleteRow(r.id) },
                  '×',
                ),
              ),
            ),
          ),
        ),
      ),
    )
  }

  // ---- Kanban view ----
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
            ...chips.map(({ c, t }) =>
              h('span', { key: c.id, className: 'nb-kanban-chip', title: c.name }, t),
            ),
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
        className: 'nb-kanban-lane' + (overLane === (value || '__none__') ? ' is-over' : ''),
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
        h('span', { className: 'nb-kanban-lane-name' }, label),
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

  // ---- Toolbar ----
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
  )

  return h(
    'div',
    { className: 'nb-db', contentEditable: false },
    toolbar,
    mode === 'kanban' ? kanbanView() : tableView(),
    mode !== 'kanban'
      ? h(
          'button',
          { className: 'nb-db-addrow', type: 'button', onClick: () => addRow() },
          '+ New row',
        )
      : null,
  )
}
