// Drives the page/canvas chooser (§8). A single chooser lives in the app shell;
// any "new note" entry point calls start(notebookId) to open it.
export function useNewDoc() {
  const open = useState('newdoc-open', () => false)
  const notebookId = useState<string | null>('newdoc-notebook', () => null)

  function start(nb: string) {
    notebookId.value = nb
    open.value = true
  }

  return { open, notebookId, start }
}
