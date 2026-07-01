import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'
import DatabaseTableView from './DatabaseTableView'

// The in-document database block. Stores { databaseId } plus the per-block view
// preference (table | kanban, and which select column to group the board by);
// the grid component reads/writes columns + rows via the API. View prefs live on
// the block (round-tripped through autosave) so no extra DB column is needed.
export const DatabaseTable = createReactBlockSpec(
  {
    type: 'databaseTable',
    propSchema: {
      databaseId: { default: '' },
      view: { default: 'table' },
      groupBy: { default: '' },
    },
    content: 'none',
  },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const databaseId: string = props?.block?.props?.databaseId
      if (!databaseId) return createElement('div', { className: 'nb-db-loading' }, 'Empty table')
      return createElement(DatabaseTableView, {
        databaseId,
        view: props?.block?.props?.view || 'table',
        groupBy: props?.block?.props?.groupBy || '',
        onView: (view: string, groupBy: string) =>
          props.editor.updateBlock(props.block, {
            type: 'databaseTable',
            props: { view, groupBy },
          }),
      })
    },
  },
)
