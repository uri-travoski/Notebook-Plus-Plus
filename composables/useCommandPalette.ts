// Shared open-state for the Cmd/Ctrl-K command palette.
export function useCommandPalette() {
  const open = useState('cmdk-open', () => false)
  return { open }
}
