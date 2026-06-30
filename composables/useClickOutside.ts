import type { Ref } from 'vue'

/** Calls handler when a click lands outside the referenced element. */
export function onClickOutside(elRef: Ref<HTMLElement | null | undefined>, handler: () => void) {
  if (import.meta.server) return
  const listener = (e: MouseEvent) => {
    const el = elRef.value
    if (el && e.target instanceof Node && !el.contains(e.target)) handler()
  }
  onMounted(() => document.addEventListener('click', listener, true))
  onBeforeUnmount(() => document.removeEventListener('click', listener, true))
}
