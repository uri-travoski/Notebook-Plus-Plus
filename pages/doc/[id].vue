<script setup lang="ts">
import { Download, History, Star, Info } from 'lucide-vue-next'
const route = useRoute()
const id = computed(() => String(route.params.id))

const { prefs, ensure: ensurePrefs } = usePreferences()
const { setNoteTitle, updateNote } = useTree()
onMounted(ensurePrefs)
const wide = computed(() => prefs.value.editorWidth === 'wide')
const { data: doc, error } = await useFetch<DocDetail>(`/api/documents/${id.value}`)
useHead({ title: () => `${doc.value?.title || 'Untitled'} · Notebook++` })

const title = ref(doc.value?.title ?? 'Untitled')
// Starred toggle — reflects doc.isStarred; clicking persists + updates the sidebar/Starred view.
const starred = ref(!!doc.value?.isStarred)
watch(doc, (d) => {
  if (d) {
    title.value = d.title
    starred.value = !!d.isStarred
  }
})
async function toggleStar() {
  starred.value = !starred.value
  try {
    await updateNote(id.value, { isStarred: starred.value })
  } catch {
    starred.value = !starred.value // revert on failure
  }
}

// Page outline (headings) — live content drives it; persisted on a debounce.
type Block = { type?: string; props?: { level?: number }; content?: unknown }
const liveContent = ref<Block[]>(
  Array.isArray(doc.value?.content) ? (doc.value!.content as Block[]) : [],
)
watch(doc, (d) => {
  if (d?.type === 'page' && Array.isArray(d.content)) liveContent.value = d.content as Block[]
})
function inlineText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content))
    return content.map((c) => (c as { text?: string })?.text ?? '').join('')
  return ''
}
const outline = computed(() => {
  const headings: { level: number; text: string }[] = []
  for (const block of liveContent.value) {
    if (block?.type === 'heading') {
      headings.push({
        level: block.props?.level ?? 1,
        text: inlineText(block.content) || 'Untitled heading',
      })
    }
  }
  return headings
})
function scrollToHeading(index: number) {
  const els = document.querySelectorAll(
    '.bn-editor h1, .bn-editor h2, .bn-editor h3, .bn-editor h4, .bn-editor h5, .bn-editor h6',
  )
  els[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const saving = ref(false)
let contentTimer: ReturnType<typeof setTimeout> | undefined
let titleTimer: ReturnType<typeof setTimeout> | undefined

async function patch(body: Record<string, unknown>) {
  saving.value = true
  try {
    await $fetch(`/api/documents/${id.value}`, { method: 'PATCH', body })
  } finally {
    saving.value = false
  }
}
function onContentChange(content: unknown[]) {
  liveContent.value = content as Block[]
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(() => {
    contentTimer = undefined
    patch({ content })
  }, 1500)
}
function onCanvasChange(scene: unknown) {
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(() => patch({ content: scene }), 1500)
}
function onTitleInput() {
  // Live-sync the sidebar name as the title is typed; persist on a debounce.
  setNoteTitle(id.value, title.value.trim() || 'Untitled')
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(() => patch({ title: title.value.trim() || 'Untitled' }), 800)
}
function exportMarkdown() {
  const a = document.createElement('a')
  a.href = `/api/documents/${id.value}/markdown`
  a.download = `${title.value.trim() || 'untitled'}.md`
  document.body.appendChild(a)
  a.click()
  a.remove()
}

const historyOpen = ref(false)
function fmtDateTime(s?: string) {
  return s ? new Date(s).toLocaleString() : '—'
}
onBeforeUnmount(() => {
  if (contentTimer) clearTimeout(contentTimer)
  if (titleTimer) clearTimeout(titleTimer)
})
</script>

<template>
  <div v-if="error" class="mx-auto max-w-3xl px-6 py-10">
    <EmptyState title="Note not found" hint="It may have been deleted or moved to Trash." />
  </div>

  <!-- Canvas: full-page Excalidraw -->
  <div v-else-if="doc?.type === 'canvas'" class="flex h-full flex-col">
    <div class="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface px-6">
      <input
        v-model="title"
        class="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-primary outline-none placeholder:text-text-subtle"
        placeholder="Untitled canvas"
        aria-label="Canvas title"
        @input="onTitleInput"
      />
      <span
        class="text-xs text-text-muted transition-opacity"
        :class="saving ? 'opacity-100' : 'opacity-0'"
      >
        Saving…
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          starred
            ? 'text-amber-500 hover:bg-surface-subtle'
            : 'text-text-muted hover:bg-surface-subtle hover:text-heading'
        "
        :title="starred ? 'Starred — click to unstar' : 'Star this document'"
        :aria-pressed="starred"
        @click="toggleStar"
      >
        <Star class="h-3.5 w-3.5" :class="starred ? 'fill-amber-400 text-amber-500' : ''" />
        {{ starred ? 'Starred' : 'Star' }}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Version history"
        @click="historyOpen = true"
      >
        <History class="h-3.5 w-3.5" />
        History
      </button>
      <UiDropdown
        label="File info"
        trigger-class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <template #trigger>
          <Info class="h-3.5 w-3.5" />
          Info
        </template>
        <div class="w-60 px-3 py-2">
          <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            File info
          </p>
          <dl class="space-y-1 text-xs">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Type</dt>
              <dd class="capitalize text-heading">{{ doc?.type }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Created</dt>
              <dd class="text-heading">{{ fmtDateTime(doc?.createdAt) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Updated</dt>
              <dd class="text-heading">{{ fmtDateTime(doc?.updatedAt) }}</dd>
            </div>
          </dl>
        </div>
      </UiDropdown>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Export as Markdown"
        @click="exportMarkdown"
      >
        <Download class="h-3.5 w-3.5" />
        Export
      </button>
    </div>
    <div class="min-h-0 flex-1">
      <ClientOnly>
        <CanvasIsland :initial-scene="doc.content" @change="onCanvasChange" />
        <template #fallback>
          <div class="grid h-full place-items-center text-sm text-text-muted">Loading canvas…</div>
        </template>
      </ClientOnly>
    </div>
    <DocHistory v-model:open="historyOpen" :document-id="id" />
  </div>

  <!-- Page: canvas-style top bar (title + actions in one row), then reading column + outline -->
  <div v-else class="flex h-full flex-col">
    <div
      class="flex h-14 shrink-0 items-center gap-3 border-b border-border/50 bg-[#f5f9ffc2] px-6"
    >
      <input
        v-model="title"
        class="min-w-0 flex-1 border-0 bg-transparent text-lg font-bold text-primary outline-none placeholder:text-text-subtle"
        placeholder="Untitled"
        aria-label="Note title"
        @input="onTitleInput"
      />
      <span
        class="text-xs text-text-muted transition-opacity"
        :class="saving ? 'opacity-100' : 'opacity-0'"
      >
        Saving…
      </span>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="
          starred
            ? 'text-amber-500 hover:bg-surface-subtle'
            : 'text-text-muted hover:bg-surface-subtle hover:text-heading'
        "
        :title="starred ? 'Starred — click to unstar' : 'Star this document'"
        :aria-pressed="starred"
        @click="toggleStar"
      >
        <Star class="h-3.5 w-3.5" :class="starred ? 'fill-amber-400 text-amber-500' : ''" />
        {{ starred ? 'Starred' : 'Star' }}
      </button>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Version history"
        @click="historyOpen = true"
      >
        <History class="h-3.5 w-3.5" />
        History
      </button>
      <UiDropdown
        label="File info"
        trigger-class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <template #trigger>
          <Info class="h-3.5 w-3.5" />
          Info
        </template>
        <div class="w-60 px-3 py-2">
          <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">
            File info
          </p>
          <dl class="space-y-1 text-xs">
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Type</dt>
              <dd class="capitalize text-heading">{{ doc?.type }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Created</dt>
              <dd class="text-heading">{{ fmtDateTime(doc?.createdAt) }}</dd>
            </div>
            <div class="flex justify-between gap-4">
              <dt class="text-text-muted">Updated</dt>
              <dd class="text-heading">{{ fmtDateTime(doc?.updatedAt) }}</dd>
            </div>
          </dl>
        </div>
      </UiDropdown>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-input px-2 py-1 text-[0.8rem] text-text-muted transition-colors hover:bg-surface-subtle hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        title="Export as Markdown"
        @click="exportMarkdown"
      >
        <Download class="h-3.5 w-3.5" />
        Export
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <div
        class="relative mx-auto flex w-full gap-10 px-6 pb-10 pt-0"
        :class="wide ? 'max-w-[1240px]' : 'max-w-[1080px]'"
      >
        <div
          class="mx-auto w-full min-w-0 flex-1"
          :class="wide ? 'max-w-[920px]' : 'max-w-[760px]'"
        >
          <ClientOnly>
            <EditorIsland
              :document-id="id"
              :initial-content="liveContent as unknown[]"
              @change="onContentChange"
            />
            <template #fallback>
              <div class="space-y-3" aria-hidden="true">
                <div class="h-4 w-2/3 animate-pulse rounded bg-surface-subtle" />
                <div class="h-4 w-1/2 animate-pulse rounded bg-surface-subtle" />
                <div class="h-4 w-3/5 animate-pulse rounded bg-surface-subtle" />
              </div>
            </template>
          </ClientOnly>
        </div>

        <aside
          v-if="outline.length"
          class="sticky top-10 hidden h-fit w-48 shrink-0 xl:block"
          aria-label="Outline"
        >
          <p class="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-text-muted">
            On this page
          </p>
          <ul class="space-y-0.5 border-l border-border">
            <li v-for="(h, i) in outline" :key="i">
              <button
                type="button"
                class="block w-full truncate py-0.5 text-left text-sm text-text-muted transition-colors hover:text-primary"
                :style="{ paddingLeft: `${(h.level - 1) * 10 + 12}px` }"
                @click="scrollToHeading(i)"
              >
                {{ h.text }}
              </button>
            </li>
          </ul>
        </aside>
      </div>
    </div>

    <DocHistory v-model:open="historyOpen" :document-id="id" />
  </div>
</template>
