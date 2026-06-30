import { createReactBlockSpec } from '@blocknote/react'
import { createElement } from 'react'
import DatabaseTableView from './DatabaseTableView'

// The in-document database block. Stores only { databaseId }; the grid component
// reads/writes columns + rows via the API.
export const DatabaseTable = createReactBlockSpec(
  { type: 'databaseTable', propSchema: { databaseId: { default: '' } }, content: 'none' },
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    render: (props: any) => {
      const databaseId: string = props?.block?.props?.databaseId
      if (!databaseId) return createElement('div', { className: 'nb-db-loading' }, 'Empty table')
      return createElement(DatabaseTableView, { databaseId })
    },
  },
)
