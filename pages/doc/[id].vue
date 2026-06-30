<script setup lang="ts">
const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: doc, error } = await useFetch(`/api/documents/${id.value}`)
useHead({ title: () => `${doc.value?.title || 'Untitled'} · Notebook++` })

const title = ref(doc.value?.title ?? 'Untitled')
watch(doc, (d) => {
  if (d) title.value = d.title
})

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
  if (contentTimer) clearTimeout(contentTimer)
  contentTimer = setTimeout(() => patch({ content }), 1500)
}
function onTitleInput() {
  if (titleTimer) clearTimeout(titleTimer)
  titleTimer = setTimeout(() => patch({ title: title.value.trim() || 'Untitled' }), 800)
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
  <div v-else class="mx-auto w-full max-w-[760px] px-6 py-10">
    <div class="mb-1 flex h-4 items-center justify-end">
      <span
        class="text-xs text-text-muted transition-opacity"
        :class="saving ? 'opacity-100' : 'opacity-0'"
      >
        Saving…
      </span>
    </div>

    <input
      v-model="title"
      class="mb-4 w-full border-0 bg-transparent text-[32px] font-bold leading-tight text-heading outline-none placeholder:text-text-subtle"
      placeholder="Untitled"
      aria-label="Note title"
      @input="onTitleInput"
    />

    <ClientOnly>
      <EditorIsland
        v-if="doc?.type === 'page'"
        :initial-content="doc.content as unknown[]"
        @change="onContentChange"
      />
      <div
        v-else
        class="rounded-card border border-dashed border-border bg-surface-subtle px-6 py-12 text-center text-sm text-text-muted"
      >
        The canvas editor arrives in a later phase. This canvas note is saved.
      </div>

      <template #fallback>
        <div class="space-y-3" aria-hidden="true">
          <div class="h-4 w-2/3 animate-pulse rounded bg-surface-subtle" />
          <div class="h-4 w-1/2 animate-pulse rounded bg-surface-subtle" />
          <div class="h-4 w-3/5 animate-pulse rounded bg-surface-subtle" />
        </div>
      </template>
    </ClientOnly>
  </div>
</template>
