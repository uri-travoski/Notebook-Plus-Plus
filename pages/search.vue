<script setup lang="ts">
import { Search, FileText, PenTool } from 'lucide-vue-next'
useHead({ title: 'Search · Notebook++' })

type Result = {
  id: string
  title: string
  type: 'page' | 'canvas'
  notebookId: string | null
  notebookName: string | null
  snippet: string | null
}

const query = ref('')
const results = ref<Result[]>([])
const loading = ref(false)
const searched = ref(false)
const inputEl = ref<HTMLInputElement | null>(null)
// Autofocus on mount (client-only). Not `v-focus`: that directive is client-only and would
// crash SSR (getSSRProps on undefined) since this input is always rendered.
onMounted(() => inputEl.value?.focus())

// Group hits by notebook (unfiled -> Drafts), same as the Cmd-K palette.
const groups = computed(() => {
  const map = new Map<string, Result[]>()
  for (const r of results.value) {
    const label = r.notebookName ?? 'Drafts'
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(r)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})
const noMatchHint = computed(() => `No notes match “${query.value.trim()}”.`)

let timer: ReturnType<typeof setTimeout> | undefined
watch(query, (q) => {
  if (timer) clearTimeout(timer)
  if (!q.trim()) {
    results.value = []
    searched.value = false
    return
  }
  loading.value = true
  timer = setTimeout(async () => {
    try {
      const res = await $fetch<{ results: Result[] }>('/api/search', { params: { q } })
      results.value = res.results
      searched.value = true
    } finally {
      loading.value = false
    }
  }, 180)
})
onBeforeUnmount(() => timer && clearTimeout(timer))
</script>

<template>
  <AppPage title="Search" subtitle="Find notes by title or content.">
    <div
      class="mb-6 flex items-center gap-2 rounded-input border border-border bg-surface px-3 focus-within:border-primary"
    >
      <Search class="h-4 w-4 shrink-0 text-text-muted" />
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        placeholder="Search notes by title or content…"
        class="h-11 w-full bg-transparent text-sm text-text outline-none placeholder:text-text-subtle"
        aria-label="Search query"
      />
    </div>

    <p v-if="loading && !results.length" class="py-6 text-center text-sm text-text-muted">
      Searching…
    </p>
    <EmptyState v-else-if="searched && !results.length" title="No matches" :hint="noMatchHint" />
    <p v-else-if="!searched" class="py-6 text-center text-sm text-text-subtle">
      Type above to search your notes.
    </p>

    <div v-for="g in groups" :key="g.label" class="mb-4">
      <p class="mb-1 px-1 text-xs font-semibold uppercase tracking-[0.05em] text-text-muted">
        {{ g.label }}
      </p>
      <ul class="space-y-0.5">
        <li v-for="r in g.items" :key="r.id">
          <NuxtLink
            :to="`/doc/${r.id}`"
            class="flex items-center gap-3 rounded-input px-3 py-2 hover:bg-row-hover"
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
          </NuxtLink>
        </li>
      </ul>
    </div>
  </AppPage>
</template>
