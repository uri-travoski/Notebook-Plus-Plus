<script setup lang="ts">
import { Search, FileText, PenTool, CornerDownLeft } from 'lucide-vue-next'

type Result = {
  id: string
  title: string
  type: 'page' | 'canvas'
  notebookId: string | null
  notebookName: string | null
  snippet: string | null
}

const { open } = useCommandPalette()
const router = useRouter()
const query = ref('')
const results = ref<Result[]>([])
const activeIndex = ref(0)
const loading = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)

// Group results by notebook while keeping a flat order for keyboard nav.
const groups = computed(() => {
  const map = new Map<string, { label: string; items: { r: Result; i: number }[] }>()
  results.value.forEach((r, i) => {
    const label = r.notebookName ?? 'Drafts'
    if (!map.has(label)) map.set(label, { label, items: [] })
    map.get(label)!.items.push({ r, i })
  })
  return [...map.values()]
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (q) => {
  if (timer) clearTimeout(timer)
  if (!q.trim()) {
    results.value = []
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    try {
      const res = await $fetch<{ results: Result[] }>('/api/search', { params: { q } })
      results.value = res.results
      activeIndex.value = 0
    } finally {
      loading.value = false
    }
  }, 180)
})

watch(open, async (isOpen) => {
  if (isOpen) {
    query.value = ''
    results.value = []
    activeIndex.value = 0
    await nextTick()
    inputEl.value?.focus()
  }
})

function selectActive() {
  const r = results.value[activeIndex.value]
  if (!r) return
  open.value = false
  router.push(`/doc/${r.id}`)
}

function onKeydown(e: KeyboardEvent) {
  // Global toggle.
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    // When text is selected inside the editor, Cmd/Ctrl+K is the "insert link" shortcut —
    // let the editor handle it instead of hijacking the key for search.
    const el = document.activeElement as HTMLElement | null
    const inEditor = !!el?.closest?.('.bn-editor, [contenteditable="true"]')
    const sel = window.getSelection()
    const hasSelection = !!sel && !sel.isCollapsed && sel.toString().length > 0
    if (inEditor && hasSelection) return
    e.preventDefault()
    open.value = !open.value
    return
  }
  if (!open.value) return
  if (e.key === 'Escape') {
    e.preventDefault()
    open.value = false
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, results.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (e.key === 'Enter') {
    e.preventDefault()
    selectActive()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Search notes"
    >
      <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="open = false" />
      <div
        class="relative w-full max-w-xl overflow-hidden rounded-box border border-border bg-surface shadow-2xl"
      >
        <div class="flex items-center gap-2 border-b border-border px-3">
          <Search class="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref="inputEl"
            v-model="query"
            type="text"
            placeholder="Search notes by title or content…"
            class="h-12 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
            aria-label="Search query"
          />
          <kbd
            class="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-muted sm:block"
          >
            Esc
          </kbd>
        </div>

        <div class="max-h-[55vh] overflow-y-auto py-1">
          <p
            v-if="loading && !results.length"
            class="px-4 py-6 text-center text-sm text-text-muted"
          >
            Searching…
          </p>
          <p
            v-else-if="query.trim() && !results.length"
            class="px-4 py-6 text-center text-sm text-text-muted"
          >
            No notes match "{{ query }}".
          </p>
          <p v-else-if="!query.trim()" class="px-4 py-6 text-center text-sm text-text-subtle">
            Type to search your notes.
          </p>

          <div v-for="g in groups" :key="g.label" class="px-1">
            <p
              class="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.05em] text-text-muted"
            >
              {{ g.label }}
            </p>
            <button
              v-for="{ r, i } in g.items"
              :key="r.id"
              type="button"
              class="flex w-full items-center gap-3 rounded-input px-3 py-2 text-left"
              :class="
                i === activeIndex
                  ? 'bg-primary-subtle text-primary-subtle-fg'
                  : 'hover:bg-row-hover'
              "
              @mouseenter="activeIndex = i"
              @click="selectActive"
            >
              <component
                :is="r.type === 'canvas' ? PenTool : FileText"
                class="h-4 w-4 shrink-0 text-text-muted"
              />
              <span class="min-w-0 flex-1">
                <span class="block truncate text-sm font-medium text-heading">{{
                  r.title || 'Untitled'
                }}</span>
                <span v-if="r.snippet" class="block truncate text-xs text-text-muted">{{
                  r.snippet
                }}</span>
              </span>
              <CornerDownLeft
                v-if="i === activeIndex"
                class="h-3.5 w-3.5 shrink-0 text-text-muted"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
