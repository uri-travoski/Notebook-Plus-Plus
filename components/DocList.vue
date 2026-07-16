<script setup lang="ts">
import { FileText, PenTool, Star } from 'lucide-vue-next'

type Doc = {
  id: string
  title: string
  type: 'page' | 'canvas'
  updatedAt: string
  isStarred?: boolean
}
// linkable defaults to true — an absent Boolean prop coerces to false in Vue (see gotchas),
// which would render every row as a non-clickable span.
withDefaults(defineProps<{ docs: Doc[]; linkable?: boolean }>(), { linkable: true })
const emit = defineEmits<{ (e: 'toggle-star', id: string): void }>()

// Click the star to unstar. Track locally-unstarred ids so the star hides immediately even before
// the parent refetches; the tree (sidebar) is updated via updateNote.
const { updateNote } = useTree()
const unstarred = ref(new Set<string>())
async function unstar(id: string) {
  unstarred.value = new Set(unstarred.value).add(id)
  try {
    await updateNote(id, { isStarred: false })
    emit('toggle-star', id)
  } catch {
    const next = new Set(unstarred.value)
    next.delete(id)
    unstarred.value = next
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
</script>

<template>
  <ul class="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
    <li
      v-for="doc in docs"
      :key="doc.id"
      class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-row-hover"
    >
      <component
        :is="doc.type === 'canvas' ? PenTool : FileText"
        class="h-4 w-4 shrink-0 text-text-subtle"
      />
      <NuxtLink
        v-if="linkable !== false"
        :to="`/doc/${doc.id}`"
        class="min-w-0 flex-1 truncate text-sm font-medium text-heading hover:text-primary"
      >
        {{ doc.title || 'Untitled' }}
      </NuxtLink>
      <span v-else class="min-w-0 flex-1 truncate text-sm font-medium text-heading">
        {{ doc.title || 'Untitled' }}
      </span>
      <button
        v-if="doc.isStarred && !unstarred.has(doc.id)"
        type="button"
        class="shrink-0 rounded p-0.5 text-amber-500 transition-colors hover:bg-amber-400/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-400"
        title="Unstar"
        aria-label="Unstar"
        @click="unstar(doc.id)"
      >
        <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
      </button>
      <span class="shrink-0 text-xs text-text-muted">{{ fmt(doc.updatedAt) }}</span>
      <div class="shrink-0">
        <slot name="actions" :doc="doc" />
      </div>
    </li>
  </ul>
</template>
