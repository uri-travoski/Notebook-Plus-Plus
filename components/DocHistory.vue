<script setup lang="ts">
import { History } from 'lucide-vue-next'

const props = defineProps<{ documentId: string }>()
const open = defineModel<boolean>('open', { default: false })

type Version = { id: string; title: string | null; createdAt: string }
const versions = ref<Version[]>([])
const loading = ref(false)
const restoring = ref<string | null>(null)

watch(open, async (isOpen) => {
  if (!isOpen) return
  loading.value = true
  try {
    versions.value = await $fetch<Version[]>(`/api/documents/${props.documentId}/versions`)
  } finally {
    loading.value = false
  }
})

function fmt(ts: string) {
  const d = new Date(ts)
  const m = Math.round((Date.now() - d.getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} h ago`
  return d.toLocaleString()
}

async function restore(v: Version) {
  restoring.value = v.id
  try {
    await $fetch(`/api/documents/${props.documentId}/versions/${v.id}/restore`, { method: 'POST' })
    window.location.reload() // re-fetch the doc so the editor shows the restored content
  } finally {
    restoring.value = null
  }
}
</script>

<template>
  <UiModal v-model:open="open">
    <div class="mb-1 flex items-center gap-2">
      <History class="h-5 w-5 text-text-muted" />
      <h2 class="text-base font-semibold text-heading">Version history</h2>
    </div>
    <p class="mb-4 text-sm text-text-muted">
      Restore a previous version of this note. Restoring saves the current version first, so it can
      be undone.
    </p>

    <p v-if="loading" class="py-6 text-center text-sm text-text-muted">Loading…</p>
    <EmptyState
      v-else-if="!versions.length"
      title="No history yet"
      hint="Snapshots are saved automatically as you edit."
    />
    <ul
      v-else
      class="max-h-[50vh] divide-y divide-border overflow-y-auto rounded-input border border-border"
    >
      <li v-for="v in versions" :key="v.id" class="flex items-center gap-3 p-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-heading">{{ v.title || 'Untitled' }}</p>
          <p class="text-xs text-text-muted">{{ fmt(v.createdAt) }}</p>
        </div>
        <UiButton variant="subtle" :loading="restoring === v.id" @click="restore(v)">
          Restore
        </UiButton>
      </li>
    </ul>
  </UiModal>
</template>
